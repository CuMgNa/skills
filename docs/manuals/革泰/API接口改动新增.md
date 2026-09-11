# API接口改动新增

# APP 邮箱账号与围栏接口对接文档

> 基准提交：`4137ca7f59a0b8abaa45a2f1b0784fd0f2c33b20`（增加圆形围栏）。   本文记录从该节点到当前代码中，前端需要关注的新增接口和改动接口。后续新增接口继续在本文追加。

## 通用说明

*   基础路径：`/api/monitor`
    
*   通用响应结构：
    

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | `Integer` | 业务状态码，`0` 表示成功。 |
| `msg` | `String` | 业务提示信息。 |
| `data` | `Object` | 业务数据；空成功响应时为 `null`。 |

通用成功响应示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": null
}

```

## 一、APP 邮箱账号接口

### 1. 发送邮箱注册验证码

*   方法：`POST`
    
*   路径：`/api/monitor/ver-codes/register`
    
*   认证：不需要登录 token
    
*   Content-Type：`application/x-www-form-urlencoded` 或 query 参数
    
*   说明：邮箱注册前先调用该接口发送验证码，`mode` 必须传 `EMAIL`。
    

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mode` | `String` | 是 | 通知方式；邮箱验证码传 `EMAIL`。 |
| `to` | `String` | 是 | 接收验证码的邮箱地址。 |

请求示例：

```http
POST /api/monitor/ver-codes/register?mode=EMAIL&to=user@example.com

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": null
}

```

响应结果：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `data` | `null` | 发送成功不返回业务数据。 |

### 2. APP 邮箱注册

*   方法：`POST`
    
*   路径：`/api/monitor/app-users/email/register`
    
*   认证：不需要登录 token
    
*   Content-Type：`application/json`
    
*   说明：用户输入账号、邮箱、密码、邮箱验证码注册个人账号；注册成功直接返回 APP 登录 token。`account` 由前端提交，注册后同时作为 APP 登录账号和个人 Web 账号。
    

请求 JSON 示例：

```json
{
  "account": "user001",
  "email": "user@example.com",
  "code": "123456",
  "password": "e10adc3949ba59abbe56e057f20f883e"
}

```

请求 body 参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `account` | `String` | 是 | APP 登录账号；注册时由前端提交。后端会校验账号不能为空，且不能与已有 Web 账号重复。 |
| `email` | `String` | 是 | 邮箱地址；后端会去除首尾空格并转小写保存。系统内邮箱唯一。 |
| `code` | `String` | 是 | 邮箱验证码，当前长度为 6 位。验证码类型为 `REGISTER + EMAIL`。 |
| `password` | `String` | 是 | 前端提交的密码密文；沿用当前系统约定，传 MD5 后的值。 |

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "token": "eyJhbGciOiJIUzUxMiJ9.xxx",
    "account": "user001",
    "email": "user@example.com",
    "phone": null,
    "avatar": null,
    "nickname": "天地卫通",
    "gender": null,
    "emergencyContacts": null,
    "initPwd": false,
    "webRoleType": "PersonalWebAdmin",
    "enterpriseAccount": false,
    "webAccount": "user001",
    "level": null,
    "authentication": null
  }
}

```

响应结果 `data`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `token` | `String` | APP 登录 token，注册成功后直接用于登录态。 |
| `account` | `String` | APP 登录账号。邮箱注册账号为注册时提交的 `account`，不要求等于手机号。 |
| `email` | `String` | 规范化后的邮箱地址。 |
| `phone` | `String` | 手机号；邮箱注册账号初始为空。 |
| `avatar` | `String` | 头像文件 ID，可能为空。 |
| `nickname` | `String` | 昵称。 |
| `gender` | `Object` | 性别枚举展示对象，可能为空。 |
| `emergencyContacts` | `Array` | 紧急联系人列表，可能为空。 |
| `initPwd` | `Boolean` | 是否初始化了密码。 |
| `webRoleType` | `String` | Web 账号角色；邮箱个人账号为 `PersonalWebAdmin`。 |
| `enterpriseAccount` | `Boolean` | 是否企业账号；邮箱个人账号为 `false`。 |
| `webAccount` | `String` | 对应 Web 账号。邮箱注册个人账号与 `account` 一致。 |
| `level` | `Integer` | 账号级别；个人账号可为空或业务侧设置为 `99`。 |
| `authentication` | `Boolean` | 是否实名，可能为空。 |

### 3. APP 邮箱密码登录

*   方法：`POST`
    
*   路径：`/api/monitor/app-users/email/login`
    
*   认证：不需要登录 token
    
*   Content-Type：`application/json`
    
*   说明：通过邮箱和密码登录个人账号。连续密码错误 3 次后临时锁定 30 分钟。
    

请求 JSON 示例：

```json
{
  "email": "user@example.com",
  "password": "e10adc3949ba59abbe56e057f20f883e"
}

```

请求 body 参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `email` | `String` | 是 | 邮箱地址；后端会去除首尾空格并转小写查询。 |
| `password` | `String` | 是 | 前端提交的密码密文；沿用当前系统约定，传 MD5 后的值。 |

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "token": "eyJhbGciOiJIUzUxMiJ9.xxx",
    "account": "user001",
    "email": "user@example.com",
    "phone": null,
    "webRoleType": "PersonalWebAdmin",
    "enterpriseAccount": false,
    "webAccount": "user001",
    "initPwd": false
  }
}

```

响应结果：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `data` | `AppUserInfoRespDto` | 字段同“APP 邮箱注册”响应。 |

### 4. 发送邮箱找回密码验证码

*   方法：`POST`
    
*   路径：`/api/monitor/ver-codes/retrieve`
    
*   认证：不需要登录 token
    
*   Content-Type：`application/x-www-form-urlencoded` 或 query 参数
    
*   说明：邮箱找回密码前先调用该接口发送验证码，`mode` 必须传 `EMAIL`。
    

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mode` | `String` | 是 | 通知方式；邮箱验证码传 `EMAIL`。 |
| `to` | `String` | 是 | 接收验证码的邮箱地址。 |

请求示例：

```http
POST /api/monitor/ver-codes/retrieve?mode=EMAIL&to=user@example.com

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": null
}

```

响应结果：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `data` | `null` | 发送成功不返回业务数据。 |

### 5. APP 邮箱找回密码

*   方法：`POST`
    
*   路径：`/api/monitor/app-users/email/retrieve-pwd`
    
*   认证：不需要登录 token
    
*   Content-Type：`application/json`
    
*   说明：通过邮箱验证码重置密码；成功后不返回登录 token，需要用户重新登录。
    

请求 JSON 示例：

```json
{
  "email": "user@example.com",
  "code": "123456",
  "password": "e10adc3949ba59abbe56e057f20f883e"
}

```

请求 body 参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `email` | `String` | 是 | 邮箱地址；后端会去除首尾空格并转小写查询。 |
| `code` | `String` | 是 | 邮箱验证码，当前长度为 6 位。验证码类型为 `RETRIEVE_PDW + EMAIL`。 |
| `password` | `String` | 是 | 新密码密文；沿用当前系统约定，传 MD5 后的值。 |

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": null
}

```

响应结果：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `data` | `null` | 重置成功不返回业务数据，不返回 token。 |

## 二、APP 用户信息响应改动

### 1. 获取 APP 用户信息

*   方法：`GET`
    
*   路径：`/api/monitor/app-users/info`
    
*   认证：需要 APP 登录 token
    
*   改动说明：响应 `data` 增加 `email`、`phone` 字段；邮箱注册账号的 `account` 为注册时提交的账号，不再保证等于手机号。
    

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "account": "user001",
    "email": "user@example.com",
    "phone": null,
    "webAccount": "user001",
    "webRoleType": "PersonalWebAdmin",
    "enterpriseAccount": false
  }
}

