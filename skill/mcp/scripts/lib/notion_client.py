# -*- coding: utf-8 -*-
"""Notion 写入统一客户端（直连 REST API）

解决三大顽疾：
  1. callout / table 被吞——一律用强类型 block（callout/table block），不再依赖 <callout>/<table> markdown 标签
  2. 网络抖动整页崩溃——所有请求带 retry + 指数退避
  3. 半写入脏数据——写入前先幂等清空目标页 children；写后回读校验 block 数

rich_text 支持将 Markdown **加粗** 转为 annotations.bold（与钉钉 section1 共用文案时不再露出字面 *）。
"""
import re
import sys
import time
import uuid
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
import qa_config  # noqa: E402

API_BASE = "https://api.notion.com/v1"
MAX_RETRY = 4
RETRY_BACKOFF = [1, 3, 6, 10]  # 秒
MAX_RICH_TEXT_LEN = 2000  # Notion 单段 rich_text.content 上限
_BOLD_PATTERN = re.compile(r"\*\*(.+?)\*\*")


class NotionError(Exception):
    pass


def normalize_page_id(page_id):
    """Notion API 要求标准 UUID（含连字符）；兼容无连字符的 URL/配置写法。"""
    if not page_id:
        raise NotionError("page_id 不能为空")
    s = str(page_id).strip().replace("-", "")
    try:
        return str(uuid.UUID(s))
    except ValueError as e:
        raise NotionError(f"无效的 page_id: {page_id}") from e


class NotionClient:
    def __init__(self, token=None, version=None):
        self.token = token or qa_config.get_notion_token()
        if not self.token:
            raise NotionError("未取得 Notion token（设置 NOTION_TOKEN 或 mcp.json）")
        self.version = version or qa_config.get_notion_version()
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Notion-Version": self.version,
        })

    def _request(self, method, path, body=None):
        url = f"{API_BASE}/{path}"
        last_err = None
        for attempt in range(MAX_RETRY):
            try:
                resp = self.session.request(method, url, json=body, timeout=30)
                if resp.status_code in (429, 500, 502, 503, 504):
                    wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
                    time.sleep(wait)
                    last_err = f"{resp.status_code}: {resp.text[:200]}"
                    continue
                data = resp.json()
                if resp.status_code >= 400:
                    raise NotionError(f"{resp.status_code}: {data.get('message', resp.text[:200])}")
                return data
            except (requests.ConnectionError, requests.Timeout) as e:
                last_err = str(e)
                wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
                time.sleep(wait)
        raise NotionError(f"请求失败（重试 {MAX_RETRY} 次）: {method} {path} -> {last_err}")

    @staticmethod
    def assert_not_template(page_id):
        tpl = normalize_page_id(qa_config.NOTION_TEMPLATE_PAGE_ID)
        if normalize_page_id(page_id) == tpl:
            raise NotionError("禁止写入样板页（templatePageId）")

    def get_page(self, page_id):
        page_id = normalize_page_id(page_id)
        return self._request("GET", f"pages/{page_id}")

    def assert_page_under_parent(self, page_id, expected_parent_id):
        """覆盖写前校验：目标页必须挂在期望汇总页下，禁止挂在测试方案页等错误父级。"""
        page_id = normalize_page_id(page_id)
        expected = normalize_page_id(expected_parent_id)
        data = self.get_page(page_id)
        parent = data.get("parent") or {}
        if parent.get("type") != "page_id":
            raise NotionError(
                f"页面 {page_id} 的父级不是 page（type={parent.get('type')}）。"
                "请在汇总页下新建子页面，不要传 --notion-page-id 覆盖"
            )
        actual = normalize_page_id(parent["page_id"])
        material = normalize_page_id(qa_config.NOTION_MATERIAL_GUARD_PAGE_ID)
        if actual == material:
            raise NotionError(
                "禁止覆盖测试方案页（materialPageId）下的报告。"
                "请去掉 --notion-page-id，在 defaultParentPageId 汇总页下新建子页面"
            )
        if actual != expected:
            raise NotionError(
                f"页面父级 {actual} ≠ 期望汇总页 {expected}。"
                "请去掉 --notion-page-id 重新新建，或确认 --notion-parent 正确"
            )

    def create_page(self, parent_page_id, title):
        parent_page_id = normalize_page_id(parent_page_id)
        self.assert_not_template(parent_page_id)
        body = {
            "parent": {"page_id": parent_page_id},
            "properties": {"title": {"title": [{"text": {"content": title}}]}},
        }
        data = self._request("POST", "pages", body)
        return data["id"], data.get("url", "")

    def clear_page(self, page_id):
        """幂等清空目标页所有 children，避免重跑导致内容翻倍。"""
        page_id = normalize_page_id(page_id)
        deleted = 0
        while True:
            data = self._request("GET", f"blocks/{page_id}/children?page_size=100")
            results = data.get("results", [])
            if not results:
                break
            for blk in results:
                try:
                    self._request("DELETE", f"blocks/{blk['id']}")
                    deleted += 1
                except NotionError:
                    pass
            if not data.get("has_more"):
                break
        return deleted

    def append_blocks(self, page_id, blocks, batch_size=20):
        """分批追加（逐批落地 + 自动重试），避免单次大 payload 失败。"""
        page_id = normalize_page_id(page_id)
        total = 0
        for i in range(0, len(blocks), batch_size):
            batch = blocks[i:i + batch_size]
            self._request("PATCH", f"blocks/{page_id}/children", {"children": batch})
            total += len(batch)
        return total

    def count_blocks(self, page_id):
        """回读校验：返回页面顶层 block 数。"""
        page_id = normalize_page_id(page_id)
        count = 0
        cursor = None
        while True:
            path = f"blocks/{page_id}/children?page_size=100"
            if cursor:
                path += f"&start_cursor={cursor}"
            data = self._request("GET", path)
            count += len(data.get("results", []))
            if not data.get("has_more"):
                break
            cursor = data.get("next_cursor")
        return count


