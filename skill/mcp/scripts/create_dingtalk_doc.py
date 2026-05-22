import json
import urllib.request
import ssl

MCP_URL = "https://mcp-gw.dingtalk.com/server/67e5157bd2b907155c6cf50cf3284f1a5da4f0511f656f6efc1c3c4495991d8a?key=f0c41b34b8875f82ef55757cbbe2abc2"
FOLDER_ID = "4lgGw3P8vRrjRBkPIpYeXAMN85daZ90D"
DOC_NAME = "位置监控平台-国际化 测试报告 2026-05-13"

markdown = """## 一、测试结果

本轮测试已完成账号管理、控制台、消息管理、设备管理、用户管理等多个模块的国际化功能验证，当前仍有 **5 个未解决缺陷**，主要集中在 **【国际化适配不完整】 / 【UI渲染异常】 / 【易用性问题】** 等方向，其中 **1 个高优问题（二级）需优先修复**，3 个已延期问题建议下个版本跟进。

- **【国际化适配不完整】**：英文环境下核心导出功能（Excel 导入/导出模板）仍使用中文，未按系统语言环境适配，影响国际用户正常使用；另有导出轨迹 Excel 及设备信息数据的时区转换问题（已解决），以及救援队信息未国际化问题（已解决），说明国际化覆盖仍存在遗漏。
- **【UI渲染异常】**：追踪设备时切换图层出现重复图标，属视觉渲染缺陷；相册分包协议解析逻辑错误导致首包被当作图像数据渲染（已解决）。
- **【易用性问题】**：状态角标过小导致在线绿勾难以识别；PN06/PN07 指令下发弹窗中设备列表未过滤空分组，增加用户操作干扰；设备信息导出模版字体为宋体，与国际版本风格不适配。

## 二、未解决问题汇总

1. [二级] 【账号管理】英文环境下Excel导入与导出模板仍为中文，未有效适配
2. [三级] 【控制台】追踪设备时切换图层出现重复图标
3. [四级] 【账号管理】状态角标过小导致在线绿勾难以识别
4. [四级] 【消息管理】PN06与PN07指令下发弹窗，左侧设备列表未过滤空分组
5. [四级] 【设备管理】设备信息导出模版字体为宋体，不适配于国际版本

> 测试问题汇总：1 级：0 个；2 级：1 个；3 级：1 个；4 级：3 个，一共：17 个，剩余 5 个未解决，12 个待回归。

## 三、缺陷附件

激活-已确认（回归不通过）（2）

1. [二级] 【账号管理】英文环境下Excel导入与导出模板仍为中文，未有效适配
2. [三级] 【控制台】追踪设备时切换图层出现重复图标

已解决（12）

3. [三级] 【我的订单】待支付弹窗，订单时间为空
4. [三级] 【账号管理】英文下Actions列按钮拥挤建议优化为图标
5. [三级] 【账号管理】设备入库导入失败提示语含省略号，鼠标悬浮缺少详情提示
6. [三级] 【账号管理】获取批量入库模版，Accept-Language传参错误：zn-ch
7. [三级] 【账号管理】导出的设备轨迹Excel，其定位时间未按Asia/Tehran时区转换
8. [三级] 【账号管理】导出的设备信息数据，其通信与定位时间未按Asia/Tehran时区转换
9. [三级] 【消息管理】英文环境下救援队信息内容未国际化
10. [三级] 【设备管理】检测统计数据列表时间未按系统设定时区转换，仍显示UTC+8
11. [三级] 【用户管理】英文模式下，分配设备（仅分配模式）生成的默认分组名称显示为中文
12. [四级] 【消息管理】英文下Album弹窗，图片组包中占位文案显中文
13. [四级] 【账号管理】设备密码输入框未限制最大字符长度
14. [四级] 【控制台】相册分包协议解析逻辑错误，首包被当作图像数据渲染导致显示 "Packet Loss"

已延期（3）

15. [四级] 【账号管理】状态角标过小导致在线绿勾难以识别
16. [四级] 【消息管理】PN06与PN07指令下发弹窗，左侧设备列表未过滤空分组
17. [四级] 【设备管理】设备信息导出模版字体为宋体，不适配于国际版本"""

body = json.dumps({
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
        "name": "create_document",
        "arguments": {
            "folderId": FOLDER_ID,
            "name": DOC_NAME,
            "markdown": markdown
        }
    }
}).encode("utf-8")

ctx = ssl.create_default_context()
req = urllib.request.Request(MCP_URL, data=body, headers={
    "Content-Type": "application/json",
    "Accept": "application/json"
})
try:
    resp = urllib.request.urlopen(req, context=ctx, timeout=30)
    result = resp.read().decode("utf-8")
    print(result)
    # Extract nodeId from response
    try:
        data = json.loads(result)
        if "result" in data:
            content = json.loads(data["result"].get("content", [{}])[0].get("text", "{}"))
            print(f"\n=== NODE_ID: {content.get('nodeId', 'NOT_FOUND')} ===")
    except:
        pass
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode("utf-8"))