```

新增/重点响应字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `account` | `String` | APP 登录账号。老手机号账号仍为手机号；邮箱注册账号为注册时提交的 `account`。 |
| `email` | `String` | 邮箱地址；手机号注册账号可能为空。 |
| `phone` | `String` | 手机号；邮箱注册账号可能为空。 |
| `webAccount` | `String` | 对应 Web 账号。邮箱注册个人账号与 `account` 一致。 |

## 三、围栏接口改动

> 本节对应提交 `4137ca7f59a0b8abaa45a2f1b0784fd0f2c33b20` 的圆形围栏和围栏报警规则调整。除特别说明外，认证均为 Web 登录 token（`RoleType.WebUser`）。

### 1. 围栏形状枚举

*   方法：`GET`
    
*   路径：`/api/monitor/enums/enclosure-shape-types`
    
*   认证：按现有枚举接口规则。
    
*   说明：前端创建/编辑围栏时可通过该接口获取形状枚举。
    

请求：无额外参数。

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "name": "POLYGON",
      "value": "多边形"
    },
    {
      "name": "CIRCLE",
      "value": "圆形"
    }
  ]
}

```

响应结果 `data`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | `String` | 枚举名。 |
| `value` | `String` | 中文展示值。 |

### 2. 新增围栏

*   方法：`POST`
    
*   路径：`/api/monitor/enclosures`
    
*   认证：需要 Web 登录 token。
    
*   Content-Type：`application/x-www-form-urlencoded` 或 `multipart/form-data`
    
*   说明：新增圆形围栏参数；旧多边形参数继续兼容。该接口当前不是 JSON body，参数按表单字段提交。
    

多边形请求示例：

```http
POST /api/monitor/enclosures
Content-Type: application/x-www-form-urlencoded

name=测试多边形围栏&shapeType=POLYGON&alarmType=1&pointJson={"points":[{"lng":112.333,"lat":23.4444},{"lng":112.3343,"lat":23.484},{"lng":112.37,"lat":23.45}]}

```

圆形请求示例：

```http
POST /api/monitor/enclosures
Content-Type: application/x-www-form-urlencoded

name=测试圆形围栏&shapeType=CIRCLE&centerLng=112.333&centerLat=23.4444&radiusM=500&alarmType=2

```

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | `String` | 是 | 围栏名称，最长 30 个字符。 |
| `shapeType` | `String` | 否 | 围栏形状：`POLYGON` 多边形，`CIRCLE` 圆形；为空时按 `POLYGON` 处理。 |
| `pointJson` | `String` | 多边形需要 | 多边形点位 JSON 字符串，格式见示例；点位坐标沿用历史逻辑，传 GCJ-02 坐标。圆形围栏不传。 |
| `centerLng` | `Number` | 圆形必填 | 圆形围栏中心经度，WGS84 坐标系，范围 `-180`～`180`。 |
| `centerLat` | `Number` | 圆形必填 | 圆形围栏中心纬度，WGS84 坐标系，范围 `-90`～`90`。 |
| `radiusM` | `Integer` | 圆形必填 | 圆形围栏半径，单位：米，必须大于 `0`。 |
| `alarmType` | `Integer` | 圆形必填；多边形选填 | 报警规则：`0` 关闭，`1` 离开围栏报警，`2` 进入围栏报警。多边形不传时默认 `0`；圆形必须传。 |

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "64f000000000000000000001",
    "name": "测试圆形围栏",
    "shareCode": "ABC123",

    "terminals": [],


    "points": [],

    "shapeType": "CIRCLE",
    "centerLng": 112.333,
    "centerLat": 23.4444,
    "gcj02CenterLng": 112.3382,
    "gcj02CenterLat": 23.4417,
    "radiusM": 500,
    "alarmType": 2
  }
}

```

响应结果 `data`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `String` | 围栏 ID。 |
| `name` | `String` | 围栏名称。 |
| `shareCode` | `String` | 分享码，可用于“通过分享码添加围栏”。 |
| `terminals` | `Array<TerminalBaseRespDto>` | 围栏绑定设备列表；新增接口返回时通常为空数组。 |
| `points` | `Array<EnclosurePointRespDto>` | 多边形点位列表；圆形围栏为空数组。 |
| `points[].lng` | `Number` | 多边形点经度，GCJ-02 坐标系。 |
| `points[].lat` | `Number` | 多边形点纬度，GCJ-02 坐标系。 |
| `points[].wgs84Lng` | `Number` | 多边形点经度，WGS84 坐标系。 |
| `points[].wgs84Lat` | `Number` | 多边形点纬度，WGS84 坐标系。 |
| `shapeType` | `String` | 围栏形状：`POLYGON` 或 `CIRCLE`。历史数据没有该字段时，有点位则返回 `POLYGON`，没有点位可能返回 `null`。 |
| `centerLng` | `Number` | 圆形中心经度，WGS84 坐标系；多边形为 `null`。 |
| `centerLat` | `Number` | 圆形中心纬度，WGS84 坐标系；多边形为 `null`。 |
| `gcj02CenterLng` | `Number` | 圆形中心经度，GCJ-02 坐标系，用于国内地图展示；多边形为 `null`。 |
| `gcj02CenterLat` | `Number` | 圆形中心纬度，GCJ-02 坐标系，用于国内地图展示；多边形为 `null`。 |
| `radiusM` | `Integer` | 圆形半径，单位：米；多边形为 `null`。 |
| `alarmType` | `Integer` | 报警规则：`0` 关闭，`1` 离开围栏报警，`2` 进入围栏报警。 |

### 3. 编辑围栏

*   方法：`PUT`
    
*   路径：`/api/monitor/enclosures/{id}`
    
*   认证：需要 Web 登录 token。
    
*   Content-Type：`application/json`
    
*   说明：编辑接口使用 JSON body。切换为圆形时传 `shapeType=CIRCLE`、`centerLng`、`centerLat`、`radiusM`、`alarmType`；切换为多边形时传 `shapeType=POLYGON` 和 `pointJson`。
    

路径参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 围栏 ID。 |

圆形请求 JSON 示例：

```json
{
  "name": "修改后的圆形围栏",
  "shapeType": "CIRCLE",
  "centerLng": 112.333,
  "centerLat": 23.4444,
  "radiusM": 800,
  "alarmType": 1
}

```

多边形请求 JSON 示例：

```json
{
  "name": "修改后的多边形围栏",
  "shapeType": "POLYGON",
  "pointJson": "{\"points\":[{\"lng\":112.333,\"lat\":23.4444},{\"lng\":112.3343,\"lat\":23.484},{\"lng\":112.37,\"lat\":23.45}]}",
  "alarmType": 2
}

```

请求 body 参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | `String` | 是 | 围栏名称，最长 30 个字符。 |
| `shapeType` | `String` | 否 | 围栏形状：`POLYGON` 多边形，`CIRCLE` 圆形；为空时按 `POLYGON` 处理。 |
| `pointJson` | `String` | 多边形需要 | 多边形点位 JSON 字符串。编辑为多边形时会清空圆形中心和半径字段。 |
| `centerLng` | `Number` | 圆形必填 | 圆形围栏中心经度，WGS84 坐标系。 |
| `centerLat` | `Number` | 圆形必填 | 圆形围栏中心纬度，WGS84 坐标系。 |
| `radiusM` | `Integer` | 圆形必填 | 圆形围栏半径，单位：米，必须大于 `0`。 |
| `alarmType` | `Integer` | 圆形必填；多边形选填 | 报警规则：`0` 关闭，`1` 离开围栏报警，`2` 进入围栏报警。多边形不传时默认 `0`。 |

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "64f000000000000000000001",
    "name": "修改后的圆形围栏",
    "shareCode": "ABC123",
    "terminals": [
      {
        "addr": "8800000015",
        "remark": "GT-C-001",
        "type": "CATTLE_SHEEP_LOCATOR",
        "onlineFlag": "ON"
      }
    ],

    "points": [],

    "shapeType": "CIRCLE",
    "centerLng": 112.333,
    "centerLat": 23.4444,
    "gcj02CenterLng": 112.3382,
    "gcj02CenterLat": 23.4417,
    "radiusM": 800,
    "alarmType": 1
  }
}

```

