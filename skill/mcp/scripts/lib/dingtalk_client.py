# -*- coding: utf-8 -*-
"""钉钉统一客户端（唯一签名 / 推送实现）

解决：
  1. 签名 URL 各脚本重写 → 唯一 build_signed_url()
  2. 单次请求遇网络抖动即失败 → retry + 指数退避
  3. errcode==0 误判 + @ 不生效 → 推送前强制校验正文含 @手机号；识别限流码退避重试
  4. 机密四处明文 → 统一从 lib/qa_config.py 读取（环境变量优先）

仅负责机器人 webhook 推送（公开 webhook，脚本可直连）。
钉钉文档（alidocs）创建仍由 Agent 走「钉钉文档」MCP 的 create_document（见 SKILL）。
"""
import base64
import hashlib
import hmac
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

import requests

sys.path.insert(0, str(Path(__file__).parent))
import qa_config  # noqa: E402

WEBHOOK_BASE = "https://oapi.dingtalk.com/robot/send"
MAX_RETRY = 4
RETRY_BACKOFF = [2, 5, 10, 20]
# 钉钉限流 / 需退避的 errcode
RATE_LIMIT_CODES = {130101, 130102, 410100, -1}


class DingTalkError(Exception):
    pass


def build_signed_url(access_token, secret, timestamp=None):
    """唯一的签名 URL 拼装出处。其它脚本只调用本函数。"""
    ts = timestamp or str(int(time.time() * 1000))
    string_to_sign = f"{ts}\n{secret}"
    sign = base64.b64encode(
        hmac.new(secret.encode("utf-8"), string_to_sign.encode("utf-8"), digestmod=hashlib.sha256).digest()
    ).decode("utf-8")
    query = urlencode({"access_token": access_token, "timestamp": ts, "sign": sign})
    return f"{WEBHOOK_BASE}?{query}"


def push_markdown(title, text, at_mobiles=None, is_at_all=False,
                  access_token=None, secret=None):
    """推送 markdown 消息。

    返回 dict: {ok, errcode, errmsg, at_effective, attempts}
    - at_effective: 正文是否包含每个 at_mobile 的 @手机号（@ 真正生效的前提）
    """
    token, sec = qa_config.get_dingtalk_webhook()
    access_token = access_token or token
    secret = secret or sec
    at_mobiles = at_mobiles if at_mobiles is not None else qa_config.get_at_mobiles()

    # ① @ 生效前置校验：正文必须出现每个 @手机号，否则钉钉静默不 @
    missing = [m for m in at_mobiles if f"@{m}" not in text]
    if missing:
        raise DingTalkError(f"正文缺少 @手机号 {missing}，@ 不会生效（请在正文写出 @手机号）")

    payload = {
        "msgtype": "markdown",
        "markdown": {"title": title, "text": text},
        "at": {"atMobiles": at_mobiles, "isAtAll": is_at_all},
    }

    last_err = None
    for attempt in range(MAX_RETRY):
        # 每次重试重新签名（timestamp 必须新鲜，否则签名过期）
        url = build_signed_url(access_token, secret)
        try:
            resp = requests.post(url, headers={"Content-Type": "application/json"},
                                 json=payload, timeout=30)
            data = resp.json()
            errcode = data.get("errcode")
            if errcode == 0:
                return {"ok": True, "errcode": 0, "errmsg": data.get("errmsg", "ok"),
                        "at_effective": True, "attempts": attempt + 1}
            if errcode in RATE_LIMIT_CODES:
                wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
                last_err = f"errcode={errcode} {data.get('errmsg')}（限流，退避 {wait}s）"
                time.sleep(wait)
                continue
            # 其它业务错误：不重试（如签名错误、token 失效）
            return {"ok": False, "errcode": errcode, "errmsg": data.get("errmsg"),
                    "at_effective": True, "attempts": attempt + 1}
        except (requests.ConnectionError, requests.Timeout) as e:
            last_err = str(e)
            wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
            time.sleep(wait)
    raise DingTalkError(f"推送失败（重试 {MAX_RETRY} 次）: {last_err}")


def build_mention_line(at_mobiles=None):
    """生成「负责人@」行，保证正文与 atMobiles 一致。"""
    at_mobiles = at_mobiles if at_mobiles is not None else qa_config.get_at_mobiles()
    ats = " ".join(f"@{m}" for m in at_mobiles)
    return f"---\n**负责人**：{ats} 请关注并优先跟进"


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    # 自检：仅验证签名与正文校验逻辑，不实际推送
    t, s = qa_config.get_dingtalk_webhook()
    print("signed url sample:", build_signed_url(t, s)[:80], "...")
    print("mention line:", build_mention_line())
