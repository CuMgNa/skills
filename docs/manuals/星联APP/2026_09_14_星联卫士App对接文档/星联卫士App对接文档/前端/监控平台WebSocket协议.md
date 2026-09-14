# 监控平台WebSocket协议文档

## 协议概述

所有WebSocket消息统一使用以下格式：

```json
{
    "type": 消息类型编号,
    "msg": "消息描述",
    "content": {具体数据内容}
}
```

**连接地址：** `/ws`

---

## 协议类型列表

### 0 = ERROR(0, "错误消息")

当系统发生错误时推送。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| code | Integer | 错误码：0-成功，1-TOKEN无效，2-请求参数错误，3-无权限，4-服务器错误，999-失败 | 必填 |
| msg | String | 错误信息描述 | 必填 |

#### 示例

```json
{
    "type": 0,
    "msg": "错误消息",
    "content": {
        "code": 1,
        "msg": "TOKEN无效"
    }
}
```

---

### 1 = HEART_BEAT(1, "心跳")

心跳检测消息，用于保持连接活跃。

#### 字段说明

无content字段或为空对象。

#### 示例

```json
{
    "type": 1,
    "msg": "心跳",
    "content": {}
}
```

---

### 10 = LOGIN(10, "登录")

客户端发送登录请求。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| userType | Integer | 登录端类型：0-Web端，1-移动端 | 必填 |
| token | String | 用户认证token | 必填 |
| acceptLanguage | String | 国际化语言参数 | 非必填 |

#### 示例

```json
{
    "type": 10,
    "msg": "登录",
    "content": {
        "userType": 0,
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "acceptLanguage": "zh-CN"
    }
}
```

---

### 11 = LOGIN_RESP(11, "登录响应")

服务器响应登录请求。

#### 字段说明

无content字段或为空对象，登录结果通过msg字段表示。

#### 示例

```json
{
    "type": 11,
    "msg": "登录成功",
    "content": {}
}
```

---

### 20 = CHAT(20, "聊天信息")

推送新的聊天消息。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| id | String | 聊天记录ID | 必填 |
| fromAccount | String | 发送账号（Web账号） | 非必填 |
| from | String | 发送方卡号 | 必填 |
| to | String | 接收方卡号 | 必填 |
| chatSendStatus | Object | 发送状态，格式：{"name": "枚举名称", "value": "枚举描述"} | 非必填 |
| errorMsg | String | 发送失败错误提示 | 非必填 |
| chatType | Object | 聊天类型，格式：{"name": "TEXT/VOICE/IMAGE", "value": "文本/语音/图片"} | 必填 |
| loc | Object | 位置信息 | 非必填 |
| content | String | 文本内容（当类型为TEXT或OK时） | 非必填 |
| imageInfo | Object | 图片信息 | 非必填 |
| voiceInfo | Object | 语音信息 | 非必填 |
| alarmInfo | Object | 报警信息 | 非必填 |
| chatTimeStr | String | 聊天时间（格式：yyyy-MM-dd HH:mm:ss） | 必填 |
| sourceChannel | Object | 消息来源，格式：{"name": "枚举名称", "value": "枚举描述"} | 非必填 |

#### loc位置信息结构

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| locType | String | 定位类型 | 必填 |
| locStatus | String | 定位状态 | 必填 |
| lng | Double | 经度（火星坐标系） | 非必填 |
| lat | Double | 纬度（火星坐标系） | 非必填 |
| alt | Double | 海拔（米） | 非必填 |
| speed | Float | 速度（km/h） | 非必填 |
| dir | Integer | 方向 | 非必填 |
| time | String | 定位时间（yyyy-MM-dd HH:mm:ss） | 非必填 |
| remark | String | 位置备注 | 非必填 |
| wgs84Lng | Double | 经度（大地坐标系） | 非必填 |
| wgs84Lat | Double | 纬度（大地坐标系） | 非必填 |
| reportType | Integer | 补传标识：0-正常，1-补传 | 非必填 |

#### imageInfo图片信息结构

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| beforeCompSize | Float | 压缩前大小（MB） | 非必填 |
| decompSize | Float | 解压后大小（MB） | 非必填 |
| size | Float | 图片压缩后大小（KB） | 非必填 |
| total | Integer | 图片总数量 | 必填 |
| curTotal | Integer | 已接收图片数量 | 必填 |
| finished | Boolean | 是否已接收完毕 | 必填 |
| fileId | String | 图片ID | 必填 |
| errorMsg | String | 错误消息 | 非必填 |
| imageType | Integer | 图片类型：0-传统渐进式压缩，1-AI图像压缩，2-传统视频压缩 | 非必填 |