响应结果 `data`：字段同“新增围栏”响应结果 `data`。

### 4. 获取围栏列表

*   方法：`GET`
    
*   路径：`/api/monitor/enclosures`
    
*   认证：需要 Web 登录 token。
    
*   说明：列表项新增 `shapeType`、`centerLng`、`centerLat`、`gcj02CenterLng`、`gcj02CenterLat`、`radiusM`、`alarmType`。`terminals` 返回围栏已绑定设备。
    

请求：无额外参数。

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "id": "64f000000000000000000001",
      "name": "测试圆形围栏",
      "shareCode": "ABC123",

      "terminals": [],


      "points": [],

      "shapeType": "CIRCLE",
      "centerLng": 112.333,
      "centerLat": 23.4444,
      "gcj02CenterLng": 112.3382,
      "gcj02CenterLat": 23.4417,
      "radiusM": 500,
      "alarmType": 2
    },
    {
      "id": "64f000000000000000000002",
      "name": "测试多边形围栏",
      "shareCode": "DEF456",

      "terminals": [],

      "points": [
        {
          "lng": 112.333,
          "lat": 23.4444,
          "wgs84Lng": 112.3278,
          "wgs84Lat": 23.4471
        }
      ],
      "shapeType": "POLYGON",
      "centerLng": null,
      "centerLat": null,
      "gcj02CenterLng": null,
      "gcj02CenterLat": null,
      "radiusM": null,
      "alarmType": 1
    }
  ]
}

```

响应结果 `data[]`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `String` | 围栏 ID。 |
| `name` | `String` | 围栏名称。 |
| `shareCode` | `String` | 分享码。 |
| `terminals` | `Array<TerminalBaseRespDto>` | 围栏已绑定设备列表。 |
| `points` | `Array<EnclosurePointRespDto>` | 多边形点位列表；圆形围栏为空数组。 |
| `shapeType` | `String` | 围栏形状：`POLYGON` 或 `CIRCLE`。 |
| `centerLng` | `Number` | 圆形中心经度，WGS84 坐标系；多边形为 `null`。 |
| `centerLat` | `Number` | 圆形中心纬度，WGS84 坐标系；多边形为 `null`。 |
| `gcj02CenterLng` | `Number` | 圆形中心经度，GCJ-02 坐标系；多边形为 `null`。 |
| `gcj02CenterLat` | `Number` | 圆形中心纬度，GCJ-02 坐标系；多边形为 `null`。 |
| `radiusM` | `Integer` | 圆形半径，单位：米；多边形为 `null`。 |
| `alarmType` | `Integer` | 报警规则：`0` 关闭，`1` 离开围栏报警，`2` 进入围栏报警。 |

### 5. 通过分享码添加围栏

*   方法：`POST`
    
*   路径：`/api/monitor/enclosures/codes/{shareCode}`
    
*   认证：需要 Web 登录 token。
    
*   说明：通过其他围栏的分享码创建一个新围栏。提交 `4137ca7` 后，圆形围栏的形状、圆心、半径和报警规则会一起复制。
    

路径参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `shareCode` | `String` | 是 | 被分享围栏的分享码。 |

请求示例：

```http
POST /api/monitor/enclosures/codes/ABC123

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "64f000000000000000000003",
    "name": "测试圆形围栏",
    "shareCode": "NEW1234567",

    "terminals": [],


    "points": [],

    "shapeType": "CIRCLE",
    "centerLng": 112.333,
    "centerLat": 23.4444,
    "gcj02CenterLng": 112.3382,
    "gcj02CenterLat": 23.4417,
    "radiusM": 500,
    "alarmType": 2
  }
}

```

响应结果 `data`：字段同“新增围栏”响应结果 `data`。

### 6. 导出围栏 KML

*   方法：`GET`
    
*   路径：`/api/monitor/enclosures/{id}/export`
    
*   认证：访客权限接口，按现有导出接口规则。
    
*   说明：导出围栏 KML。提交 `4137ca7` 后，圆形围栏会按圆心和半径生成 64 个周边点，并追加首点闭合；多边形继续按围栏点导出。
    

路径参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 围栏 ID。 |

请求示例：

```http
GET /api/monitor/enclosures/64f000000000000000000001/export

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": null
}

```

响应结果：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `data` | `null` | KML 文件通过 `HttpServletResponse` 输出，业务响应体无额外数据。 |

### 7. 围栏报警触发规则

前端只需要按 `alarmType` 传值，后端根据设备位置和围栏几何关系判断是否生成 `ENCLOSURE_ALARM`。

`alarmType` 取值：

| 值 | 含义 | 触发条件 |
| --- | --- | --- |
| `0` | 关闭围栏报警 | 不触发报警。 |
| `1` | 离开围栏报警 | 设备当前位置在围栏外时触发。 |
| `2` | 进入围栏报警 | 设备当前位置在围栏内时触发。 |

报警内容示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "alarmType": {
      "name": "ENCLOSURE_ALARM",
      "value": "围栏报警"
    },
    "content": "enclosure.alarm.leave",
    "enclosureName": "测试圆形围栏",
    "alarmTimeStr": "2026-09-02 11:48:56"
  }
}

```

报警字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `alarmType.name` | `String` | 围栏报警固定为 `ENCLOSURE_ALARM`。 |
| `content` | `String` | 后端内部先保存 i18n key：`enclosure.alarm.leave` 或 `enclosure.alarm.enter`；展示层按现有告警接口逻辑翻译。 |
| `enclosureName` | `String` | 命中的围栏名称。 |
| `alarmTimeStr` | `String` | 告警时间；批量位置上报时使用命中位置的定位时间。 |

兼容与计算规则：

| 场景 | 规则 |
| --- | --- |
| 历史围栏没有 `shapeType` | 有多边形点位时，返回和计算时按 `POLYGON` 处理；没有点位时形状可能为 `null`。 |
| 圆形围栏 | 使用 WGS84 圆心和设备 WGS84 位置计算距离；距离小于等于 `radiusM` 视为在围栏内。 |
| 多边形围栏 | 多边形点位缓存为 GCJ-02；设备 WGS84 位置会先转 GCJ-02 再判断是否在多边形内。 |
| 批量位置上报 | 本次上报的每个位置都会参与围栏报警判断，可能生成多条围栏报警。 |
| 无效圆形几何 | 缺少 `centerLng`、`centerLat`、`radiusM` 或半径小于等于 `0` 时，不加载到围栏报警缓存。 |
| 无效多边形几何 | 点位少于 3 个时，不加载到围栏报警缓存。 |

### 8. 添加设备到围栏后重新加载报警缓存

*   方法：`PUT`
    
*   路径：`/api/monitor/enclosures/{id}/terminals`
    
*   认证：需要 Web 登录 token。
    
*   Content-Type：`application/json`
    
*   说明：接口路径未变。提交 `4137ca7` 后，设备绑定变更会按新几何缓存结构重新加载围栏，圆形和多边形都支持。
    

请求 JSON 示例：

```json
{
  "addrs": "8800000015,8800000016"
}

```

