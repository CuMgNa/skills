# -*- coding: utf-8 -*-
"""直接调用钉钉文档 MCP streamable-http 端点创建文档并推送机器人消息。"""
import json
import sys
import time
import base64
import hashlib
import hmac
import re as regex_module
import requests
from pathlib import Path
from urllib.parse import urlencode

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

DINGTALK_DOC_MCP_URL = "https://mcp-gw.dingtalk.com/server/67e5157bd2b907155c6cf50cf3284f1a5da4f0511f656f6efc1c3c4495991d8a?key=f0c41b34b8875f82ef55757cbbe2abc2"
WEBHOOK_ACCESS_TOKEN = "6bf732946c8873abc98b35d2d82deb6e987a4cd687076549e0d79cddf3a3dbc2"
WEBHOOK_SECRET = "SEC2fa2956f6facd9270222bb93eb76460f3d564f72c4671528ea7cd14b2c7de888"
AT_MOBILE = "13250703582"
WEBHOOK_BASE = "https://oapi.dingtalk.com/robot/send"
MCP_SESSION_ID = "push-" + str(int(time.time() * 1000))
FOLDER_ID = "4lgGw3P8vRrjRBkPIpYeXAMN85daZ90D"  # 测试报告文件夹


def mcp_call(method_name, arguments):
    """调用钉钉文档 MCP 工具，返回解析后的 content.text JSON。"""
    payload = {
        "jsonrpc": "2.0",
        "id": MCP_SESSION_ID,
        "method": "tools/call",
        "params": {"name": method_name, "arguments": arguments},
    }
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    resp = requests.post(DINGTALK_DOC_MCP_URL, json=payload, headers=headers, timeout=60)
    data = resp.json()
    result = data.get("result", {})
    content = result.get("content", [])
    if content and isinstance(content, list) and len(content) > 0:
        text = content[0].get("text", "")
        if text:
            try:
                return json.loads(text)
            except Exception:
                return content[0]
    return data


def build_signed_url():
    ts = str(int(time.time() * 1000))
    string_to_sign = f"{ts}\n{WEBHOOK_SECRET}"
    sign = base64.b64encode(
        hmac.new(WEBHOOK_SECRET.encode("utf-8"), string_to_sign.encode("utf-8"), digestmod=hashlib.sha256).digest()
    ).decode("utf-8")
    query = urlencode({"access_token": WEBHOOK_ACCESS_TOKEN, "timestamp": ts, "sign": sign})
    return f"{WEBHOOK_BASE}?{query}"


def push_dingtalk(title, text):
    payload = {
        "msgtype": "markdown",
        "markdown": {"title": title, "text": text},
        "at": {"atMobiles": [AT_MOBILE], "isAtAll": False},
    }
    url = build_signed_url()
    resp = requests.post(url, json=payload, timeout=30)
    return resp.json()


def main():
    report_file = Path(r"C:\Users\33606\Desktop\skills\skill\mcp\output\位置监控平台-国际化 测试报告 2026-07-15.md")
    section1_file = Path(r"C:\Users\33606\Desktop\skills\skill\mcp\output\位置监控平台-国际化-section1-20260715.md")

    report_text = report_file.read_text(encoding="utf-8")
    section1_text = section1_file.read_text(encoding="utf-8") if section1_file.exists() else ""

    # 提取正文（从"一、测试结果"开始）
    sec_match = regex_module.search(r"^## 一、测试结果", report_text, regex_module.MULTILINE)
    doc_body = report_text[sec_match.start():] if sec_match else report_text

    # 1. 创建文档（前3000字符）
    print("[step1] 创建钉钉文档...")
    doc_title = "【磐钴】位置监控平台-国际化 测试报告 2026-07-15"
    create_result = mcp_call("create_document", {
        "folderId": FOLDER_ID,
        "name": doc_title,
        "markdown": doc_body[:3000],
    })
    print(f"[step1] create: {json.dumps(create_result, ensure_ascii=False)[:500]}")

    node_id = create_result.get("nodeId", create_result.get("documentId", None))
    if not node_id:
        print(f"[error] 无法获取 nodeId: {json.dumps(create_result, ensure_ascii=False)[:800]}", file=sys.stderr)
        sys.exit(1)

    doc_url = f"https://alidocs.dingtalk.com/i/nodes/{node_id}"
    print(f"[step1] 文档创建成功 nodeId={node_id}")

    # 2. 分段追加剩余内容
    if len(doc_body) > 3000:
        remaining = doc_body[3000:]
        chunk_size = 3000
        offset = 0
        part = 2
        while offset < len(remaining):
            chunk = remaining[offset:offset + chunk_size]
            mcp_call("update_document", {"mode": "append", "nodeId": node_id, "markdown": chunk})
            print(f"[step2] 追加第{part}段: {len(chunk)}字")
            offset += chunk_size
            part += 1

    # 3. 推送钉钉机器人
    print("[step3] 推送钉钉机器人...")
    msg_text = (
        f"## {doc_title}\n\n"
        f"{section1_text}\n\n"
        f"---\n**负责人**：@{AT_MOBILE} 请关注并优先跟进\n\n"
        f"### 附件\n\n完整测试报告:{doc_url}"
    )
    push_result = push_dingtalk(doc_title, msg_text)
    print(f"[step3] errcode={push_result.get('errcode')} errmsg={push_result.get('errmsg')}")

    if push_result.get("errcode") == 0:
        print(f"[done] 全部完成！文档: {doc_url}")
    else:
        print(f"[error] 推送失败", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