#### voiceInfo语音信息结构

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| sec | Integer | 时长（秒） | 必填 |
| fileId | String | 解码后文件ID | 必填 |
| enhanceFileId | String | 增强后文件ID | 非必填 |
| enhanceStatus | Object | 增强状态，格式：{"name": "枚举名称", "value": "枚举描述"} | 非必填 |

#### 示例

```json
{
    "type": 20,
    "msg": "聊天信息",
    "content": {
        "id": "123456",
        "from": "13800138000",
        "to": "13900139000",
        "chatType": {"name": "TEXT", "value": "文本"},
        "content": "你好",
        "chatTimeStr": "2026-04-14 10:30:00",
        "loc": {
            "locType": "GPS",
            "locStatus": "SUCCESS",
            "lng": 112.123456,
            "lat": 37.123456,
            "time": "2026-04-14 10:29:50"
        }
    }
}
```

---

### 21 = CHAT_UPDATE_IMAGE(21, "聊天更新图片")

更新图片接收进度。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| chatId | String | 聊天记录ID | 必填 |
| fromAccount | String | 发送账号 | 必填 |
| from | String | 发送方卡号 | 必填 |
| imageInfo | Object | 图片信息 | 必填 |

**imageInfo图片信息结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| beforeCompSize | Float | 压缩前大小（MB） | 非必填 |
| decompSize | Float | 解压后大小（MB） | 非必填 |
| size | Float | 图片压缩后大小（KB） | 非必填 |
| total | Integer | 图片总数量 | 必填 |
| curTotal | Integer | 已接收图片数量 | 必填 |
| finished | Boolean | 是否已接收完毕 | 必填 |
| fileId | String | 图片ID | 必填 |
| errorMsg | String | 错误消息 | 非必填 |
| imageType | Integer | 图片类型：0-传统渐进式压缩，1-AI图像压缩，2-传统视频压缩 | 非必填 |

#### 示例

```json
{
    "type": 21,
    "msg": "聊天更新图片",
    "content": {
        "chatId": "123456",
        "fromAccount": "admin",
        "from": "13800138000",
        "imageInfo": {
            "total": 10,
            "curTotal": 5,
            "finished": false,
            "fileId": "img_001"
        }
    }
}
```

---

### 22 = CHAT_SEND_STATUS(22, "聊天发送状态")

更新消息发送状态。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| chatId | String | 聊天记录ID | 必填 |
| to | String | 接收方卡号 | 必填 |
| chatSendStatus | Object | 发送状态，格式：{"name": "枚举名称", "value": "枚举描述"} | 必填 |
| errorMsg | String | 发送失败提示 | 非必填 |

#### 示例

```json
{
    "type": 22,
    "msg": "聊天发送状态",
    "content": {
        "chatId": "123456",
        "to": "13900139000",
        "chatSendStatus": {"name": "SUCCESS", "value": "发送成功"},
        "errorMsg": ""
    }
}
```

---

### 23 = CHAT_UPDATE_ENHANCE_VOICE(23, "更新语音增强信息")

更新语音增强处理状态。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| chatId | String | 聊天记录ID | 必填 |
| fromAccount | String | 发送账号 | 必填 |
| from | String | 发送方卡号 | 必填 |
| voiceInfo | Object | 语音信息 | 必填 |

**voiceInfo语音信息结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| sec | Integer | 时长（秒） | 必填 |
| fileId | String | 解码后文件ID | 必填 |
| enhanceFileId | String | 增强后文件ID | 非必填 |
| enhanceStatus | Object | 增强状态，格式：{"name": "枚举名称", "value": "枚举描述"} | 非必填 |

#### 示例

```json
{
    "type": 23,
    "msg": "更新语音增强信息",
    "content": {
        "chatId": "123456",
        "fromAccount": "admin",
        "from": "13800138000",
        "voiceInfo": {
            "sec": 15,
            "fileId": "voice_001",
            "enhanceFileId": "voice_enhance_001",
            "enhanceStatus": {"name": "COMPLETED", "value": "增强完成"}
        }
    }
}
```

---

### 24 = CHAT_CREATE_ITEM(24, "创建聊天项通知")

