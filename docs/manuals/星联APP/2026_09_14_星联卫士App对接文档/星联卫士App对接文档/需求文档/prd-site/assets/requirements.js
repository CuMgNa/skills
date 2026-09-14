(function(){
var R={};
R["splash"]={
  "title": "开屏",
  "module": "m_boot",
  "offline": "完全离线",
  "ref": "",
  "fr": [
    {
      "id": "FR-SPLASH-01",
      "t": "品牌展示",
      "d": "冷启动展示星联卫士品牌",
      "acc": "2 秒内自动进入权限引导或跳过",
      "anchor": "splashLogo",
      "ops": []
    }
  ],
  "ux": [
    {
      "id": "UX-SPLASH-01",
      "t": "Logo 居中",
      "d": "品牌 Logo 为视觉焦点",
      "anchor": "splashLogo"
    },
    {
      "id": "UX-SPLASH-02",
      "t": "轻触跳过",
      "d": "全屏可点击进入下一步",
      "anchor": "splashLogo"
    }
  ]
};
R["perm_guide"]={
  "title": "权限引导",
  "module": "m_boot",
  "offline": "完全离线",
  "ref": "",
  "fr": [
    {
      "id": "FR-PERM-01",
      "t": "申请必要权限",
      "d": "蓝牙、麦克风、相机/相册；地图位置来自终端，不申请手机 GPS",
      "acc": "授权后进入设备扫描；拒绝则说明影响",
      "anchor": "permContinueBtn",
      "ops": [
        "OP-PERM-01"
      ]
    }
  ],
  "ux": [
    {
      "id": "UX-PERM-01",
      "t": "逐项说明",
      "d": "每项权限对应功能",
      "anchor": "permList"
    },
    {
      "id": "UX-PERM-02",
      "t": "终端定位说明",
      "d": "文案写明地图用终端 $TOLOC，不申请手机 GPS",
      "anchor": "permList"
    }
  ]
};
R["device_scan"]={
  "title": "连接设备",
  "module": "m_connect",
  "offline": "需蓝牙",
  "ref": "",
  "fr": [
    {
      "id": "FR-SCAN-01",
      "t": "扫描星联卫士",
      "d": "扫描 BLE 广播名含 S1/星联卫士 的设备",
      "acc": "10 秒内列表出现设备或空态",
      "anchor": "scanList",
      "ops": []
    },
    {
      "id": "FR-SCAN-02",
      "t": "点击连接",
      "d": "GATT 连接成功后终端推送 $TOSTA+$TOLOC+$TOSIG，进入消息页",
      "acc": "15 秒内进入消息页或显示失败原因",
      "anchor": "scanConnectBtn",
      "ops": [
        "OP-CONNECT-01"
      ]
    }
  ],
  "ux": [
    {
      "id": "UX-SCAN-01",
      "t": "扫描动画",
      "d": "连接中显示进度",
      "anchor": "scanSpinner"
    },
    {
      "id": "UX-SCAN-02",
      "t": "空态",
      "d": "未发现设备时提示靠近并确认开机",
      "anchor": "scanEmpty"
    }
  ]
};
R["messages"]={
  "title": "消息",
  "module": "m_msg",
  "offline": "需蓝牙",
  "ref": "",
  "fr": [
    {
      "id": "FR-MSG-01",
      "t": "卫星状态顶栏",
      "d": "未连蓝牙时展示连接入口；连上后按 netStatus 展示联网三态、deviceId、电量与信号；已连点击弹出断开确认",
      "acc": "未连显示「未连接蓝牙 · 点击连接」；已连显示联网态与电量；无 loginStatus",
      "anchor": "satBanner",
      "ops": []
    },
    {
      "id": "FR-MSG-02",
      "t": "会话气泡列表",
      "d": "左右分列展示下行与上行；语音显示时长；发出图片缩略气泡；上行展示发送五态",
      "acc": "至少可见发送成功/失败/发送中，并可用演示切换等待与成功等待回执；可见发出图片气泡",
      "anchor": "msgChatList",
      "ops": []
    },
    {
      "id": "FR-MSG-03",
      "t": "文本与常用语发送",
      "d": "输入框或常用语发出 $TITXT；不可发送时按钮置灰并提示「暂不可发送」",
      "acc": "可发送时发出后气泡进入发送中 1/1；不可发送时 Toast「暂不可发送」",
      "anchor": "msgSendBtn",
      "ops": [
        "OP-SEND-TXT-01"
      ]
    },
    {
      "id": "FR-MSG-04",
      "t": "语音上行",
      "d": "按住录音，松手后发 $TIVOI 分包",
      "acc": "录音后气泡出现并进入发送中 m/n",
      "anchor": "msgVoiceBtn",
      "ops": [
        "OP-SEND-VOICE-01"
      ]
    },
    {
      "id": "FR-MSG-05",
      "t": "图片上行",
      "d": "拍照或相册发 $TIIMG 分包；会话出现发出图片气泡与发送态；无图片下行",
      "acc": "选图后会话出现发出图片气泡并进入发送中 m/n",
      "anchor": "msgCameraBtn",
      "ops": [
        "OP-SEND-IMAGE-01"
      ]
    },
    {
      "id": "FR-MSG-06",
      "t": "下行展示与本机已读",
      "d": "打开下行文本/语音做本机展示与去重；已读回执由终端上报 UDP 0x05，APP 不发 $TIRD；platId=0 按键短音仅展示",
      "acc": "点击下行气泡仅本机标记已读/Toast 说明；协议层无 $TIRD",
      "anchor": "msgChatList",
      "ops": [
        "OP-READ-MSG-01"
      ]
    },
    {
      "id": "FR-MSG-07",
      "t": "发送中分包进度",
      "d": "发送中文案为「发送中 m/n」；文本固定 1/1；语音/图片按分包跟踪",
      "acc": "发送中气泡可见 m/n；点状态可演示推进进度",
      "anchor": "msgChatList",
      "ops": []
    },
    {
      "id": "FR-MSG-08",
      "t": "失败原因",
      "d": "发送失败旁显示感叹号；点击弹出 APP 归纳的失败原因",
      "acc": "失败气泡可见 ! ；点击后 Sheet 展示 failReason",
      "anchor": "msgFailHint",
      "ops": []
    }
  ],
  "ux": [
    {
      "id": "UX-MSG-01",
      "t": "顶栏优先级",
      "d": "卫星态条始终在标题下；联网成功绿/失败红/联网中橙；deviceId 与电量跟在态文案后",
      "anchor": "satBanner"
    },
    {
      "id": "UX-MSG-02",
      "t": "气泡状态色与进度",
      "d": "成功蓝、失败红、发送中橙并带 m/n；等待与成功等待回执可区分",
      "anchor": "msgChatList"
    },
    {
      "id": "UX-MSG-03",
      "t": "常用语面板",
      "d": "展开后可一键填入并发送短文本，节省带宽",
      "anchor": "msgPhrases"
    },
    {
      "id": "UX-MSG-04",
      "t": "失败感叹号",
      "d": "失败旁圆形 ! ，点击弹出原因 Sheet",
      "anchor": "msgFailHint"
    }
  ]
};
R["map"]={
  "title": "地图",
  "module": "m_map",
  "offline": "需蓝牙",
  "ref": "",
  "fr": [
    {
      "id": "FR-MAP-01",
      "t": "卫星状态顶栏",
      "d": "与消息页共用同一套蓝牙优先 + 联网三态顶栏逻辑",
      "acc": "与消息页顶栏态一致（未连蓝牙/联网三态/断开确认）",
      "anchor": "satBanner",
      "ops": []
    },
    {
      "id": "FR-MAP-02",
      "t": "终端打点",
      "d": "用最近一次有效 $TOLOC 在地图上打点，并常驻展示经纬度；未定位不造假点",
      "acc": "locStatus=1 时可见终端标记与经纬度条；否则显示搜星中/无效提示且无坐标数字",
      "anchor": "mapCanvas",
      "ops": []
    },
    {
      "id": "FR-MAP-03",
      "t": "定位按钮",
      "d": "右下角缩放区上方的定位按钮，回到终端 $TOLOC 位置",
      "acc": "有有效坐标时点击提示已回到终端位置；无坐标时提示暂无有效坐标",
      "anchor": "mapLocateBtn",
      "ops": []
    },
    {
      "id": "FR-MAP-05",
      "t": "离线底图与图层",
      "d": "可在卫星图/标准地图间切换；可模拟下载离线底图；缩放为本地能力，不走卫星指令",
      "acc": "图层 sheet 二选一且底图变化；下载可走 idle→进度→已就绪，文案说明不占卫星带宽",
      "anchor": "mapDownloadBtn",
      "ops": []
    }
  ],
  "ux": [
    {
      "id": "UX-MAP-01",
      "t": "右侧工具条",
      "d": "下载/图层纵向排列；定位在缩放区上方",
      "anchor": "mapToolbar"
    },
    {
      "id": "UX-MAP-02",
      "t": "缩放与定位",
      "d": "右下角定位 + +/- ",
      "anchor": "mapZoom"
    },
    {
      "id": "UX-MAP-03",
      "t": "未定位空态",
      "d": "locStatus≠1 时不显示坐标数字；已定位时底部常驻经纬度",
      "anchor": "mapCanvas"
    }
  ]
};
R["settings"]={
  "title": "设置",
  "module": "m_profile",
  "offline": "部分离线",
  "ref": "",
  "fr": [
    {
      "id": "FR-SET-01",
      "t": "设备号",
      "d": "展示 $TOSTA.deviceId（12 位）",
      "acc": "与最近一次 $TOSTA 的 deviceId 一致",
      "anchor": "setDeviceInfo",
      "ops": []
    },
    {
      "id": "FR-SET-02",
      "t": "版本检测更新",
      "d": "展示并检测 APP 版本，不做固件版本查询",
      "acc": "可见当前 APP 版本号；点击进入检测流程或说明",
      "anchor": "setVersionRow",
      "ops": []
    },
    {
      "id": "FR-SET-03",
      "t": "断开连接",
      "d": "断开蓝牙并回到扫描",
      "acc": "二次确认后进入连接异常或扫描页",
      "anchor": "setDisconnectBtn",
      "ops": []
    },
    {
      "id": "FR-SET-04",
      "t": "授权信息入口",
      "d": "设置页进入语音库/图像库/APP 许可证查看与解绑（非卫星 UDP authCode）",
      "acc": "点击「授权信息」进入 auth_info",
      "anchor": "setAuthRow",
      "ops": []
    },
    {
      "id": "FR-SET-05",
      "t": "指令调试入口",
      "d": "授权信息下方进入指令调试，查看与发送 $xxxx 帧",
      "acc": "点击「指令调试」进入 cmd_debug",
      "anchor": "setCmdDebugRow",
      "ops": []
    },
    {
      "id": "FR-SET-06",
      "t": "等待发送超时",
      "d": "配置消息处于「等待」态的最长连续时长；超时整条失败。默认 10 分钟，可选 5/10/15/30/60 分钟",
      "acc": "设置页可见当前超时分钟数；切换后立即生效并持久化；默认值为 10",
      "anchor": "setWaitTimeoutRow",
      "ops": []
    }
  ],
  "ux": [
    {
      "id": "UX-SET-01",
      "t": "头像+设备号",
      "d": "顶部身份区优先展示 deviceId",
      "anchor": "setDeviceInfo"
    },
    {
      "id": "UX-SET-02",
      "t": "版本行",
      "d": "右侧显示 V 版本号与箭头",
      "anchor": "setVersionRow"
    },
    {
      "id": "UX-SET-03",
      "t": "授权信息行",
      "d": "列表入口带箭头，位于版本检测之上",
      "anchor": "setAuthRow"
    },
    {
      "id": "UX-SET-04",
      "t": "指令调试行",
      "d": "授权信息与版本检测之间",
      "anchor": "setCmdDebugRow"
    },
    {
      "id": "UX-SET-05",
      "t": "等待超时行",
      "d": "展示当前分钟数，点击弹出档位选择",
      "anchor": "setWaitTimeoutRow"
    }
  ]
};
R["auth_info"]={
  "title": "授权信息",
  "module": "m_profile",
  "offline": "部分离线",
  "ref": "",
  "fr": [
    {
      "id": "FR-AUTH-01",
      "t": "三类授权卡片",
      "d": "展示语音库/图像库/APP 授权有效期、状态提示与立即授权或解绑",
      "acc": "可见三张卡片；过期显示立即授权；永久有效显示解绑授权",
      "anchor": "authList",
      "ops": []
    },
    {
      "id": "FR-AUTH-02",
      "t": "一键解绑",
      "d": "二次确认后解绑 APP、语音、图像授权（演示）",
      "acc": "确认框文案说明会解绑三类授权",
      "anchor": "authUnbindAllBtn",
      "ops": []
    }
  ],
  "ux": [
    {
      "id": "UX-AUTH-01",
      "t": "过期红色提示",
      "d": "过期态用红色 * 提示 + 蓝色立即授权按钮",
      "anchor": "authCard_voice"
    },
    {
      "id": "UX-AUTH-02",
      "t": "永久有效蓝色提示",
      "d": "永久有效用蓝色提示 + 红色解绑按钮",
      "anchor": "authCard_image"
    }
  ]
};
R["auth_detail"]={
  "title": "授权详情",
  "module": "m_profile",
  "offline": "部分离线",
  "ref": "",
  "fr": [
    {
      "id": "FR-AUTH-03",
      "t": "授权明细",
      "d": "展示设备 ID、生效/到期时间与调用次数",
      "acc": "按 type 展示对应许可证 records",
      "anchor": "authDetailList",
      "ops": []
    }
  ],
  "ux": [
    {
      "id": "UX-AUTH-03",
      "t": "明细卡片层级",
      "d": "键值行展示授权字段，标题优先",
      "anchor": "authDetailList"
    },
    {
      "id": "UX-AUTH-04",
      "t": "空明细态",
      "d": "无 records 时显示暂无授权明细",
      "anchor": "authDetailList"
    }
  ]
};
R["cmd_debug"]={
  "title": "指令调试",
  "module": "m_profile",
  "offline": "需蓝牙",
  "ref": "",
  "fr": [
    {
      "id": "FR-CMD-01",
      "t": "查看交互日志",
      "d": "展示 APP↔终端 $xxxx 帧的 TX/RX 日志",
      "acc": "可见方向、时间与完整帧字符串",
      "anchor": "cmdLog",
      "ops": []
    },
    {
      "id": "FR-CMD-02",
      "t": "发送指令",
      "d": "快捷 chip 或自定义输入框发送上行帧；未连蓝牙不可发",
      "acc": "连蓝牙后可发送；查询类出现 mock RX；未连 Toast 请先连接蓝牙",
      "anchor": "cmdSendBtn",
      "ops": []
    }
  ],
  "ux": [
    {
      "id": "UX-CMD-01",
      "t": "快捷发送区",
      "d": "常用指令 chip 横向换行",
      "anchor": "cmdQuickBar"
    },
    {
      "id": "UX-CMD-02",
      "t": "日志深色区",
      "d": "TX 绿 / RX 蓝区分方向",
      "anchor": "cmdLog"
    }
  ]
};
R["state_error"]={
  "title": "连接异常",
  "module": "m_common",
  "offline": "完全离线",
  "ref": "",
  "fr": [
    {
      "id": "FR-ERR-01",
      "t": "异常说明",
      "d": "蓝牙断开/设备被占用等",
      "acc": "根据 errorCode 展示对应文案与操作",
      "anchor": "errMessage",
      "ops": []
    },
    {
      "id": "FR-ERR-02",
      "t": "重试连接",
      "d": "返回 device_scan",
      "acc": "点击后进入扫描页",
      "anchor": "errRetryBtn",
      "ops": [
        "OP-CONNECT-01"
      ]
    }
  ],
  "ux": [
    {
      "id": "UX-ERR-01",
      "t": "图标+文案",
      "d": "错误类型可区分",
      "anchor": "errIcon"
    },
    {
      "id": "UX-ERR-02",
      "t": "主操作",
      "d": "重试按钮高对比",
      "anchor": "errRetryBtn"
    }
  ]
};
window.REQS=R;
window.MODULES=[
  {
    "key": "m_boot",
    "name": "启动与权限",
    "screens": [
      "splash",
      "perm_guide"
    ]
  },
  {
    "key": "m_connect",
    "name": "蓝牙连接",
    "screens": [
      "device_scan"
    ]
  },
  {
    "key": "m_msg",
    "name": "消息",
    "screens": [
      "messages"
    ]
  },
  {
    "key": "m_map",
    "name": "地图",
    "screens": [
      "map"
    ]
  },
  {
    "key": "m_profile",
    "name": "设置",
    "screens": [
      "settings",
      "auth_info",
      "auth_detail",
      "cmd_debug"
    ]
  },
  {
    "key": "m_common",
    "name": "异常态",
    "screens": [
      "state_error"
    ]
  }
];
})();