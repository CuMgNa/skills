# -*- coding: utf-8 -*-
"""Notion 写入统一客户端（直连 REST API）

解决三大顽疾：
  1. callout / table 被吞——一律用强类型 block（callout/table block），不再依赖 <callout>/<table> markdown 标签
  2. 网络抖动整页崩溃——所有请求带 retry + 指数退避
  3. 半写入脏数据——写入前先幂等清空目标页 children；写后回读校验 block 数

仅依赖 requests。配置从 lib/qa_config.py 读取（环境变量优先）。
"""
import sys
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
import qa_config  # noqa: E402

API_BASE = "https://api.notion.com/v1"
MAX_RETRY = 4
RETRY_BACKOFF = [1, 3, 6, 10]  # 秒


class NotionError(Exception):
    pass


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
        tpl = qa_config.NOTION_TEMPLATE_PAGE_ID.replace("-", "")
        if page_id.replace("-", "") == tpl:
            raise NotionError("禁止写入样板页（templatePageId）")

    def create_page(self, parent_page_id, title):
        self.assert_not_template(parent_page_id)
        body = {
            "parent": {"page_id": parent_page_id},
            "properties": {"title": {"title": [{"text": {"content": title}}]}},
        }
        data = self._request("POST", "pages", body)
        return data["id"], data.get("url", "")

    def clear_page(self, page_id):
        """幂等清空目标页所有 children，避免重跑导致内容翻倍。"""
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
        total = 0
        for i in range(0, len(blocks), batch_size):
            batch = blocks[i:i + batch_size]
            self._request("PATCH", f"blocks/{page_id}/children", {"children": batch})
            total += len(batch)
        return total

    def count_blocks(self, page_id):
        """回读校验：返回页面顶层 block 数。"""
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
def _rt(text):
    return [{"type": "text", "text": {"content": text}}]


def heading2(text):
    return {"object": "block", "type": "heading_2", "heading_2": {"rich_text": _rt(text)}}


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