通知创建新的聊天会话。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| id | String | 聊天记录ID | 必填 |
| addr | String | 设备卡号或手机号码 | 必填 |
| status | String | 状态 | 必填 |
| scope | String | 使用范围 | 非必填 |
| remark | String | 备注（设备备注或微信昵称） | 非必填 |
| chatTimeStr | String | 聊天时间（yyyy-MM-dd HH:mm:ss） | 必填 |
| unreadNum | Integer | 未读数量 | 必填 |
| type | String | 设备类型 | 非必填 |
| chatType | Object | 聊天类型，格式：{"name": "枚举名称", "value": "枚举描述"} | 必填 |
| content | String | 聊天内容信息 | 非必填 |
| isPhone | Boolean | 是否是手机号码 | 必填 |
| avatar | String | 头像URL（手机号码时有效） | 非必填 |
| follow | Boolean | 是否已收藏 | 非必填 |
| notDisturb | Boolean | 是否已开启免打扰 | 非必填 |
| bound | Boolean | 是否已绑定该设备 | 非必填 |
| onlineFlag | String | 设备在线标识 | 非必填 |
| showSendButton | Boolean | 是否显示发送按钮 | 非必填 |

#### 示例

```json
{
    "type": 24,
    "msg": "创建聊天项通知",
    "content": {
        "id": "chat_item_001",
        "addr": "13800138000",
        "status": "ONLINE",
        "remark": "测试设备",
        "chatTimeStr": "2026-04-14 10:30:00",
        "unreadNum": 0,
        "chatType": {"name": "TEXT", "value": "文本"},
        "content": "你好",
        "isPhone": false,
        "onlineFlag": "ONLINE",
        "showSendButton": true
    }
}
```

---

### 30 = CHAT_NUM(30, "聊天数量")

更新未读聊天消息数量。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| chatNum | Integer | 未读聊天数量（正数增加，负数减少，null不更新） | 非必填 |

#### 示例

```json
{
    "type": 30,
    "msg": "聊天数量",
    "content": {
        "chatNum": 5
    }
}
```

---

### 31 = OK_ALARM_NUM(31, "报平安或报警数量")

更新未读报平安或报警数量。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| alarmNum | Integer | 未读报警数量（正数增加，负数减少，null不更新） | 非必填 |
| okNum | Integer | 报平安数量（正数增加，负数减少，null不更新） | 非必填 |

#### 示例

```json
{
    "type": 31,
    "msg": "报平安或报警数量",
    "content": {
        "alarmNum": 3,
        "okNum": 10
    }
}
```

---

### 42 = BATCH_LOCATION(42, "批量位置信息")

批量推送设备位置信息，用于实时追踪。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| locs | Array | 位置列表 | 必填 |

**locs位置列表项结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| addr | String | 设备地址 | 必填 |
| remark | String | 备注 | 非必填 |
| preDistance | Double | 与上一个位置的距离（KM） | 非必填 |
| loc | Object | 位置信息 | 必填 |

**loc位置信息结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| locType | String | 定位类型 | 必填 |
| locStatus | String | 定位状态 | 必填 |
| lng | Double | 经度（火星坐标系） | 非必填 |
| lat | Double | 纬度（火星坐标系） | 非必填 |
| alt | Double | 海拔（米） | 非必填 |
| speed | Float | 速度（km/h） | 非必填 |
| dir | Integer | 方向 | 非必填 |
| time | String | 定位时间（yyyy-MM-dd HH:mm:ss） | 非必填 |
| remark | String | 位置备注 | 非必填 |
| wgs84Lng | Double | 经度（大地坐标系） | 非必填 |
| wgs84Lat | Double | 纬度（大地坐标系） | 非必填 |
| reportType | Integer | 补传标识：0-正常，1-补传 | 非必填 |

#### 示例

```json
{
    "type": 42,
    "msg": "批量位置信息",
    "content": {
        "locs": [
            {
                "addr": "13800138000",
                "remark": "测试设备",
                "preDistance": 0.5,
                "loc": {
                    "locType": "GPS",
                    "locStatus": "SUCCESS",
                    "lng": 112.123456,
                    "lat": 37.123456,
                    "alt": 100.5,
                    "speed": 60.0,
                    "dir": 180,
                    "time": "2026-04-14 10:30:00",
                    "wgs84Lng": 112.120000,
                    "wgs84Lat": 37.120000,
                    "reportType": 0
                }
            }
        ]
    }
}
```

---

### 51 = TERM_INFO(51, "设备信息")

推送设备状态信息更新。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| groupId | String | 分组ID（方便前端定位设备） | 非必填 |
| addr | String | 设备地址 | 必填 |
| scope | String | 使用范围 | 非必填 |
| remark | String | 备注 | 非必填 |
| lastCommTime | Long | 最后一次通信时间（毫秒） | 必填 |
| status | String | 设备状态：在线/离线/报警 | 必填 |
| onlineFlag | String | 在线标识：在线/离线/未知 | 必填 |
| stopPort | Boolean | 停港状态 | 非必填 |
| infos | Array | 设备运行信息列表 | 非必填 |
| loc | Object | 位置信息 | 非必填 |
| wsAlarms | Array | 报警消息列表 | 非必填 |
| okMsg | Object | 报平安消息 | 非必填 |

