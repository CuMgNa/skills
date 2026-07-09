# -*- coding: utf-8 -*-
"""统一配置读取：优先环境变量，回退 ~/.cursor/mcp.json，最后回退内置默认值。

所有钉钉 / Notion / 禅道脚本共用本模块，避免机密四处明文复制、签名实现各写一遍。
"""
import json
import os
from pathlib import Path

# 内置默认值仅为保持历史脚本可用性；生产环境应通过环境变量覆盖。
_DEFAULT_DINGTALK_ACCESS_TOKEN = "6bf732946c8873abc98b35d2d82deb6e987a4cd687076549e0d79cddf3a3dbc2"
_DEFAULT_DINGTALK_SECRET = "SEC2fa2956f6facd9270222bb93eb76460f3d564f72c4671528ea7cd14b2c7de888"
_DEFAULT_AT_MOBILE = "13250703582"  # lunu

_mcp_cache = None


def _load_mcp_json():
    """读取 ~/.cursor/mcp.json（带缓存）。失败返回空 dict。"""
    global _mcp_cache
    if _mcp_cache is not None:
        return _mcp_cache
    candidates = [
        os.environ.get("CURSOR_MCP_JSON"),
        str(Path(os.environ.get("USERPROFILE") or os.environ.get("HOME") or "") / ".cursor" / "mcp.json"),
    ]
    for p in candidates:
        if not p:
            continue
        try:
            with open(p, encoding="utf-8") as f:
                _mcp_cache = json.load(f)
                return _mcp_cache
        except Exception:
            continue
    _mcp_cache = {}
    return _mcp_cache


def get_dingtalk_webhook():
    """返回 (access_token, secret)。环境变量优先。"""
    token = os.environ.get("DINGTALK_ACCESS_TOKEN") or _DEFAULT_DINGTALK_ACCESS_TOKEN
    secret = os.environ.get("DINGTALK_SECRET") or _DEFAULT_DINGTALK_SECRET
    return token, secret


def get_at_mobiles():
    """返回需要 @ 的手机号列表。环境变量 DINGTALK_AT_MOBILES 逗号分隔覆盖。"""
    env = os.environ.get("DINGTALK_AT_MOBILES")
    if env:
        return [m.strip() for m in env.split(",") if m.strip()]
    return [_DEFAULT_AT_MOBILE]


def get_dingtalk_doc_mcp_url():
    """返回钉钉文档 MCP 的 streamable-http url（含 key）。"""
    env = os.environ.get("DINGTALK_DOC_MCP_URL")
    if env:
        return env
    cfg = _load_mcp_json()
    servers = cfg.get("mcpServers", {})
    for name in ("钉钉文档", "dingtalk-doc", "钉钉Teambition 项目管理"):
        node = servers.get(name)
        if node and node.get("url"):
            return node["url"]
    return None


def get_notion_token():
    """返回 Notion integration token。环境变量 NOTION_TOKEN 优先，回退 mcp.json。"""
    env = os.environ.get("NOTION_TOKEN")
    if env:
        return env
    cfg = _load_mcp_json()
    node = cfg.get("mcpServers", {}).get("notion", {})
    headers_raw = node.get("env", {}).get("OPENAPI_MCP_HEADERS")
    if headers_raw:
        try:
            headers = json.loads(headers_raw)
            auth = headers.get("Authorization", "")
            if auth.lower().startswith("bearer "):
                return auth[7:].strip()
            return auth.strip() or None
        except Exception:
            pass
    return None


def get_notion_version():
    return os.environ.get("NOTION_VERSION") or "2022-06-28"


# Notion 固定配置（来自 qa-agent-report-publish SKILL）
NOTION_DEFAULT_PARENT_PAGE_ID = "36c5667c-6d3a-80d5-93bc-f38311cf751d"  # 测试报告汇总页
NOTION_TEMPLATE_PAGE_ID = "c1b23699-3b3b-4b06-b2ac-0ec9ede194b6"       # 样板页，禁止写入
NOTION_MATERIAL_GUARD_PAGE_ID = "3585667c-6d3a-807b-8757-d831c8cd84cd"  # SaaS1期测试方案，仅用于 notion_client 禁写保护断言，禁止当 --material-auto 默认值


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    tok, sec = get_dingtalk_webhook()
    print("dingtalk token:", (tok[:12] + "...") if tok else None)
    print("dingtalk secret:", (sec[:12] + "...") if sec else None)
    print("at mobiles:", get_at_mobiles())
    print("dingtalk doc mcp url:", "configured" if get_dingtalk_doc_mcp_url() else None)
    nt = get_notion_token()
    print("notion token:", (nt[:12] + "...") if nt else None)
