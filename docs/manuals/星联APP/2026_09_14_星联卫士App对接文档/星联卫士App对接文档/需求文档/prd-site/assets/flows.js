window.FLOWS=[
  {
    "id": "onboarding",
    "title": "1 · 首次连接",
    "summary": "开屏 → 权限 → 扫描 → 消息页",
    "steps": [
      {
        "screen": "splash",
        "caption": "品牌开屏",
        "fr": "FR-SPLASH-01",
        "demo": {
          "bleConnected": false
        }
      },
      {
        "screen": "perm_guide",
        "caption": "授权蓝牙/麦/相机",
        "fr": "FR-PERM-01",
        "demo": {
          "bleConnected": false
        }
      },
      {
        "screen": "device_scan",
        "caption": "扫描并连接 S1",
        "fr": "FR-SCAN-02",
        "demo": {
          "bleConnected": false
        }
      },
      {
        "screen": "messages",
        "caption": "收 $TOSTA+$TOLOC+$TOSIG 进入消息",
        "fr": "FR-MSG-01",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      }
    ]
  },
  {
    "id": "send_text",
    "title": "2 · 发常用语/文本",
    "summary": "消息页 → 常用语或输入 → 气泡态",
    "steps": [
      {
        "screen": "messages",
        "caption": "展开常用语或输入文本",
        "fr": "FR-MSG-03",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      },
      {
        "screen": "messages",
        "caption": "发送后气泡进入发送中/成功",
        "fr": "FR-MSG-02",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      }
    ]
  },
  {
    "id": "send_voice",
    "title": "3 · 发语音",
    "summary": "消息页录音 → $TIVOI 分包 → 气泡五态",
    "steps": [
      {
        "screen": "messages",
        "caption": "按住录音",
        "fr": "FR-MSG-04",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      },
      {
        "screen": "messages",
        "caption": "气泡显示发送中直至成功或失败",
        "fr": "FR-MSG-02",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      }
    ]
  },
  {
    "id": "send_image",
    "title": "4 · 发图片",
    "summary": "选图 → $TIIMG 分包 → 气泡五态",
    "steps": [
      {
        "screen": "messages",
        "caption": "选图发送",
        "fr": "FR-MSG-05",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      },
      {
        "screen": "messages",
        "caption": "气泡显示发送进度态",
        "fr": "FR-MSG-02",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      }
    ]
  },
  {
    "id": "uplink_with_ack",
    "title": "5 · 上报与 TOACK",
    "summary": "发 $TITXT → $TODST → $TOACK → $TODST=4",
    "steps": [
      {
        "screen": "messages",
        "caption": "发出文本 $TITXT",
        "fr": "FR-MSG-03",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      },
      {
        "screen": "messages",
        "caption": "气泡随 $TODST 五态推进",
        "fr": "FR-MSG-02",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      },
      {
        "screen": "cmd_debug",
        "caption": "日志可见 $TOACK 与 $TODST",
        "fr": "FR-CMD-01",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      }
    ]
  },
  {
    "id": "read_msg",
    "title": "6 · 阅读下行",
    "summary": "点击下行气泡 → 本机展示；已读由终端处理",
    "steps": [
      {
        "screen": "messages",
        "caption": "查看下行文本/语音",
        "fr": "FR-MSG-02",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      },
      {
        "screen": "messages",
        "caption": "本机标记已读（无 $TIRD）",
        "fr": "FR-MSG-06",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      }
    ]
  },
  {
    "id": "view_map",
    "title": "7 · 看终端地图",
    "summary": "地图 Tab → 打点/图层/离线下载/定位",
    "steps": [
      {
        "screen": "map",
        "caption": "查看终端 $TOLOC 打点与经纬度",
        "fr": "FR-MAP-02",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected",
          "locStatus": 1
        }
      },
      {
        "screen": "map",
        "caption": "切换图层或下载离线底图",
        "fr": "FR-MAP-05",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected",
          "locStatus": 1
        }
      },
      {
        "screen": "map",
        "caption": "右下角定位回到终端",
        "fr": "FR-MAP-03",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected",
          "locStatus": 1
        }
      }
    ]
  },
  {
    "id": "view_auth",
    "title": "8 · 查看授权信息",
    "summary": "设置 → 授权信息 → 详情",
    "steps": [
      {
        "screen": "settings",
        "caption": "进入授权信息",
        "fr": "FR-SET-04",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      },
      {
        "screen": "auth_info",
        "caption": "查看三类授权卡片",
        "fr": "FR-AUTH-01",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      },
      {
        "screen": "auth_detail",
        "caption": "查看授权明细",
        "fr": "FR-AUTH-03",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      }
    ]
  },
  {
    "id": "net_offline",
    "title": "9 · 卫星未联网",
    "summary": "netStatus≠2 顶栏联网中/失败 + 发送置灰",
    "steps": [
      {
        "screen": "messages",
        "caption": "netStatus=0 顶栏显示联网失败",
        "fr": "FR-MSG-01",
        "demo": {
          "bleConnected": true,
          "netStatus": 0,
          "satUiState": "offline"
        }
      },
      {
        "screen": "messages",
        "caption": "发送不可用提示暂不可发送",
        "fr": "FR-MSG-03",
        "demo": {
          "bleConnected": true,
          "netStatus": 0,
          "satUiState": "offline"
        }
      }
    ]
  },
  {
    "id": "cmd_debug_flow",
    "title": "10 · 指令调试",
    "summary": "设置 → 指令调试 → 发 $TIQRY 看 TX/RX",
    "steps": [
      {
        "screen": "settings",
        "caption": "进入指令调试",
        "fr": "FR-SET-05",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      },
      {
        "screen": "cmd_debug",
        "caption": "查看日志并发送查询帧",
        "fr": "FR-CMD-02",
        "demo": {
          "bleConnected": true,
          "netStatus": 2,
          "satUiState": "connected"
        }
      }
    ]
  }
];