**loc位置信息结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| locType | String | 定位类型 | 必填 |
| locStatus | String | 定位状态 | 必填 |
| lng | Double | 经度（火星坐标系） | 非必填 |
| lat | Double | 纬度（火星坐标系） | 非必填 |
| alt | Double | 海拔（米） | 非必填 |
| speed | Float | 速度（km/h） | 非必填 |
| dir | Integer | 方向 | 非必填 |
| time | String | 定位时间（yyyy-MM-dd HH:mm:ss） | 非必填 |
| remark | String | 位置备注 | 非必填 |
| wgs84Lng | Double | 经度（大地坐标系） | 非必填 |
| wgs84Lat | Double | 纬度（大地坐标系） | 非必填 |
| reportType | Integer | 补传标识：0-正常，1-补传 | 非必填 |

**wsAlarms报警消息列表项结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| alarmId | String | 报警信息ID | 必填 |
| alarmTime | String | 报警时间（yyyy-MM-dd HH:mm:ss） | 必填 |
| loc | Object | 位置信息 | 非必填 |
| alarmType | Object | 报警类型，格式：{"name": "枚举名称", "value": "枚举描述"} | 必填 |
| popupWindow | Boolean | 是否有弹窗 | 必填 |
| alarmVoice | Boolean | 是否有声音 | 必填 |
| smsNoti | Boolean | 是否短信通知 | 必填 |
| emailNoti | Boolean | 是否邮箱通知 | 必填 |
| content | String | 报警内容 | 非必填 |

**okMsg报平安消息结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| msgId | String | 信息ID | 必填 |
| okTime | String | 报平安时间（yyyy-MM-dd HH:mm:ss） | 必填 |
| loc | Object | 位置信息 | 非必填 |
| content | String | 报平安内容 | 非必填 |
| toPhone | String | 联系人电话 | 非必填 |

#### 示例

```json
{
    "type": 51,
    "msg": "设备信息",
    "content": {
        "groupId": "group_001",
        "addr": "13800138000",
        "scope": "全国",
        "remark": "测试设备",
        "lastCommTime": 1713067800000,
        "status": "ONLINE",
        "onlineFlag": "ONLINE",
        "stopPort": false,
        "loc": {
            "locType": "GPS",
            "locStatus": "SUCCESS",
            "lng": 112.123456,
            "lat": 37.123456,
            "time": "2026-04-14 10:30:00"
        },
        "wsAlarms": [
            {
                "alarmId": "alarm_001",
                "alarmTime": "2026-04-14 10:25:00",
                "alarmType": {"name": "SOS", "value": "SOS报警"},
                "popupWindow": true,
                "alarmVoice": true,
                "smsNoti": false,
                "emailNoti": false,
                "content": "紧急求救"
            }
        ],
        "okMsg": {
            "msgId": "ok_001",
            "okTime": "2026-04-14 10:20:00",
            "content": "一切正常",
            "toPhone": "13900139000"
        }
    }
}
```

---

### 60 = LIVE_BROADCAST_MONITORING(60, "位置直播监听")

位置直播相关消息。

#### 请求字段说明

客户端发送监听请求：

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| roomId | String | 直播房间ID | 必填 |

#### 推送内容

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| bulletScreens | Array | 弹幕列表 | 必填 |

**弹幕类型包括：**

1. **进入直播**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| bulletScreenType | Object | 弹幕类型，格式：{"name": "GET_INTO", "value": "进入"} | 必填 |
| account | String | 发送账号 | 必填 |
| nickname | String | 昵称 | 必填 |

2. **聊天弹幕**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| bulletScreenType | Object | 弹幕类型，格式：{"name": "CHAT", "value": "聊天"} | 必填 |
| account | String | 发送账号 | 必填 |
| nickname | String | 昵称 | 必填 |
| chatTimeStr | String | 发送时间（yyyy-MM-dd HH:mm:ss） | 必填 |
| content | String | 聊天内容 | 必填 |

3. **位置弹幕**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| bulletScreenType | Object | 弹幕类型，格式：{"name": "LOCATION", "value": "位置"} | 必填 |
| locs | Array | 位置列表 | 必填 |
| destInfo | Object | 目的地信息 | 非必填 |

**locs位置列表项结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| addr | String | 设备地址 | 必填 |
| remark | String | 备注 | 非必填 |
| preDistance | Double | 与上一个位置的距离（KM） | 非必填 |
| loc | Object | 位置信息 | 必填 |