请求 body 参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `addrs` | `String` | 否 | 要绑定到围栏的设备地址，多个地址用英文逗号分隔；中文逗号后端会替换为英文逗号。为空时表示清空当前账号权限范围内该围栏的设备绑定。 |

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "addr": "8800000015",
      "remark": "GT-C-001",
      "type": "CATTLE_SHEEP_LOCATOR",
      "onlineFlag": "ON"
    }
  ]
}

```

响应结果 `data[]`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `addr` | `String` | 设备地址。 |
| `remark` | `String` | 设备备注。 |
| `type` | `String` | 设备类型枚举名。 |
| `onlineFlag` | `String` | 在线状态，如 `ON` / `OFF` / `UNKNOWN`。 |

## 四、Web 用户绑定接口行为改动

### 1. 绑定手机号

*   方法：`PUT`
    
*   路径：`/api/monitor/web-users/phone`
    
*   认证：需要 Web 登录 token
    
*   Content-Type：`application/x-www-form-urlencoded` 或 query 参数
    
*   改动说明：手机号改为系统全局唯一。新手机号已被任意未删除 Web 账号使用时，直接拒绝；不再自动解绑其他账号。
    

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mode` | `String` | 是 | 验证方式：`SHORT_MSG` 或 `EMAIL`。 |
| `code` | `String` | 是 | 验证码，当前长度为 6 位。 |
| `phone` | `String` | 是 | 新手机号。系统内全局唯一。 |

响应结果：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `data` | `null` | 绑定成功不返回业务数据。 |

### 2. 绑定邮箱

*   方法：`PUT`
    
*   路径：`/api/monitor/web-users/email`
    
*   认证：需要 Web 登录 token
    
*   Content-Type：`application/x-www-form-urlencoded` 或 query 参数
    
*   改动说明：邮箱改为系统全局唯一，并统一按 trim + 小写保存。新邮箱已被任意未删除 Web 账号使用时，直接拒绝。
    

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mode` | `String` | 是 | 验证方式：`SHORT_MSG` 或 `EMAIL`。 |
| `code` | `String` | 是 | 验证码，当前长度为 6 位。 |
| `email` | `String` | 是 | 新邮箱。后端会去除首尾空格并转小写保存，系统内全局唯一。 |

响应结果：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `data` | `null` | 绑定成功不返回业务数据。 |

## 五、设备编辑联系人字段

### 1. 编辑设备

*   方法：`PUT`
    
*   路径：`/api/monitor/groups/{groupId}/terminals`
    
*   认证：需要 Web 登录 token；APP 使用个人 Web 账号登录态时也走该平台设备编辑接口。
    
*   Content-Type：`application/json`
    
*   说明：设备编辑新增 `contactName`、`contactPhone` 两个字段，保存到 `c_terminal_info`。字段传 `null` 或不传时后端不更新原值；如需清空可传空字符串。
    

请求 JSON 示例：

```json
{
  "addr": "8800000015",
  "useScope": "PERSONNEL",
  "remark": "GT-C-001",
  "contactName": "张三",
  "contactPhone": "13800138000",

  "fieldJson": "{\"fields\":[]}",

  "trackColor": "#141323",
  "trackSize": 5
}

```

请求 body 参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `addr` | `String` | 是 | 设备地址/卡号。 |
| `useScope` | `String` | 是 | 设备使用范围枚举名。 |
| `remark` | `String` | 否 | 设备备注。 |
| `contactName` | `String` | 否 | 设备联系人；为 `null` 或不传时不更新原值。 |
| `contactPhone` | `String` | 否 | 设备联系电话；为 `null` 或不传时不更新原值。 |
| `fieldJson` | `String` | 否 | 自定义字段 JSON 字符串，格式：`{"fields":[{"name":"船名","value":"救援123"}]}`。 |
| `trackColor` | `String` | 否 | 轨迹颜色，如 `#141323`。 |
| `trackSize` | `Integer` | 否 | 轨迹粗细，`1`～`30`，默认 `5`。 |
| `multimedia` | `Object` | 否 | 运行时多媒体配置，按现有设备编辑逻辑传。 |

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "addr": "8800000015",
    "remark": "GT-C-001",
    "contactName": "张三",
    "contactPhone": "13800138000",
    "scope": "PERSONNEL",
    "type": "CATTLE_SHEEP_LOCATOR",
    "follow": false,
    "lastCommTime": 1725775201000,
    "status": "ON",
    "onlineFlag": "ON",
    "trackColor": "#141323",
    "trackSize": 5,

    "fields": [ ]

  }
}

```

响应结果 `data` 新增字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `contactName` | `String` | 设备联系人，可能为空。 |
| `contactPhone` | `String` | 设备联系电话，可能为空。 |

补充说明：

| 场景 | 规则 |
| --- | --- |
| `contactName=null` 或未传 | 不修改原联系人。 |
| `contactPhone=null` 或未传 | 不修改原联系电话。 |
| `contactName=""` | 覆盖为空字符串，可用于清空联系人。 |
| `contactPhone=""` | 覆盖为空字符串，可用于清空联系电话。 |
| 获取设备详情/批量详情/基础设备列表 | 响应中同步回传 `contactName`、`contactPhone`。 |

## 六、后续待补充接口

后续如果继续新增接口，在这里按同样格式追加：

| 接口 | 状态 | 备注 |
| --- | --- | --- |
| S10U 牛羊定位器指令下发 | 已完成 | 见「八、S10U 牛羊定位器指令下发接口」。 |
| APP 首页设备总览与轨迹日历 | 已完成 | 见「九、APP 首页设备总览与轨迹日历接口」。 |
| 待补充 | 未开始 | 新接口完成后追加路径、参数表、JSON 示例、响应字段表。 |

## 七、Web 用户邮箱登录接口

### 1. Web 邮箱密码登录

*   方法：`POST`
    
*   路径：`/api/monitor/web-user/email/login`
    
*   认证：不需要登录 token
    
*   Content-Type：`application/x-www-form-urlencoded` 或 query 参数
    
*   说明：Web 用户使用邮箱、密码和现有图片验证码登录；不使用邮箱验证码。连续密码错误 3 次后按邮箱维度临时锁定 30 分钟。
    

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `loginType` | `String` | 否 | 登录类型：`personal` 个人账号，`enterprise` 企业账号；不传表示不区分个人或企业。 |
| `email` | `String` | 是 | 邮箱地址；后端会去除首尾空格并转小写后查询。 |
| `password` | `String` | 是 | 前端提交的密码密文；沿用当前系统约定，传 MD5 后的值。 |
| `captchaId` | `String` | 是 | 生成图片验证码时传入的唯一标识。 |
| `captcha` | `String` | 是 | 用户输入的图片验证码内容。 |

请求示例：

```http
POST /api/monitor/web-user/email/login
Content-Type: application/x-www-form-urlencoded

loginType=enterprise&email=admin@example.com&password=e10adc3949ba59abbe56e057f20f883e&captchaId=login-captcha-001&captcha=8x3k

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "token": "eyJhbGciOiJIUzUxMiJ9.xxx",
    "account": "web001",
    "name": "企业管理员",
    "email": "admin@example.com",
    "phone": "13800138000",
    "avatar": null,
    "platformLogo": null,
    "platformName": "监控平台",
    "role": {
      "name": "WebAdmin",
      "value": "Web管理员"
    },
    "mapId": null
  }
}

