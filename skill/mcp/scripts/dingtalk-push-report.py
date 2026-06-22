import hmac
import hashlib
import base64
import os
import time
import json
import sys
import urllib.request

access_token = os.environ.get("DINGTALK_ACCESS_TOKEN")
secret = os.environ.get("DINGTALK_SECRET")
if not access_token or not secret:
    sys.exit("Set DINGTALK_ACCESS_TOKEN and DINGTALK_SECRET environment variables.")
doc_url = "https://alidocs.dingtalk.com/i/nodes/LeBq413JAwXBwZq2srqNB3QlWDOnGvpb"
title = "【磐钴】星地多网融合指挥调度SaaS平台1期 测试报告 2026-05-29"

section1 = """本轮测试已完成【磐钴】星地多网融合指挥调度SaaS平台1期相关模块功能验证（控制台、电子围栏、求救/普通群聊、设备管理、用户管理、账号管理、大屏监控、设备订阅等），当前仍有 **12 个未解决缺陷**，主要集中在 **电子围栏（多级同步/绑定/报警）**、**群聊与终端消息状态同步**、**账号与通知能力** 等方向，其中 **2 个高优问题（二级）需优先修复**，0 个已延期问题建议下个版本跟进。

- **【电子围栏】**：三级删除/解绑围栏或设备后，上级账号绑定关系残留或数据被异常清除；分享码可重复添加已存在围栏；报平安并发更新定位时进出围栏不报警；设备解绑重绑后围栏关联被自动恢复；触发未关联围栏的报警记录。
- **【群聊/消息同步】**：求救群聊列表摘要未自动同步；普通群聊取消待发消息后平台端状态未同步为「已取消」。
- **【账号/通知】**：一级账号编辑页冻结开关无法切换；小程序无法关注公众号。
- **【数据展示】**：大屏监控与设备管理在线/离线设备数不一致（回归不通过）。
- **【设备订阅】**：「关注我设备的好友」列表错误展示「好友/用户」标签设备。"""

text = f"""## {title}

### 一、测试结果

{section1}

### 附件

完整测试报告：[点击查看]({doc_url})"""

timestamp = str(int(time.time() * 1000))
string_to_sign = f"{timestamp}\n{secret}"
sign = base64.b64encode(
    hmac.new(secret.encode("utf-8"), string_to_sign.encode("utf-8"), digestmod=hashlib.sha256).digest()
).decode("utf-8")

url = f"https://oapi.dingtalk.com/robot/send?access_token={access_token}&timestamp={timestamp}&sign={sign}"
payload = {
    "msgtype": "markdown",
    "markdown": {"title": title, "text": text},
    "at": {"atMobiles": ["13250703582"], "isAtAll": False},
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req) as resp:
    print(resp.read().decode("utf-8"))