**loc位置信息结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| locType | String | 定位类型 | 必填 |
| locStatus | String | 定位状态 | 必填 |
| lng | Double | 经度（火星坐标系） | 非必填 |
| lat | Double | 纬度（火星坐标系） | 非必填 |
| alt | Double | 海拔（米） | 非必填 |
| speed | Float | 速度（km/h） | 非必填 |
| dir | Integer | 方向 | 非必填 |
| time | String | 定位时间（yyyy-MM-dd HH:mm:ss） | 非必填 |
| remark | String | 位置备注 | 非必填 |
| wgs84Lng | Double | 经度（大地坐标系） | 非必填 |
| wgs84Lat | Double | 纬度（大地坐标系） | 非必填 |
| reportType | Integer | 补传标识：0-正常，1-补传 | 非必填 |

4. **在线人数**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| bulletScreenType | Object | 弹幕类型，格式：{"name": "NUM", "value": "人数"} | 必填 |
| visitorNum | Integer | 在线用户总数 | 必填 |

#### 请求示例

```json
{
    "type": 60,
    "msg": "位置直播监听",
    "content": {
        "roomId": "room_001"
    }
}
```

#### 推送示例

```json
{
    "type": 60,
    "msg": "位置直播监听",
    "content": {
        "bulletScreens": [
            {
                "bulletScreenType": {"name": "GET_INTO", "value": "进入"},
                "account": "user_001",
                "nickname": "张三"
            },
            {
                "bulletScreenType": {"name": "CHAT", "value": "聊天"},
                "account": "user_002",
                "nickname": "李四",
                "chatTimeStr": "2026-04-14 10:30:00",
                "content": "加油！"
            },
            {
                "bulletScreenType": {"name": "NUM", "value": "人数"},
                "visitorNum": 150
            }
        ]
    }
}
```

---

### 61 = BULLET_SCREEN(61, "弹幕")

单独推送弹幕信息（与60类似，但可能是独立推送）。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| bulletScreens | Array | 弹幕列表 | 必填 |

**弹幕类型包括：**

1. **进入直播**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| bulletScreenType | Object | 弹幕类型，格式：{"name": "GET_INTO", "value": "进入"} | 必填 |
| account | String | 发送账号 | 必填 |
| nickname | String | 昵称 | 必填 |

2. **聊天弹幕**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| bulletScreenType | Object | 弹幕类型，格式：{"name": "CHAT", "value": "聊天"} | 必填 |
| account | String | 发送账号 | 必填 |
| nickname | String | 昵称 | 必填 |
| chatTimeStr | String | 发送时间（yyyy-MM-dd HH:mm:ss） | 必填 |
| content | String | 聊天内容 | 必填 |

3. **位置弹幕**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| bulletScreenType | Object | 弹幕类型，格式：{"name": "LOCATION", "value": "位置"} | 必填 |
| locs | Array | 位置列表 | 必填 |
| destInfo | Object | 目的地信息 | 非必填 |

**locs位置列表项结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| addr | String | 设备地址 | 必填 |
| remark | String | 备注 | 非必填 |
| preDistance | Double | 与上一个位置的距离（KM） | 非必填 |
| loc | Object | 位置信息 | 必填 |

**loc位置信息结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| locType | String | 定位类型 | 必填 |
| locStatus | String | 定位状态 | 必填 |
| lng | Double | 经度（火星坐标系） | 非必填 |
| lat | Double | 纬度（火星坐标系） | 非必填 |
| alt | Double | 海拔（米） | 非必填 |
| speed | Float | 速度（km/h） | 非必填 |
| dir | Integer | 方向 | 非必填 |
| time | String | 定位时间（yyyy-MM-dd HH:mm:ss） | 非必填 |
| remark | String | 位置备注 | 非必填 |
| wgs84Lng | Double | 经度（大地坐标系） | 非必填 |
| wgs84Lat | Double | 纬度（大地坐标系） | 非必填 |
| reportType | Integer | 补传标识：0-正常，1-补传 | 非必填 |

4. **在线人数**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| bulletScreenType | Object | 弹幕类型，格式：{"name": "NUM", "value": "人数"} | 必填 |
| visitorNum | Integer | 在线用户总数 | 必填 |

#### 示例

```json
{
    "type": 61,
    "msg": "弹幕",
    "content": {
        "bulletScreens": [
            {
                "bulletScreenType": {"name": "CHAT", "value": "聊天"},
                "account": "user_001",
                "nickname": "王五",
                "chatTimeStr": "2026-04-14 10:35:00",
                "content": "注意安全"
            }
        ]
    }
}
```

---

### 99 = PACKAGE(99, "组装包数据")

合并多个数据包，减少推送次数，提高性能。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| infos | Array | 终端信息列表 | 非必填 |
| locs | Array | 批量位置列表 | 非必填 |
| nums | Array | 数量更新列表 | 非必填 |

