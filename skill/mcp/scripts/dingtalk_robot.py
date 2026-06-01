import requests
import time
import hmac
import hashlib
import base64

access_token = "6bf732946c8873abc98b35d2d82deb6e987a4cd687076549e0d79cddf3a3dbc2"
secret = "SEC2fa2956f6facd9270222bb93eb76460f3d564f72c4671528ea7cd14b2c7de888"

timestamp = str(int(time.time() * 1000))
string_to_sign = timestamp + '\n' + secret
hmac_code = hmac.new(secret.encode('utf-8'), string_to_sign.encode('utf-8'), digestmod=hashlib.sha256).digest()
sign = base64.b64encode(hmac_code).decode('utf-8')

url = f'https://oapi.dingtalk.com/robot/send?access_token={access_token}&timestamp={timestamp}&sign={sign}'

text = """## 【磐钴】星地多网融合指挥调度SaaS平台1期 测试报告 2026-05-27

### 一、测试结果

本轮测试已完成【磐钴】星地多网融合指挥调度SaaS平台1期的功能验证，当前仍有 **13 个未解决缺陷**，主要集中在 **【功能异常】** / **【UI/排版】** / **【数据准确性】** 等方向，其中 **1 个高优问题（二级）需优先修复**，12 个三级问题建议尽快跟进。

> - **【功能异常】**：账号体系存在登录态校验缺陷，冻结账号可无提示登录、二级账号手机号为空仍可登录并降级为三级权限；消息管理中救援棒普通群聊平台消息下发失败无具体原因；求救群聊存在未读角标双倍计数、报警结束后待发消息未同步取消等问题；奥维绑定接口响应异常；关注监控平台扫码后分组设备数据无法返回。
> - **【UI/排版】**：控制台详情弹窗未锚定图标上方；设备列表鼠标悬浮时 hover 效果上下抖动。
> - **【数据准确性】**：设备管理与监控大屏在线/离线设备数不一致；设备订阅列表错误展示标签设备；账号新建时北斗报文剩余数量默认为 0 导致好友无法下发报文。

### 附件

完整测试报告：[点击查看](https://alidocs.dingtalk.com/i/nodes/1DKw2zgV2PdnPeakUPPN9kQA8B5r9YAn)"""

data = {
    'msgtype': 'markdown',
    'markdown': {
        'title': '【磐钴】星地多网融合指挥调度SaaS平台1期 测试报告 2026-05-27',
        'text': text
    },
    'at': {
        'atMobiles': ['13250703582'],
        'isAtAll': False
    }
}

r = requests.post(url, headers={'Content-Type': 'application/json'}, json=data)
print(r.text)