```

响应结果 `data`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `token` | `String` | Web 登录 token，后续 Web 接口放入现有登录态请求头。 |
| `account` | `String` | Web 用户账号；邮箱登录不要求账号等于邮箱。 |
| `email` | `String` | Web 用户绑定邮箱。 |
| `name` | `String` | Web 用户名称。 |
| `phone` | `String` | Web 用户绑定手机号，可能为空。 |
| `avatar` | `String` | 头像文件 ID，可能为空。 |
| `platformLogo` | `String` | 平台 LOGO 文件 ID，可能为空。 |
| `platformName` | `String` | 平台名称，可能为空。 |
| `role` | `Object` | Web 用户角色展示对象，通常包含 `name` 和 `value`。 |
| `mapId` | `String` | 上次使用的地图 ID，可能为空。 |

## 八、S10U 牛羊定位器指令下发接口

适用终端类型：`CATTLE_SHEEP_LOCATOR`（牛羊定位器，S10U 协议）。

*   路径前缀：`/api/monitor/s10u/codes`
    
*   认证：需要 Web 登录 token（`RoleType.WebUser`）
    
*   Content-Type：`application/json`（POST 接口）
    
*   说明：
    
    *   平台提交新指令前先校验设备在线状态；设备离线时直接返回 `overallStatus=REJECTED`，不进入待发队列，也不调用网关。
        
    *   在线受理后返回 `overallStatus=QUEUED`，最近一次投递状态由 `latestAttemptStatus` 表示。设备 ACK / 30 秒超时等状态会异步更新，前端可轮询列表接口。
        
    *   **批量下发**：请求字段为 `addrs`（字符串集合）。后端按设备独立处理；部分设备离线时仅该设备记录为 `REJECTED`，不影响其他在线设备。
        
    *   单设备也传集合，例如 `"addrs": ["8800000015"]`。重复地址会被去重。
        
    *   `UPLOAD.interval` 和 `SUPPER_POWER.interval` 入参单位仍为**秒**，APP 直接传秒。
        
    *   配置类指令（`UPLOAD`、`ZONE`、`SUPPER_POWER`、`KEYTO`、`BATTERY`、`LED`、`M_SENSITIVITY`）按同设备同配置项覆盖旧 `QUEUED` 记录，旧记录变为 `CANCELLED`。
        
    *   高风险指令（`POWEROFF`、`FACTORY`）30 秒未收到 ACK 后变为 `CANCELLED`，不再补发；其他可补发指令保留 30 天，设备 LK 上线后由网关补发最近一次 `TIMEOUT` 记录。
        

### 0. 通用枚举与响应结构

#### 指令类型 `commandType`

| 枚举名 | 说明 |
| --- | --- |
| `UPLOAD` | 上传间隔设置 |
| `ZONE` | 时区设置 |
| `VERNO` | 版本查询 |
| `CR` | 立即定位 |
| `POWEROFF` | 关机 |
| `RESET` | 重启 |
| `FIND` | 找设备（响铃） |
| `FACTORY` | 恢复出厂设置 |
| `SUPPER_POWER` | 超长待机模式 |
| `KEYTO` | 开关机方式 |
| `BATTERY` | 高压普压 |
| `LED` | 灯效 |
| `M_SENSITIVITY` | 运动灵敏度 |

#### 整体状态 `overallStatus`

| 枚举名 | 说明 |
| --- | --- |
| `QUEUED` | 已受理，等待确认或后续补发 |
| `COMPLETED` | 设备已确认 |
| `REJECTED` | 已拒绝，如设备离线或网关发送失败 |
| `CANCELLED` | 已取消，如用户取消、配置覆盖或高风险超时 |
| `EXPIRED` | 30 天保留期到期 |

#### 最近一次投递状态 `latestAttemptStatus`

| 枚举名 | 说明 |
| --- | --- |
| `NOT_SENT` | 已建记录，尚未投递 |
| `SENT` | 已投递，等待 ACK |
| `ACKED` | 最近一次投递已收到设备回复 |
| `TIMEOUT` | 最近一次投递 30 秒未收到 ACK |

#### 指令记录元素 `S10UCodeRespDto`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `String` | 指令记录 ID；取消接口使用该值。 |
| `account` | `String` | 下发账号。 |
| `addr` | `String` | 单条记录对应的设备地址。 |
| `commandType` | `Object` | 指令类型展示对象，通常含 `name`、`value`。 |
| `commandContent` | `String` | 发往网关的完整指令，如 `UPLOAD,600`。 |
| `commandParams` | `String` | 原始参数 JSON，无参数指令可能为 `null`。 |
| `overallStatus` | `Object` | 整体状态展示对象，通常含 `name`、`value`。 |
| `latestAttemptStatus` | `Object` | 最近一次投递状态展示对象；`REJECTED` 时通常为 `null`。 |
| `cancelReason` | `String` | 取消原因，`CANCELLED` 时有值。 |
| `retryable` | `Boolean` | 是否允许 30 天内补发。 |
| `attemptCount` | `Integer` | 已尝试投递次数。 |
| `gatewayOnline` | `Boolean` | 调用网关时设备是否在线。 |
| `gatewaySent` | `Boolean` | 网关是否已真正发出。 |
| `gatewayChannelId` | `String` | 网关通道 ID，可能为空。 |
| `gatewayMessage` | `String` | 网关返回信息，可能为空。 |
| `terminalAck` | `String` | 终端 ACK 内容，ACK 前通常为空。 |
| `createdTimeStr` | `String` | 创建时间。 |
| `sendTimeStr` | `String` | 发送时间，可能为空。 |
| `ackTimeStr` | `String` | ACK 时间，可能为空。 |
| `expireTimeStr` | `String` | 过期时间；高风险或拒绝记录可能为空。 |

> 下发类接口响应 `data` 为 `**S10UCodeRespDto**` **数组**；取消接口 `data` 为单个对象；列表接口 `data` 为分页对象。

### 1. 设置上传间隔

*   方法：`POST`
    
*   路径：`/api/monitor/s10u/codes/upload`
    

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `addrs` | `Set<String>` | 是 | 设备地址集合，至少一个，自动去重。 |
| `interval` | `Integer` | 是 | 上传间隔（秒），范围 `10`～`86400`。 |

请求 JSON 示例：

```json
{
  "addrs": ["8800000015", "8800000016"],
  "interval": 600
}

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "id": "66dd0f2a1c2b3a4e5f678901",
      "account": "web001",
      "addr": "8800000015",
      "commandType": { "name": "UPLOAD", "value": "上传间隔设置" },
      "commandContent": "UPLOAD,600",
      "commandParams": "{\"interval\":600}",
      "overallStatus": { "name": "QUEUED", "value": "已受理" },
      "latestAttemptStatus": { "name": "SENT", "value": "等待回复" },
      "cancelReason": null,
      "retryable": true,
      "attemptCount": 1,
      "gatewayOnline": true,
      "gatewaySent": true,
      "gatewayChannelId": "ch1",
      "gatewayMessage": "OK",
      "terminalAck": null,
      "createdTimeStr": "2026-09-08 14:00:00",
      "sendTimeStr": "2026-09-08 14:00:01",
      "ackTimeStr": null,
      "expireTimeStr": "2026-10-08 14:00:00"
    },
    {
      "id": "66dd0f2a1c2b3a4e5f678902",
      "account": "web001",
      "addr": "8800000016",
      "commandType": { "name": "UPLOAD", "value": "上传间隔设置" },
      "commandContent": "UPLOAD,600",
      "commandParams": "{\"interval\":600}",
      "overallStatus": { "name": "REJECTED", "value": "已拒绝" },
      "latestAttemptStatus": null,
      "cancelReason": null,
      "retryable": false,
      "attemptCount": 0,
      "gatewayOnline": false,
      "gatewaySent": false,
      "gatewayChannelId": null,
      "gatewayMessage": "设备离线，无法下发指令",
      "terminalAck": null,
      "createdTimeStr": "2026-09-08 14:00:00",
      "sendTimeStr": null,
      "ackTimeStr": null,
      "expireTimeStr": null
    }
  ]
}

