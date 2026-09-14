(function(){
var S={};
S["splash"]={
  "layout": [
    {
      "id": "LAY-SPLASH-01",
      "t": "品牌区",
      "d": "Logo+产品名",
      "zone": "top",
      "anchor": "splashLogo"
    },
    {
      "id": "LAY-SPLASH-02",
      "t": "副标题",
      "d": "卫星应急通信",
      "zone": "form",
      "anchor": "splashTagline"
    },
    {
      "id": "LAY-SPLASH-03",
      "t": "跳过区",
      "d": "全屏热区",
      "zone": "bottom",
      "anchor": "splashLogo"
    }
  ],
  "screenFields": [
    {
      "id": "FL-SPLASH-01",
      "key": "brandName",
      "label": "品牌名",
      "t": "品牌名",
      "d": "",
      "type": "string",
      "required": true,
      "anchor": "splashLogo",
      "note": ""
    }
  ]
};
S["perm_guide"]={
  "layout": [
    {
      "id": "LAY-PERM-01",
      "t": "说明标题",
      "d": "需要以下权限",
      "zone": "top",
      "anchor": "permTitle"
    },
    {
      "id": "LAY-PERM-02",
      "t": "权限列表",
      "d": "蓝牙/麦/相机/终端定位说明",
      "zone": "list",
      "anchor": "permList"
    },
    {
      "id": "LAY-PERM-03",
      "t": "继续按钮",
      "d": "主按钮",
      "zone": "bottom",
      "anchor": "permContinueBtn"
    }
  ],
  "screenFields": [
    {
      "id": "FL-PERM-01",
      "key": "bleGranted",
      "label": "蓝牙已授权",
      "t": "蓝牙已授权",
      "d": "",
      "type": "boolean",
      "required": false,
      "anchor": "permList",
      "note": ""
    }
  ]
};
S["device_scan"]={
  "layout": [
    {
      "id": "LAY-SCAN-01",
      "t": "标题栏",
      "d": "连接设备",
      "zone": "top",
      "anchor": "scanTitle"
    },
    {
      "id": "LAY-SCAN-02",
      "t": "设备列表",
      "d": "RSSI+名称",
      "zone": "list",
      "anchor": "scanList"
    },
    {
      "id": "LAY-SCAN-03",
      "t": "连接按钮",
      "d": "选中后连接",
      "zone": "bottom",
      "anchor": "scanConnectBtn"
    }
  ],
  "screenFields": [
    {
      "id": "FL-SCAN-01",
      "key": "selectedDeviceId",
      "label": "选中设备",
      "t": "选中设备",
      "d": "",
      "type": "string",
      "required": false,
      "anchor": "scanList",
      "note": ""
    },
    {
      "id": "FL-SCAN-02",
      "key": "connectState",
      "label": "连接状态",
      "t": "连接状态",
      "d": "",
      "type": "enum",
      "required": true,
      "anchor": "scanSpinner",
      "note": ""
    }
  ]
};
S["messages"]={
  "layout": [
    {
      "id": "LAY-MSG-01",
      "t": "标题",
      "d": "消息",
      "zone": "top",
      "anchor": "msgTitle"
    },
    {
      "id": "LAY-MSG-02",
      "t": "卫星顶栏",
      "d": "态+deviceId+电量+信号",
      "zone": "top",
      "anchor": "satBanner"
    },
    {
      "id": "LAY-MSG-03",
      "t": "会话区",
      "d": "气泡列表（含图片）",
      "zone": "list",
      "anchor": "msgChatList"
    },
    {
      "id": "LAY-MSG-04",
      "t": "常用语",
      "d": "可展开面板",
      "zone": "sheet",
      "anchor": "msgPhrases"
    },
    {
      "id": "LAY-MSG-05",
      "t": "输入区",
      "d": "语音/文本/相机/发送",
      "zone": "bottom",
      "anchor": "msgInputBar"
    },
    {
      "id": "LAY-MSG-06",
      "t": "底栏",
      "d": "消息/地图/设置",
      "zone": "tab",
      "anchor": "tabbar"
    },
    {
      "id": "LAY-MSG-07",
      "t": "失败原因 Sheet",
      "d": "感叹号弹出",
      "zone": "sheet",
      "anchor": "msgFailSheet"
    }
  ],
  "screenFields": [
    {
      "id": "FL-MSG-01",
      "key": "satUiState",
      "label": "卫星顶栏态",
      "t": "卫星顶栏态",
      "d": "connecting|connected|offline（演示态；协议以 netStatus 为准）",
      "type": "enum",
      "required": true,
      "anchor": "satBanner",
      "note": "connecting|connected|offline（演示态；协议以 netStatus 为准）"
    },
    {
      "id": "FL-MSG-02",
      "key": "draftText",
      "label": "输入草稿",
      "t": "输入草稿",
      "d": "",
      "type": "string",
      "required": false,
      "anchor": "msgInput",
      "note": ""
    },
    {
      "id": "FL-MSG-03",
      "key": "msgUiStatus",
      "label": "气泡发送态",
      "t": "气泡发送态",
      "d": "waiting|sending|failed|ack_wait|success",
      "type": "enum",
      "required": true,
      "anchor": "msgChatList",
      "note": "waiting|sending|failed|ack_wait|success"
    },
    {
      "id": "FL-MSG-04",
      "key": "platId",
      "label": "平台业务 ID",
      "t": "平台业务 ID",
      "d": "",
      "type": "string",
      "required": false,
      "anchor": "msgChatList",
      "note": ""
    },
    {
      "id": "FL-MSG-05",
      "key": "deviceId",
      "label": "终端 ID",
      "t": "终端 ID",
      "d": "",
      "type": "string",
      "required": true,
      "anchor": "satDeviceId",
      "note": ""
    },
    {
      "id": "FL-MSG-06",
      "key": "pktDone",
      "label": "已完成分包",
      "t": "已完成分包",
      "d": "",
      "type": "number",
      "required": false,
      "anchor": "msgChatList",
      "note": ""
    },
    {
      "id": "FL-MSG-07",
      "key": "pktTotal",
      "label": "总分包数",
      "t": "总分包数",
      "d": "",
      "type": "number",
      "required": false,
      "anchor": "msgChatList",
      "note": ""
    },
    {
      "id": "FL-MSG-08",
      "key": "failReason",
      "label": "失败原因",
      "t": "失败原因",
      "d": "",
      "type": "string",
      "required": false,
      "anchor": "msgFailSheet",
      "note": ""
    }
  ]
};
S["map"]={
  "layout": [
    {
      "id": "LAY-MAP-01",
      "t": "标题",
      "d": "地图",
      "zone": "top",
      "anchor": "mapTitle"
    },
    {
      "id": "LAY-MAP-02",
      "t": "卫星顶栏",
      "d": "蓝牙/联网态",
      "zone": "top",
      "anchor": "satBanner"
    },
    {
      "id": "LAY-MAP-03",
      "t": "地图画布",
      "d": "底图+终端点",
      "zone": "map",
      "anchor": "mapCanvas"
    },
    {
      "id": "LAY-MAP-04",
      "t": "工具条",
      "d": "下载/图层",
      "zone": "side",
      "anchor": "mapToolbar"
    },
    {
      "id": "LAY-MAP-06",
      "t": "底栏",
      "d": "Tab",
      "zone": "tab",
      "anchor": "tabbar"
    }
  ],
  "screenFields": [
    {
      "id": "FL-MAP-01",
      "key": "locStatus",
      "label": "定位态",
      "t": "定位态",
      "d": "",
      "type": "enum",
      "required": true,
      "anchor": "mapCanvas",
      "note": ""
    },
    {
      "id": "FL-MAP-02",
      "key": "lat",
      "label": "纬度",
      "t": "纬度",
      "d": "",
      "type": "number",
      "required": false,
      "anchor": "mapCanvas",
      "note": ""
    },
    {
      "id": "FL-MAP-03",
      "key": "lon",
      "label": "经度",
      "t": "经度",
      "d": "",
      "type": "number",
      "required": false,
      "anchor": "mapCanvas",
      "note": ""
    },
    {
      "id": "FL-MAP-04",
      "key": "mapLayer",
      "label": "图层",
      "t": "图层",
      "d": "",
      "type": "enum",
      "required": false,
      "anchor": "mapLayerBtn",
      "note": ""
    }
  ]
};
S["settings"]={
  "layout": [
    {
      "id": "LAY-SET-01",
      "t": "标题",
      "d": "设置",
      "zone": "top",
      "anchor": "setTitle"
    },
    {
      "id": "LAY-SET-02",
      "t": "设备信息卡",
      "d": "头像+deviceId",
      "zone": "top",
      "anchor": "setDeviceInfo"
    },
    {
      "id": "LAY-SET-03",
      "t": "授权信息行",
      "d": "进入授权页",
      "zone": "list",
      "anchor": "setAuthRow"
    },
    {
      "id": "LAY-SET-03b",
      "t": "指令调试行",
      "d": "进入调试页",
      "zone": "list",
      "anchor": "setCmdDebugRow"
    },
    {
      "id": "LAY-SET-03c",
      "t": "等待超时行",
      "d": "等待发送超时配置",
      "zone": "list",
      "anchor": "setWaitTimeoutRow"
    },
    {
      "id": "LAY-SET-04",
      "t": "版本行",
      "d": "APP 版本检测",
      "zone": "list",
      "anchor": "setVersionRow"
    },
    {
      "id": "LAY-SET-05",
      "t": "断开",
      "d": "按钮",
      "zone": "bottom",
      "anchor": "setDisconnectBtn"
    },
    {
      "id": "LAY-SET-06",
      "t": "底栏",
      "d": "Tab",
      "zone": "tab",
      "anchor": "tabbar"
    }
  ],
  "screenFields": [
    {
      "id": "FL-SET-01",
      "key": "deviceId",
      "label": "设备号",
      "t": "设备号",
      "d": "",
      "type": "string",
      "required": true,
      "anchor": "setDeviceInfo",
      "note": ""
    },
    {
      "id": "FL-SET-02",
      "key": "appVersion",
      "label": "APP 版本",
      "t": "APP 版本",
      "d": "",
      "type": "string",
      "required": true,
      "anchor": "setVersionRow",
      "note": ""
    }
  ]
};
S["auth_info"]={
  "layout": [
    {
      "id": "LAY-AUTH-01",
      "t": "标题",
      "d": "授权信息",
      "zone": "top",
      "anchor": "authTitle"
    },
    {
      "id": "LAY-AUTH-02",
      "t": "授权列表",
      "d": "三卡片",
      "zone": "list",
      "anchor": "authList"
    },
    {
      "id": "LAY-AUTH-02b",
      "t": "一键解绑",
      "d": "底部危险操作",
      "zone": "bottom",
      "anchor": "authUnbindAllBtn"
    }
  ],
  "screenFields": [
    {
      "id": "FL-AUTH-01",
      "key": "authLicenses",
      "label": "授权许可证",
      "t": "授权许可证",
      "d": "",
      "type": "object",
      "required": true,
      "anchor": "authList",
      "note": ""
    }
  ]
};
S["auth_detail"]={
  "layout": [
    {
      "id": "LAY-AUTH-03",
      "t": "标题",
      "d": "按类型展示详情标题",
      "zone": "top",
      "anchor": "authDetailTitle"
    },
    {
      "id": "LAY-AUTH-04",
      "t": "明细区",
      "d": "授权字段块",
      "zone": "list",
      "anchor": "authDetailList"
    },
    {
      "id": "LAY-AUTH-05",
      "t": "返回",
      "d": "导航返回授权列表",
      "zone": "top",
      "anchor": "authDetailTitle"
    }
  ],
  "screenFields": [
    {
      "id": "FL-AUTH-02",
      "key": "authType",
      "label": "授权类型",
      "t": "授权类型",
      "d": "voice|image|app",
      "type": "enum",
      "required": true,
      "anchor": "authDetailTitle",
      "note": "voice|image|app"
    }
  ]
};
S["cmd_debug"]={
  "layout": [
    {
      "id": "LAY-CMD-01",
      "t": "标题",
      "d": "指令调试",
      "zone": "top",
      "anchor": "cmdDebugTitle"
    },
    {
      "id": "LAY-CMD-02",
      "t": "快捷+自定义",
      "d": "发送区",
      "zone": "form",
      "anchor": "cmdCustom"
    },
    {
      "id": "LAY-CMD-03",
      "t": "日志",
      "d": "交互记录",
      "zone": "list",
      "anchor": "cmdLog"
    }
  ],
  "screenFields": [
    {
      "id": "FL-CMD-01",
      "key": "cmdDraft",
      "label": "自定义帧",
      "t": "自定义帧",
      "d": "",
      "type": "string",
      "required": false,
      "anchor": "cmdDraftInput",
      "note": ""
    }
  ]
};
S["state_error"]={
  "layout": [
    {
      "id": "LAY-ERR-01",
      "t": "图标",
      "d": "居中",
      "zone": "top",
      "anchor": "errIcon"
    },
    {
      "id": "LAY-ERR-02",
      "t": "说明",
      "d": "错误文案",
      "zone": "form",
      "anchor": "errMessage"
    },
    {
      "id": "LAY-ERR-03",
      "t": "重试",
      "d": "按钮",
      "zone": "bottom",
      "anchor": "errRetryBtn"
    }
  ],
  "screenFields": [
    {
      "id": "FL-ERR-01",
      "key": "errorCode",
      "label": "错误码",
      "t": "错误码",
      "d": "",
      "type": "enum",
      "required": true,
      "anchor": "errMessage",
      "note": ""
    }
  ]
};
Object.keys(S).forEach(function(id){
  if(!window.REQS[id]) window.REQS[id]={fr:[],ux:[]};
  window.REQS[id].layout=S[id].layout;
  window.REQS[id].screenFields=S[id].screenFields;
});
})();