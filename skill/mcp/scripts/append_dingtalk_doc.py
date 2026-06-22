import os
import requests, json, sys
sys.stdout.reconfigure(encoding='utf-8')

MCP_URL = os.environ.get("DINGTALK_MCP_URL")
if not MCP_URL:
    sys.exit("Set DINGTALK_MCP_URL environment variable.")
HEADERS = {'Content-Type': 'application/json', 'Accept': 'application/json'}
NODE_ID = '1OQX0akWmx2dxPKLtvxNMpAM8GlDd3mE'

section2 = """### 缺陷附件

### 激活-待确认（2）

1. [二级] 【设备管理】仅分配设备后二级账号设备列表查询为空
2. [二级] 【下行消息管理】平台取消待发送消息后小程序仍显示「等待发送给终端」

### 已解决（14）

3. [二级] 【账号管理】英文环境下Excel导入与导出模板仍为中文，未有效适配
4. [三级] 【我的订单】待支付弹窗，订单时间为空
5. [三级] 【账号管理】英文下Actions列按钮拥挤建议优化为图标
6. [三级] 【账号管理】设备入库导入失败提示语含省略号，鼠标悬浮缺少详情提示
7. [三级] 【账号管理】获取批量入库模版，Accept-Language传参错误：zn-ch
8. [三级] 【账号管理】导出的设备轨迹Excel，其定位时间未按Asia/Tehran时区转换
9. [三级] 【账号管理】导出的设备信息数据，其通信与定位时间未按Asia/Tehran时区转换
10. [三级] 【消息管理】英文环境下救援队信息内容未国际化
11. [三级] 【控制台】追踪设备时切换图层出现重复图标
12. [三级] 【设备管理】检测统计数据列表时间未按系统设定时区转换，仍显示UTC+8
13. [三级] 【用户管理】英文模式下，分配设备（仅分配模式）生成的默认分组名称显示为中文
14. [四级] 【消息管理】英文下Album弹窗，图片组包中占位文案显中文
15. [四级] 【账号管理】设备密码输入框未限制最大字符长度
16. [四级] 【控制台】相册分包协议解析逻辑错误，首包被当作图像数据渲染导致显示 "Packet Loss"

### 已延期（3）

17. [四级] 【账号管理】状态角标过小导致在线绿勾难以识别
18. [四级] 【消息管理】PN06与PN07指令下发弹窗，左侧设备列表未过滤空分组
19. [四级] 【设备管理】设备信息导出模版字体为宋体，不适配于国际版本"""

payload = {
    'jsonrpc': '2.0',
    'id': 2,
    'method': 'tools/call',
    'params': {
        'name': 'update_document',
        'arguments': {
            'nodeId': NODE_ID,
            'mode': 'append',
            'markdown': section2
        }
    }
}

r = requests.post(MCP_URL, headers=HEADERS, json=payload, timeout=30)
print(f"Append status: {r.status_code}")
print(f"Append response: {r.text[:500]}")
