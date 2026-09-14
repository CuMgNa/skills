window.FIELDS={
  "brandName": {
    "key": "brandName",
    "label": "品牌名",
    "type": "string",
    "required": true,
    "note": ""
  },
  "bleGranted": {
    "key": "bleGranted",
    "label": "蓝牙已授权",
    "type": "boolean",
    "required": false,
    "note": ""
  },
  "selectedDeviceId": {
    "key": "selectedDeviceId",
    "label": "选中设备",
    "type": "string",
    "required": false,
    "note": ""
  },
  "connectState": {
    "key": "connectState",
    "label": "连接状态",
    "type": "enum",
    "required": true,
    "note": ""
  },
  "satUiState": {
    "key": "satUiState",
    "label": "卫星顶栏态",
    "type": "enum",
    "required": true,
    "note": "connecting|connected|offline（演示态；协议以 netStatus 为准）"
  },
  "draftText": {
    "key": "draftText",
    "label": "输入草稿",
    "type": "string",
    "required": false,
    "note": ""
  },
  "msgUiStatus": {
    "key": "msgUiStatus",
    "label": "气泡发送态",
    "type": "enum",
    "required": true,
    "note": "waiting|sending|failed|ack_wait|success"
  },
  "platId": {
    "key": "platId",
    "label": "平台业务 ID",
    "type": "string",
    "required": false,
    "note": ""
  },
  "deviceId": {
    "key": "deviceId",
    "label": "设备号",
    "type": "string",
    "required": true,
    "note": ""
  },
  "pktDone": {
    "key": "pktDone",
    "label": "已完成分包",
    "type": "number",
    "required": false,
    "note": ""
  },
  "pktTotal": {
    "key": "pktTotal",
    "label": "总分包数",
    "type": "number",
    "required": false,
    "note": ""
  },
  "failReason": {
    "key": "failReason",
    "label": "失败原因",
    "type": "string",
    "required": false,
    "note": ""
  },
  "locStatus": {
    "key": "locStatus",
    "label": "定位态",
    "type": "enum",
    "required": true,
    "note": ""
  },
  "lat": {
    "key": "lat",
    "label": "纬度",
    "type": "number",
    "required": false,
    "note": ""
  },
  "lon": {
    "key": "lon",
    "label": "经度",
    "type": "number",
    "required": false,
    "note": ""
  },
  "mapLayer": {
    "key": "mapLayer",
    "label": "图层",
    "type": "enum",
    "required": false,
    "note": ""
  },
  "appVersion": {
    "key": "appVersion",
    "label": "APP 版本",
    "type": "string",
    "required": true,
    "note": ""
  },
  "authLicenses": {
    "key": "authLicenses",
    "label": "授权许可证",
    "type": "object",
    "required": true,
    "note": ""
  },
  "authType": {
    "key": "authType",
    "label": "授权类型",
    "type": "enum",
    "required": true,
    "note": "voice|image|app"
  },
  "cmdDraft": {
    "key": "cmdDraft",
    "label": "自定义帧",
    "type": "string",
    "required": false,
    "note": ""
  },
  "errorCode": {
    "key": "errorCode",
    "label": "错误码",
    "type": "enum",
    "required": true,
    "note": ""
  }
};