```

### 2. 设置时区

*   方法：`POST`
    
*   路径：`/api/monitor/s10u/codes/zone`
    

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `addrs` | `Set<String>` | 是 | 设备地址集合。 |
| `zone` | `Integer` | 是 | 时区，范围 `-12`～`12`。 |

请求 JSON 示例：

```json
{
  "addrs": ["8800000015"],
  "zone": 8
}

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "id": "66dd0f2a1c2b3a4e5f678903",
      "account": "web001",
      "addr": "8800000015",
      "commandType": { "name": "ZONE", "value": "时区设置" },
      "commandContent": "ZONE,8",
      "commandParams": "{\"zone\":8}",
      "overallStatus": { "name": "QUEUED", "value": "已受理" },
      "latestAttemptStatus": { "name": "SENT", "value": "等待回复" },
      "cancelReason": null,
      "retryable": true,
      "attemptCount": 1,
      "gatewayOnline": true,
      "gatewaySent": true,
      "gatewayChannelId": "ch1",
      "gatewayMessage": "OK",
      "terminalAck": null,
      "createdTimeStr": "2026-09-08 14:01:00",
      "sendTimeStr": "2026-09-08 14:01:01",
      "ackTimeStr": null,
      "expireTimeStr": "2026-10-08 14:01:00"
    }
  ]
}

```

### 3. 仅设备地址类指令

以下 6 个接口请求体相同，仅路径不同；响应均为 `S10UCodeRespDto` 数组。

| 接口说明 | 方法 | 路径 |
| --- | --- | --- |
| 查询版本 | `POST` | `/api/monitor/s10u/codes/verno` |
| 立即定位 | `POST` | `/api/monitor/s10u/codes/cr` |
| 关机 | `POST` | `/api/monitor/s10u/codes/poweroff` |
| 重启 | `POST` | `/api/monitor/s10u/codes/reset` |
| 找设备（响铃） | `POST` | `/api/monitor/s10u/codes/find` |
| 恢复出厂设置 | `POST` | `/api/monitor/s10u/codes/factory` |

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `addrs` | `Set<String>` | 是 | 设备地址集合。 |

请求 JSON 示例：

```json
{
  "addrs": ["8800000015", "8800000016"]
}

```

响应 JSON 示例（以立即定位 `/cr` 为例）：

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "id": "66dd0f2a1c2b3a4e5f678904",
      "account": "web001",
      "addr": "8800000015",
      "commandType": { "name": "CR", "value": "立即定位" },
      "commandContent": "CR",
      "commandParams": null,
      "overallStatus": { "name": "QUEUED", "value": "已受理" },
      "latestAttemptStatus": { "name": "SENT", "value": "等待回复" },
      "cancelReason": null,
      "retryable": true,
      "attemptCount": 1,
      "gatewayOnline": true,
      "gatewaySent": true,
      "gatewayChannelId": "ch1",
      "gatewayMessage": "OK",
      "terminalAck": null,
      "createdTimeStr": "2026-09-08 14:02:00",
      "sendTimeStr": "2026-09-08 14:02:01",
      "ackTimeStr": null,
      "expireTimeStr": "2026-10-08 14:02:00"
    },
    {
      "id": "66dd0f2a1c2b3a4e5f678905",
      "account": "web001",
      "addr": "8800000016",
      "commandType": { "name": "CR", "value": "立即定位" },
      "commandContent": "CR",
      "commandParams": null,
      "overallStatus": { "name": "QUEUED", "value": "已受理" },
      "latestAttemptStatus": { "name": "SENT", "value": "等待回复" },
      "cancelReason": null,
      "retryable": true,
      "attemptCount": 1,
      "gatewayOnline": true,
      "gatewaySent": true,
      "gatewayChannelId": "ch2",
      "gatewayMessage": "OK",
      "terminalAck": null,
      "createdTimeStr": "2026-09-08 14:02:00",
      "sendTimeStr": "2026-09-08 14:02:01",
      "ackTimeStr": null,
      "expireTimeStr": "2026-10-08 14:02:00"
    }
  ]
}

```

### 4. 超长待机模式

*   方法：`POST`
    
*   路径：`/api/monitor/s10u/codes/supper-power`
    

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `addrs` | `Set<String>` | 是 | 设备地址集合。 |
| `enable` | `Integer` | 是 | `0` 关闭，`1` 开启。 |
| `interval` | `Integer` | 条件必填 | 定位间隔（秒），范围 `60`～`86400`。`enable=0` 时可省略；`enable=1` 时应传入。 |

请求 JSON 示例：

```json
{
  "addrs": ["8800000015"],
  "enable": 1,
  "interval": 3100
}

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "id": "66dd0f2a1c2b3a4e5f678906",
      "account": "web001",
      "addr": "8800000015",
      "commandType": { "name": "SUPPER_POWER", "value": "超长待机模式" },
      "commandContent": "SUPPER_POWER,1,3100",
      "commandParams": "{\"enable\":1,\"interval\":3100}",
      "overallStatus": { "name": "QUEUED", "value": "已受理" },
      "latestAttemptStatus": { "name": "SENT", "value": "等待回复" },
      "cancelReason": null,
      "retryable": true,
      "attemptCount": 1,
      "gatewayOnline": true,
      "gatewaySent": true,
      "gatewayChannelId": "ch1",
      "gatewayMessage": "OK",
      "terminalAck": null,
      "createdTimeStr": "2026-09-08 14:03:00",
      "sendTimeStr": "2026-09-08 14:03:01",
      "ackTimeStr": null,
      "expireTimeStr": "2026-10-08 14:03:00"
    }
  ]
}

```

### 5. 开关机方式

*   方法：`POST`
    
*   路径：`/api/monitor/s10u/codes/keyto`
    

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `addrs` | `Set<String>` | 是 | 设备地址集合。 |
| `mode` | `Integer` | 是 | 模式，`0` 或 `1`（按协议约定）。 |

请求 JSON 示例：

```json
{
  "addrs": ["8800000015"],
  "mode": 1
}

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "id": "66dd0f2a1c2b3a4e5f678907",
      "account": "web001",
      "addr": "8800000015",
      "commandType": { "name": "KEYTO", "value": "开关机方式" },
      "commandContent": "KEYTO,1",
      "commandParams": "{\"mode\":1}",
      "overallStatus": { "name": "QUEUED", "value": "已受理" },
      "latestAttemptStatus": { "name": "SENT", "value": "等待回复" },
      "cancelReason": null,
      "retryable": true,
      "attemptCount": 1,
      "gatewayOnline": true,
      "gatewaySent": true,
      "gatewayChannelId": "ch1",
      "gatewayMessage": "OK",
      "terminalAck": null,
      "createdTimeStr": "2026-09-08 14:04:00",
      "sendTimeStr": "2026-09-08 14:04:01",
      "ackTimeStr": null,
      "expireTimeStr": "2026-10-08 14:04:00"
    }
  ]
}

```

### 6. 高压普压设置

*   方法：`POST`
    
*   路径：`/api/monitor/s10u/codes/battery`
    

请求参数：同「5. 开关机方式」。响应结构同「5」。

### 7. 灯效设置

*   方法：`POST`
    
*   路径：`/api/monitor/s10u/codes/led`
    

请求参数：同「5. 开关机方式」。响应结构同「5」。

### 8. 运动灵敏度设置

*   方法：`POST`
    
*   路径：`/api/monitor/s10u/codes/sensitivity`
    