**infos终端信息列表项结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| groupId | String | 分组ID（方便前端定位设备） | 非必填 |
| addr | String | 设备地址 | 必填 |
| scope | String | 使用范围 | 非必填 |
| remark | String | 备注 | 非必填 |
| lastCommTime | Long | 最后一次通信时间（毫秒） | 必填 |
| status | String | 设备状态：在线/离线/报警 | 必填 |
| onlineFlag | String | 在线标识：在线/离线/未知 | 必填 |
| stopPort | Boolean | 停港状态 | 非必填 |
| infos | Array | 设备运行信息列表 | 非必填 |
| loc | Object | 位置信息 | 非必填 |
| wsAlarms | Array | 报警消息列表 | 非必填 |
| okMsg | Object | 报平安消息 | 非必填 |

**loc位置信息结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| locType | String | 定位类型 | 必填 |
| locStatus | String | 定位状态 | 必填 |
| lng | Double | 经度（火星坐标系） | 非必填 |
| lat | Double | 纬度（火星坐标系） | 非必填 |
| alt | Double | 海拔（米） | 非必填 |
| speed | Float | 速度（km/h） | 非必填 |
| dir | Integer | 方向 | 非必填 |
| time | String | 定位时间（yyyy-MM-dd HH:mm:ss） | 非必填 |
| remark | String | 位置备注 | 非必填 |
| wgs84Lng | Double | 经度（大地坐标系） | 非必填 |
| wgs84Lat | Double | 纬度（大地坐标系） | 非必填 |
| reportType | Integer | 补传标识：0-正常，1-补传 | 非必填 |

**wsAlarms报警消息列表项结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| alarmId | String | 报警信息ID | 必填 |
| alarmTime | String | 报警时间（yyyy-MM-dd HH:mm:ss） | 必填 |
| loc | Object | 位置信息 | 非必填 |
| alarmType | Object | 报警类型，格式：{"name": "枚举名称", "value": "枚举描述"} | 必填 |
| popupWindow | Boolean | 是否有弹窗 | 必填 |
| alarmVoice | Boolean | 是否有声音 | 必填 |
| smsNoti | Boolean | 是否短信通知 | 必填 |
| emailNoti | Boolean | 是否邮箱通知 | 必填 |
| content | String | 报警内容 | 非必填 |

**okMsg报平安消息结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| msgId | String | 信息ID | 必填 |
| okTime | String | 报平安时间（yyyy-MM-dd HH:mm:ss） | 必填 |
| loc | Object | 位置信息 | 非必填 |
| content | String | 报平安内容 | 非必填 |
| toPhone | String | 联系人电话 | 非必填 |

**locs批量位置列表项结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| locs | Array | 位置列表 | 必填 |

**locs.locs位置列表项结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| addr | String | 设备地址 | 必填 |
| remark | String | 备注 | 非必填 |
| preDistance | Double | 与上一个位置的距离（KM） | 非必填 |
| loc | Object | 位置信息 | 必填 |

**nums数量更新列表项结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| alarmNum | Integer | 未读报警数量（正数增加，负数减少，null不更新） | 非必填 |
| chatNum | Integer | 未读聊天数量（正数增加，负数减少，null不更新） | 非必填 |
| okNum | Integer | 报平安数量（正数增加，负数减少，null不更新） | 非必填 |

#### 示例

```json
{
    "type": 99,
    "msg": "组装包数据",
    "content": {
        "infos": [
            {
                "addr": "13800138000",
                "status": "ONLINE",
                "onlineFlag": "ONLINE",
                "lastCommTime": 1713067800000
            }
        ],
        "locs": [
            {
                "locs": [
                    {
                        "addr": "13800138000",
                        "loc": {
                            "lng": 112.123456,
                            "lat": 37.123456,
                            "time": "2026-04-14 10:30:00"
                        }
                    }
                ]
            }
        ],
        "nums": [
            {
                "alarmNum": 1,
                "okNum": 5
            }
        ]
    }
}
```

---

### 100 = EMERGENCY_CHAT_RECORD(100, "求救群聊新消息")