# ============ 强类型 block builders ============
def _text_segment(content, bold=False):
    """单个 rich_text 片段；超长按 Notion 限制切块。"""
    segments = []
    s = str(content) if content is not None else ""
    while s:
        chunk = s[:MAX_RICH_TEXT_LEN]
        s = s[MAX_RICH_TEXT_LEN:]
        item = {"type": "text", "text": {"content": chunk}}
        if bold:
            item["annotations"] = {"bold": True}
        segments.append(item)
    if not segments:
        segments.append({"type": "text", "text": {"content": ""}})
    return segments


def rich_text_from_markdown(text):
    """将 **加粗** 转为 Notion rich_text（仅处理双星号加粗，其余原样保留）。"""
    if text is None:
        return _text_segment("")
    s = str(text)
    if "**" not in s:
        return _text_segment(s)

    parts = []
    pos = 0
    for m in _BOLD_PATTERN.finditer(s):
        if m.start() > pos:
            parts.extend(_text_segment(s[pos:m.start()], bold=False))
        parts.extend(_text_segment(m.group(1), bold=True))
        pos = m.end()
    if pos < len(s):
        parts.extend(_text_segment(s[pos:], bold=False))
    return parts or _text_segment(s)


def _rt(text):
    return rich_text_from_markdown(text)


def heading2(text):
    return {"object": "block", "type": "heading_2", "heading_2": {"rich_text": _rt(text)}}


def heading3(text):
    return {"object": "block", "type": "heading_3", "heading_3": {"rich_text": _rt(text)}}


def toggle(text, children=None):
    """可折叠块（用于附录：解析详情 / 冲突 / 阈值等长内容）。

    children: list[block]，作为 toggle 内部子块（Notion 限制：附加在创建时即写入）。
    """
    body = {"rich_text": _rt(text)}
    if children:
        body["children"] = children
    return {"object": "block", "type": "toggle", "toggle": body}


def paragraph(text):
    return {"object": "block", "type": "paragraph", "paragraph": {"rich_text": _rt(text)}}


def bullet(text):
    return {"object": "block", "type": "bulleted_list_item", "bulleted_list_item": {"rich_text": _rt(text)}}


def numbered(text):
    return {"object": "block", "type": "numbered_list_item", "numbered_list_item": {"rich_text": _rt(text)}}


def divider():
    return {"object": "block", "type": "divider", "divider": {}}


def quote(text):
    return {"object": "block", "type": "quote", "quote": {"rich_text": _rt(text)}}


def callout(text, emoji="📝", color="gray_background"):
    return {"object": "block", "type": "callout", "callout": {
        "rich_text": _rt(text), "icon": {"emoji": emoji}, "color": color}}


def table(header, rows):
    """header: list[str]；rows: list[list[str]]。生成 Notion 原生 table block（不会被吞）。"""
    width = len(header)

    def row_block(cells):
        padded = (list(cells) + [""] * width)[:width]
        return {"type": "table_row", "table_row": {"cells": [_rt(str(c)) for c in padded]}}

    children = [row_block(header)] + [row_block(r) for r in rows]
    return {"object": "block", "type": "table", "table": {
        "table_width": width, "has_column_header": True, "has_row_header": False,
        "children": children}}