请求参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `addrs` | `Set<String>` | 是 | 设备地址集合。 |
| `seconds` | `Integer` | 是 | 持续震动秒数（灵敏度），范围 `1`～`30`。 |

请求 JSON 示例：

```json
{
  "addrs": ["8800000015"],
  "seconds": 3
}

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "id": "66dd0f2a1c2b3a4e5f678908",
      "account": "web001",
      "addr": "8800000015",
      "commandType": { "name": "M_SENSITIVITY", "value": "运动灵敏度" },
      "commandContent": "mSensitivity,3",
      "commandParams": "{\"seconds\":3}",
      "overallStatus": { "name": "QUEUED", "value": "已受理" },
      "latestAttemptStatus": { "name": "SENT", "value": "等待回复" },
      "cancelReason": null,
      "retryable": true,
      "attemptCount": 1,
      "gatewayOnline": true,
      "gatewaySent": true,
      "gatewayChannelId": "ch1",
      "gatewayMessage": "OK",
      "terminalAck": null,
      "createdTimeStr": "2026-09-08 14:05:00",
      "sendTimeStr": "2026-09-08 14:05:01",
      "ackTimeStr": null,
      "expireTimeStr": "2026-10-08 14:05:00"
    }
  ]
}

```

### 9. 分页查询指令记录

*   方法：`GET`
    
*   路径：`/api/monitor/s10u/codes`
    
*   说明：仅返回当前登录账号下的指令记录，按创建时间倒序。
    

Query 参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `addr` | `String` | 否 | 设备地址模糊过滤。 |
| `overallStatus` | `String` | 否 | 整体状态枚举名，如 `QUEUED`、`COMPLETED`、`REJECTED`、`CANCELLED`、`EXPIRED`。 |
| `commandType` | `String` | 否 | 指令类型枚举名，如 `UPLOAD`、`CR`。 |
| `page` | `Integer` | 否 | 页码，从 `1` 开始，默认 `1`。 |
| `pageSize` | `Integer` | 否 | 每页条数，默认 `100`。 |

请求示例：

```http
GET /api/monitor/s10u/codes?addr=8800000015&overallStatus=QUEUED&page=1&pageSize=20

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total": 1,
    "totalPage": 1,
    "items": [
      {
        "id": "66dd0f2a1c2b3a4e5f678902",
        "account": "web001",
        "addr": "8800000016",
        "commandType": { "name": "UPLOAD", "value": "上传间隔设置" },
        "commandContent": "UPLOAD,600",
        "commandParams": "{\"interval\":600}",
        "overallStatus": { "name": "QUEUED", "value": "已受理" },
        "latestAttemptStatus": { "name": "TIMEOUT", "value": "本次超时" },
        "cancelReason": null,
        "retryable": true,
        "attemptCount": 1,
        "gatewayOnline": true,
        "gatewaySent": true,
        "gatewayChannelId": null,
        "gatewayMessage": "ACK timeout",
        "terminalAck": null,
        "createdTimeStr": "2026-09-08 14:00:00",
        "sendTimeStr": "2026-09-08 14:00:01",
        "ackTimeStr": null,
        "expireTimeStr": "2026-10-08 14:00:00"
      }
    ]
  }
}

```

### 10. 取消已受理指令

*   方法：`DELETE`
    
*   路径：`/api/monitor/s10u/codes/{id}`
    
*   说明：仅 `overallStatus=QUEUED` 的指令可取消；取消后整体状态为 `CANCELLED`，`cancelReason=用户主动取消`。批量下发产生的多条记录需按各自 `id` 分别取消。
    

路径参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 指令记录 ID。 |

请求示例：

```http
DELETE /api/monitor/s10u/codes/66dd0f2a1c2b3a4e5f678902

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "66dd0f2a1c2b3a4e5f678902",
    "account": "web001",
    "addr": "8800000016",
    "commandType": { "name": "UPLOAD", "value": "上传间隔设置" },
    "commandContent": "UPLOAD,600",
    "commandParams": "{\"interval\":600}",
    "overallStatus": { "name": "CANCELLED", "value": "已取消" },
    "latestAttemptStatus": { "name": "TIMEOUT", "value": "本次超时" },
    "cancelReason": "用户主动取消",
    "retryable": true,
    "attemptCount": 1,
    "gatewayOnline": true,
    "gatewaySent": true,
    "gatewayChannelId": null,
    "gatewayMessage": "ACK timeout",
    "terminalAck": null,
    "createdTimeStr": "2026-09-08 14:00:00",
    "sendTimeStr": "2026-09-08 14:00:01",
    "ackTimeStr": null,
    "expireTimeStr": "2026-10-08 14:00:00"
  }
}

```

## 九、APP 首页设备总览与轨迹日历接口

*   路径前缀：`/api/monitor/app/home`
    
*   认证：需要登录 token（`RoleType.User`，APP/Web 均可）
    
*   说明：对接革泰 APP 首页地图汇总与轨迹日历模块。
    

### 1. 首页设备总览

*   方法：`GET`
    
*   路径：`/api/monitor/app/home/overview`
    
*   说明：返回当前账号绑定的全部设备 + 汇总统计（围栏数、在线/离线、正在报警设备数）。
    

请求：无额外参数（账号从登录态获取）。

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "summary": {
      "totalDevices": 6,
      "onlineCount": 3,
      "offlineCount": 3,
      "alarmCount": 7,
      "enclosureCount": 5
    },
    "devices": [
      {
        "addr": "8800000015",
        "remark": "GT-C-001",
        "terminalType": { "name": "CATTLE_SHEEP_LOCATOR", "value": "牛羊定位器" },
        "onlineFlag": "ON",
        "status": "ON",
        "battery": 85.0,
        "lastAlarmType": null,
        "lastAlarmTime": null,
        "lastCommTime": 1725775201000,
        "latestLoc": {
          "locType": "GPS",
          "locStatus": "NORMAL",
          "lng": 111.676xxx,
          "lat": 40.815xxx,
          "alt": 1050.0,
          "speed": 0.0,
          "dir": null,
          "time": "2026-05-06 18:00:01",
          "remark": null,
          "wgs84Lng": 111.670801,
          "wgs84Lat": 40.818311,
          "reportType": null
        }
      }
    ]
  }
}

```

`summary` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `totalDevices` | `Integer` | 绑定设备总数。 |
| `onlineCount` | `Integer` | 在线数（`onlineFlag=ON`）。 |
| `offlineCount` | `Integer` | 离线数（含 OFF / UNKNOWN）。 |
| `alarmCount` | `Integer` | 正在报警设备数（与 `GET /api/monitor/alarms` 未处理告警口径一致）。 |
| `enclosureCount` | `Integer` | 围栏数量。 |

`devices[]` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `addr` | `String` | 设备地址。 |
| `remark` | `String` | 备注（优先绑定关系备注）。 |
| `terminalType` | `Object` | 设备类型，含 `name`/`value`。 |
| `onlineFlag` | `String` | `ON` / `OFF` / `UNKNOWN`。 |
| `status` | `String` | `ON` / `OFF` / `SOS` / `STOP` / `NOT`。 |
| `battery` | `Float` | 电量百分比，可能为 `null`。 |
| `lastAlarmType` | `String` | 最后报警类型，可能为 `null`。 |
| `lastAlarmTime` | `Long` | 最后报警时间毫秒，可能为 `null`。 |
| `lastCommTime` | `Long` | 最后通信时间毫秒。 |
| `latestLoc` | `Object` | 最新位置（双坐标系，结构同 `batch/details` 的 `loc`），可能为 `null`。 |

`latestLoc` / 轨迹点 `loc` 字段（与 `POST /api/monitor/terminals/batch/details` 一致）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `locType` | `String` | 定位类型，如 `BD` / `GPS`。 |
| `locStatus` | `String` | 定位状态，如 `NORMAL`。 |
| `lng` | `Double` | 经度（火星坐标系 GCJ-02）。 |
| `lat` | `Double` | 纬度（火星坐标系 GCJ-02）。 |
| `alt` | `Double` | 海拔(米)。 |
| `speed` | `Float` | 速度(km/h)。 |
| `dir` | `Integer` | 方向。 |
| `time` | `String` | 定位时间 `yyyy-MM-dd HH:mm:ss`。 |
| `wgs84Lng` | `Double` | 经度（大地坐标系 WGS84）。 |
| `wgs84Lat` | `Double` | 纬度（大地坐标系 WGS84）。 |
| `reportType` | `Integer` | 补传标识，可能为 `null`。 |

### 2. 轨迹日历

*   方法：`GET`
    
*   路径：`/api/monitor/app/home/track-calendar`
    
*   说明：查询某月哪些天有定位数据，前端用绿点标记。
    

Query 参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `year` | `Integer` | 是 | 年份，如 `2026`。 |
| `month` | `Integer` | 是 | 月份，`1`～`12`。 |

请求示例：

```http
GET /api/monitor/app/home/track-calendar?year=2026&month=5

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "year": 2026,
    "month": 5,
    "daysWithData": [1, 3, 6, 8, 12, 15, 20]
  }
}