推送求救群聊的新消息。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| id | String | 聊天记录ID | 必填 |
| fromAccount | String | 发送账号（Web账号） | 非必填 |
| from | String | 发送方卡号 | 必填 |
| to | String | 接收方卡号 | 必填 |
| chatSendStatus | Object | 发送状态，格式：{"name": "枚举名称", "value": "枚举描述"} | 非必填 |
| errorMsg | String | 发送失败错误提示 | 非必填 |
| **sendType** | String | **实际推送字段**：TEXT / VOICE / IMAGE（DTO 为 `EmergencyChatRecordDto.sendType`） | 必填 |
| chatType | Object | 文档历史字段；**rstp 终端入站 WS 以 sendType 为准** | 非必填 |
| loc | Object | 位置信息 | 非必填 |
| content | String | TEXT 为明文；VOICE/IMAGE 为 **fileId 或可下载 ID**（无 imageInfo 对象） | 非必填 |
| imageInfo | Object | 图片信息（**平台单聊 type20 使用；求救群 rstp 终端 IMAGE 通常无此字段**） | 非必填 |
| voiceInfo | Object | 语音信息 | 非必填 |
| alarmInfo | Object | 报警信息 | 非必填 |
| **chatTime** | Long | **实际推送字段**：消息时间毫秒值 | 必填 |
| chatTimeStr | String | 文档历史字段；rstp 终端消息以 chatTime 为准 | 非必填 |
| sourceChannel | Object | 消息来源，格式：{"name": "枚举名称", "value": "枚举描述"} | 非必填 |

**loc位置信息结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| locType | String | 定位类型 | 必填 |
| locStatus | String | 定位状态 | 必填 |
| lng | Double | 经度（火星坐标系） | 非必填 |
| lat | Double | 纬度（火星坐标系） | 非必填 |
| alt | Double | 海拔（米） | 非必填 |
| speed | Float | 速度（km/h） | 非必填 |
| dir | Integer | 方向 | 非必填 |
| time | String | 定位时间（yyyy-MM-dd HH:mm:ss） | 非必填 |
| remark | String | 位置备注 | 非必填 |
| wgs84Lng | Double | 经度（大地坐标系） | 非必填 |
| wgs84Lat | Double | 纬度（大地坐标系） | 非必填 |
| reportType | Integer | 补传标识：0-正常，1-补传 | 非必填 |

**imageInfo图片信息结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| beforeCompSize | Float | 压缩前大小（MB） | 非必填 |
| decompSize | Float | 解压后大小（MB） | 非必填 |
| size | Float | 图片压缩后大小（KB） | 非必填 |
| total | Integer | 图片总数量 | 必填 |
| curTotal | Integer | 已接收图片数量 | 必填 |
| finished | Boolean | 是否已接收完毕 | 必填 |
| fileId | String | 图片ID | 必填 |
| errorMsg | String | 错误消息 | 非必填 |
| imageType | Integer | 图片类型：0-传统渐进式压缩，1-AI图像压缩，2-传统视频压缩 | 非必填 |

**voiceInfo语音信息结构：**

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| sec | Integer | 时长（秒） | 必填 |
| fileId | String | 解码后文件ID | 必填 |
| enhanceFileId | String | 增强后文件ID | 非必填 |
| enhanceStatus | Object | 增强状态，格式：{"name": "枚举名称", "value": "枚举描述"} | 非必填 |

#### 示例（TEXT）

```json
{
    "type": 100,
    "msg": "求救群聊新消息",
    "content": {
        "id": "emergency_001",
        "from": "13800138000",
        "sendType": "TEXT",
        "content": "需要救援！",
        "chatTime": 1756450200000
    }
}
```

#### 示例（IMAGE，rstp 终端）

```json
{
    "type": 100,
    "msg": "求救群聊新消息",
    "content": {
        "id": "emergency_002",
        "from": "13800138000",
        "sendType": "IMAGE",
        "content": "stored-file-id-001",
        "chatTime": 1756450200000
    }
}
```

#### 历史示例（Web 发送，含 chatType/chatTimeStr）

```json
{
    "type": 100,
    "msg": "求救群聊新消息",
    "content": {
        "id": "emergency_001",
        "from": "13800138000",
        "to": "emergency_group_001",
        "chatType": {"name": "TEXT", "value": "文本"},
        "content": "需要救援！",
        "chatTimeStr": "2026-04-14 10:30:00",
        "loc": {
            "lng": 112.123456,
            "lat": 37.123456,
            "time": "2026-04-14 10:29:50"
        }
    }
}
```

---

### 101 = EMERGENCY_CHAT_RECORD_STATUS(101, "求救群聊状态更新")

更新求救群聊消息的状态。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| emergencyChatItemId | String | 应急聊天记录项ID | 必填 |
| emergencyChatRecordId | String | 应急聊天记录ID | 必填 |
| reportId | String | 上报ID（用于发送端标识消息） | 非必填 |
| status | String | 通知信的状态（如：READ-已读、UNREAD-未读等） | 必填 |
| unreadCount | Integer | 未读消息数量 | 必填 |

#### 示例

```json
{
    "type": 101,
    "msg": "求救群聊状态更新",
    "content": {
        "emergencyChatItemId": "item_001",
        "emergencyChatRecordId": "record_001",
        "reportId": "report_001",
        "status": "READ",
        "unreadCount": 5
    }
}
```

