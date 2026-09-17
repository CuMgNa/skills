8. APP · S10U 指令
前缀：/api/app/s10u/codes  
鉴权：APP WebUser token。  
访问范围：必须当前账号已绑定，未绑定该台 REJECTED。  
多台：Body 里 addrs 为 JSON 数组。  
每台独立受理：未绑定/类型不是牛羊定位器(S10U)/离线等该台 status=REJECTED，不拦截整批。
关机、恢复出厂由前端二次确认。
监控、后台路径与鉴权见 §12、§13；字段不再抄。
8.1 下发一览
方法
路径
额外 Body 字段
说明
POST
/api/app/s10u/codes/upload
intervalSec 60～86400 秒
数据上传间隔
POST
/api/app/s10u/codes/zone
zone -12～14
设备时区
POST
/api/app/s10u/codes/verno
无
版本查询
POST
/api/app/s10u/codes/cr
无
立即定位
POST
/api/app/s10u/codes/poweroff
无
远程关机
POST
/api/app/s10u/codes/reset
无
远程重启
POST
/api/app/s10u/codes/find
无
查找设备
POST
/api/app/s10u/codes/factory
无
恢复出厂
POST
/api/app/s10u/codes/supper-power
enable 0/1，intervalSec>0
超长待机
POST
/api/app/s10u/codes/keyto
mode 0/1
开关机方式
POST
/api/app/s10u/codes/battery
level 0/1
电池模式
POST
/api/app/s10u/codes/led
mode 0/1
灯效
POST
/api/app/s10u/codes/sensitivity
seconds 1～255
震动灵敏度
公共字段：
字段
类型
必填
说明
addrs
String[]
是
一台或多台卡号，JSON 数组
请求示例（上传间隔，JSON Body）
{
  "addrs": ["123456789012345", "123456789012346"],
  "intervalSec": 300
}

响应 data：S10uCodeRespDto[]（每台一条）
[
  {
    "id": "66e5a1b2c3d4e5f678901299",
    "batchId": "66e5a1b2c3d4e5f678901288",
    "addr": "123456789012345",
    "command": "UPLOAD",
    "params": "300",
    "code": "UPLOAD,300",
    "status": "SENT",
    "message": null,
    "ackPayload": null,
    "operatorAccount": "alice",
    "createTime": 1726300800000,
    "sendTime": 1726300800100,
    "ackTime": null
  }
]

字段
类型
说明
id
String
明细 id
batchId
String
所属批次 id
addr
String
卡号
command
String
见下表
params
String
展示参数
code
String
协议正文
status
String
REJECTED / SENT / ACKED / TIMEOUT / FAILURE / CANCEL
message
String
原因
ackPayload
String
设备回复，如版本号
operatorAccount
String
操作账号
createTime
Long
首次提交毫秒
sendTime
Long
最近投递毫秒
ackTime
Long
回复毫秒
command 枚举
name
含义
UPLOAD
数据上传间隔
ZONE
时区
VERNO
版本查询
CR
立即定位
POWEROFF
关机
RESET
重启
FIND
查找
FACTORY
恢复出厂
SUPPER_POWER
超长待机
KEYTO
开关机方式
BATTERY
电池模式
LED
灯效
MSENSITIVITY
震动灵敏度