```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `year` | `Integer` | 年份。 |
| `month` | `Integer` | 月份。 |
| `daysWithData` | `Array<Integer>` | 有定位数据的日期列表（升序）。 |

### 3. 轨迹日历详情

*   方法：`GET`
    
*   路径：`/api/monitor/app/home/track-calendar/detail`
    
*   说明：返回某天全部定位点（无分页），按 `locTime` 倒序；可用 `keyword` 模糊筛选设备 addr 或备注。
    

Query 参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `year` | `Integer` | 是 | 年份。 |
| `month` | `Integer` | 是 | 月份，`1`～`12`。 |
| `day` | `Integer` | 是 | 日，`1`～`31`。 |
| `keyword` | `String` | 否 | 模糊匹配 addr 或备注；不传返回全部绑定设备当天定位点。 |

请求示例：

```http
GET /api/monitor/app/home/track-calendar/detail?year=2026&month=5&day=6&keyword=GT-C

```

响应 JSON 示例：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "deviceCount": 4,
    "locations": [
      {
        "addr": "8800000015",
        "remark": "GT-C-001",
        "terminalType": "CATTLE_SHEEP_LOCATOR",
        "locTime": 1725811200000,
        "loc": {
          "locType": "GPS",
          "locStatus": "NORMAL",
          "lng": 111.676xxx,
          "lat": 40.815xxx,
          "alt": 1050.0,
          "speed": 0.0,
          "dir": 180,
          "time": "2026-05-06 18:00:00",
          "remark": null,
          "wgs84Lng": 111.670801,
          "wgs84Lat": 40.818311,
          "reportType": 0
        }
      },
      {
        "addr": "8800000016",
        "remark": "GT-H-001",
        "terminalType": "CATTLE_SHEEP_LOCATOR",
        "locTime": 1725810600000,
        "loc": {
          "locType": "GPS",
          "locStatus": "NORMAL",
          "lng": 111.677xxx,
          "lat": 40.816xxx,
          "alt": 1048.0,
          "speed": 2.5,
          "dir": 90,
          "time": "2026-05-06 17:50:00",
          "remark": null,
          "wgs84Lng": 111.671500,
          "wgs84Lat": 40.819000,
          "reportType": 0
        }
      }
    ]
  }
}

```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `deviceCount` | `Integer` | 当天有定位数据的设备数。 |
| `locations` | `Array` | 定位点列表，按 `locTime` 倒序。 |
| `locations[].addr` | `String` | 设备地址。 |
| `locations[].remark` | `String` | 备注。 |
| `locations[].terminalType` | `String` | 设备类型枚举名。 |
| `locations[].locTime` | `Long` | 定位时间毫秒。 |
| `locations[].loc` | `Object` | 双坐标系定位信息，字段同上方 `latestLoc` / `batch/details` 的 `loc`。 |

## 十、APP 告警中心接口

### 10.1 分页查询告警信息（增强）

复用现有接口，新增 handleStatus 和 keyword 筛选参数。

*   **URL**: `GET /api/monitor/alarms`
    
*   **鉴权**: WebUser
    
*   **请求参数**:
    

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| alarmType | String | 否 | 报警类型枚举值，如 `ENCLOSURE_ALARM`、`UNDER_VOLTAGE_ALARM`、`SOS` 等 |
| addr | String | 否 | 设备地址模糊匹配 |
| handleStatus | String | 否 | 处理状态：`UNTREATED`（未处理）/ `PROCESSED`（已处理），不传查全部 |
| keyword | String | 否 | 模糊搜索设备地址或备注（与 addr 互斥，传 keyword 时忽略 addr） |
| page | int | 否 | 页码，默认 1 |
| pageSize | int | 否 | 每页数量，默认 20 |

*   **响应示例**:
    

```json
{
  "code": 200,
  "data": {
    "total": 5,
    "totalPage": 1,
    "items": [
      {
        "id": "6841a1b2e4b0f12345678901",
        "addr": "8800000015",
        "remark": "S18-Horse",
        "alarmType": { "name": "ENCLOSURE_ALARM", "value": "围栏报警" },
        "alarmTimeStr": "2026-05-06 15:25:00",
        "content": "S18-Horse 已离开「牧场边界」安全区",
        "handleStatus": { "name": "UNTREATED", "value": "未处理" },
        "handleTimeStr": null,
        "handleResult": null,
        "loc": {
          "lng": 113.505514,
          "lat": 23.152331,
          "alt": 36.0,
          "speed": 0.0,
          "dir": 0,
          "time": "2026-05-06 15:25:00",
          "wgs84Lng": 113.5002055556,
          "wgs84Lat": 23.155
        }
      }
    ]
  }
}

```

### 10.2 按设备地址批量处理告警

支持手动选择设备地址或全选模式。全选时服务端根据筛选条件查出所有匹配的告警统一处理。

*   **URL**: `PUT /api/monitor/alarms/batch-handle/addrs`
    
*   **鉴权**: WebUser
    
*   **Content-Type**: `application/json`
    

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| selectAll | boolean | 是 | 是否全选模式 |
| addrs | Set<String> | 条件 | selectAll=false 时必传，选中的设备地址集合 |
| handleResult | String | 是 | 处理备注，最多 300 字 |
| alarmType | String | 否 | 全选时的报警类型过滤 |
| handleStatus | String | 否 | 全选时的处理状态过滤 |
| keyword | String | 否 | 全选时的关键词过滤 |

**请求示例（手动选择）**:

```json
{
  "selectAll": false,
  "addrs": ["8800000015", "8800000016"],
  "handleResult": "已核实并处理"
}

```

**请求示例（全选模式）**:

```json
{
  "selectAll": true,
  "handleResult": "批量处理",
  "alarmType": "ENCLOSURE_ALARM",
  "handleStatus": "UNTREATED",
  "keyword": "S18"
}

```

**响应示例**:

```json
{
  "code": 200,
  "data": {
    "alarmNum": -3
  }
}

```

### 10.3 已有可复用接口

以下已有接口可直接用于 APP 告警中心：

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/monitor/alarms/batch-info` | GET | 获取报警类型及对应的设备数量（用于筛选面板的报警类型列表） |
| `/api/monitor/alarms/{id}` | PUT | 单条告警处理 |
| `/api/monitor/alarms/{addr}` | GET | 分页查询设备历史报警信息 |