---

### 102 = EMERGENCY_CHAT_CREATE_ITEM(102, "求救群聊创建通知")

通知创建新的求救群聊会话。

#### 字段说明

| 字段名 | 参数类型 | 说明 | 是否必填 |
|--------|----------|------|----------|
| id | String | 聊天记录ID | 必填 |
| addr | String | 设备卡号或手机号码 | 必填 |
| status | String | 状态 | 必填 |
| scope | String | 使用范围 | 非必填 |
| remark | String | 备注（设备备注或微信昵称） | 非必填 |
| chatTimeStr | String | 聊天时间（yyyy-MM-dd HH:mm:ss） | 必填 |
| unreadNum | Integer | 未读数量 | 必填 |
| type | String | 设备类型 | 非必填 |
| chatType | Object | 聊天类型，格式：{"name": "枚举名称", "value": "枚举描述"} | 必填 |
| content | String | 聊天内容信息 | 非必填 |
| isPhone | Boolean | 是否是手机号码 | 必填 |
| avatar | String | 头像URL（手机号码时有效） | 非必填 |
| follow | Boolean | 是否已收藏 | 非必填 |
| notDisturb | Boolean | 是否已开启免打扰 | 非必填 |
| bound | Boolean | 是否已绑定该设备 | 非必填 |
| onlineFlag | String | 设备在线标识 | 非必填 |
| showSendButton | Boolean | 是否显示发送按钮 | 非必填 |

#### 示例

```json
{
    "type": 102,
    "msg": "求救群聊创建通知",
    "content": {
        "id": "emergency_item_001",
        "addr": "13800138000",
        "status": "EMERGENCY",
        "remark": "紧急求救",
        "chatTimeStr": "2026-04-14 10:30:00",
        "unreadNum": 1,
        "chatType": {"name": "TEXT", "value": "文本"},
        "content": "需要救援",
        "isPhone": false,
        "onlineFlag": "ONLINE"
    }
}
```

---

### 103 = INTERCOM_CHAT_RECORD(103, "对讲群新消息")

推送对讲群新消息（含语音、图片、文本）。

#### 字段说明

与求救群类似，content 为 `IntercomMessageVo`：

| 字段名 | 说明 |
|--------|------|
| sendType | TEXT / VOICE / **IMAGE** |
| content | 文本为文案；**VOICE/IMAGE 为可访问 fileId**（库内存 ChatVoiceInfo/ChatImageInfo ID） |
| fileSize | 语音时长（秒）；图片为 null |

#### IMAGE 示例

```json
{
    "type": 103,
    "msg": "对讲群新消息",
    "content": {
        "id": "msg001",
        "groupId": "group001",
        "sendType": "IMAGE",
        "content": "file-id-for-download",
        "chatTime": 1756450200000
    }
}
```

---

### 104 = INTERCOM_CHAT_RECORD_STATUS(104, "对讲群消息状态更新")

更新对讲群消息未读/已读/失败计数；content 结构同 103。

---

## 公共数据结构

### NameValueHolder（名称值持有者）

用于枚举类型的统一表示：

```json
{
    "name": "枚举名称",
    "value": "枚举描述"
}
```

### LocationRespDto（位置信息）

```json
{
    "locType": "GPS",
    "locStatus": "SUCCESS",
    "lng": 112.123456,
    "lat": 37.123456,
    "alt": 100.5,
    "speed": 60.0,
    "dir": 180,
    "time": "2026-04-14 10:30:00",
    "remark": "",
    "wgs84Lng": 112.120000,
    "wgs84Lat": 37.120000,
    "reportType": 0
}
```

---

## 错误码列表

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1 | TOKEN无效 |
| 2 | 请求参数错误 |
| 3 | 无权限 |
| 4 | 服务器错误 |
| 999 | 失败 |

---

## 登录端类型

| 类型值 | 说明 |
|--------|------|
| 0 | Web端 |
| 1 | 移动端 |
| 3 | 未知 |

---

## 聊天消息类型

| 类型值 | 说明 |
|--------|------|
| 0 | 文本 |
| 1 | 语音 |
| 2 | 图片 |

---

## 使用说明

1. **连接建立**：客户端连接到`/ws`端点后，应立即发送登录消息（type=10）
2. **心跳机制**：建议每30秒发送一次心跳消息（type=1）
3. **消息处理**：所有消息均为JSON格式，通过`type`字段区分消息类型
4. **错误处理**：收到type=0的错误消息时，应根据错误码进行相应处理
5. **重连机制**：连接断开后，应自动重连并重新登录

---

## 版本信息

- **文档版本**：v1.0
- **更新日期**：2026-04-14
- **适用模块**：pg-podium-monitor
