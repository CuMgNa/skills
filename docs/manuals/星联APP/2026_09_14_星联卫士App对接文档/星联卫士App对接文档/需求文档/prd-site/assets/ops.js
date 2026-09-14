window.OPS={screens:{
  "perm_guide": {
    "title": "权限引导",
    "module": "m_boot",
    "operations": [
      {
        "id": "OP-PERM-01",
        "name": "申请权限",
        "trigger": "点击继续",
        "preconditions": [
          "首次启动"
        ],
        "steps": [
          {
            "no": 1,
            "actor": "user",
            "action": "点击继续",
            "detail": ""
          },
          {
            "no": 2,
            "actor": "app",
            "action": "弹出系统权限",
            "detail": "蓝牙/麦/相机"
          },
          {
            "no": 3,
            "actor": "app",
            "action": "进入 device_scan",
            "detail": ""
          }
        ],
        "fields": [],
        "rules": [],
        "api": {
          "name": "—"
        },
        "responses": {
          "loading": "正在请求权限…",
          "success": "进入连接设备",
          "validationFail": "请至少授权蓝牙",
          "networkFail": "不适用",
          "blocked": "权限被拒绝，显示说明与去设置"
        },
        "relatedFr": [
          "FR-PERM-01"
        ]
      }
    ]
  },
  "device_scan": {
    "title": "连接设备",
    "module": "m_connect",
    "operations": [
      {
        "id": "OP-CONNECT-01",
        "name": "连接设备",
        "trigger": "点击连接",
        "preconditions": [
          "蓝牙已开",
          "已选设备"
        ],
        "steps": [
          {
            "no": 1,
            "actor": "user",
            "action": "选择设备并连接",
            "detail": ""
          },
          {
            "no": 2,
            "actor": "app",
            "action": "GATT 连接",
            "detail": ""
          },
          {
            "no": 3,
            "actor": "term",
            "action": "推送 $TOSTA+$TOLOC+$TOSIG",
            "detail": "终端已自行登录平台"
          },
          {
            "no": 4,
            "actor": "app",
            "action": "进入 messages",
            "detail": ""
          }
        ],
        "fields": [],
        "rules": [],
        "api": {
          "name": "—"
        },
        "responses": {
          "loading": "连接中…",
          "success": "进入消息页",
          "validationFail": "请选择设备",
          "networkFail": "连接超时，请重试",
          "blocked": "设备已被其他手机占用"
        },
        "relatedFr": [
          "FR-SCAN-02",
          "FR-ERR-02"
        ]
      }
    ]
  },
  "messages": {
    "title": "消息",
    "module": "m_msg",
    "operations": [
      {
        "id": "OP-SEND-TXT-01",
        "name": "发送文本/常用语",
        "trigger": "点击发送或点选常用语",
        "preconditions": [
          "蓝牙已连",
          "netStatus=2",
          "草稿非空"
        ],
        "steps": [
          {
            "no": 1,
            "actor": "user",
            "action": "输入或点常用语并发送",
            "detail": ""
          },
          {
            "no": 2,
            "actor": "app",
            "action": "检查 TOSTA 门闩与 GB2312",
            "detail": ""
          },
          {
            "no": 3,
            "actor": "app",
            "action": "发 $TITXT",
            "detail": "一包；超长截成多条消息"
          },
          {
            "no": 4,
            "actor": "app",
            "action": "按 $TODST 更新气泡五态",
            "detail": ""
          }
        ],
        "fields": [],
        "rules": [],
        "api": {
          "name": "—"
        },
        "responses": {
          "loading": "发送中…",
          "success": "发送成功",
          "validationFail": "请输入内容",
          "networkFail": "发送失败",
          "blocked": "暂不可发送"
        },
        "relatedFr": [
          "FR-MSG-03"
        ]
      },
      {
        "id": "OP-SEND-VOICE-01",
        "name": "发送语音",
        "trigger": "松手结束录音",
        "preconditions": [
          "蓝牙已连",
          "netStatus=2",
          "已录音"
        ],
        "steps": [
          {
            "no": 1,
            "actor": "user",
            "action": "按住录音并松手",
            "detail": ""
          },
          {
            "no": 2,
            "actor": "app",
            "action": "按 250B 切包发 $TIVOI",
            "detail": "TODST=4 后再发下一包（串行）"
          },
          {
            "no": 3,
            "actor": "app",
            "action": "更新气泡五态",
            "detail": ""
          }
        ],
        "fields": [],
        "rules": [],
        "api": {
          "name": "—"
        },
        "responses": {
          "loading": "发送中…",
          "success": "语音发送成功",
          "validationFail": "请先录音",
          "networkFail": "发送失败",
          "blocked": "暂不可发送"
        },
        "relatedFr": [
          "FR-MSG-04"
        ]
      },
      {
        "id": "OP-SEND-IMAGE-01",
        "name": "发送图片",
        "trigger": "确认选图",
        "preconditions": [
          "蓝牙已连",
          "netStatus=2",
          "已选图"
        ],
        "steps": [
          {
            "no": 1,
            "actor": "user",
            "action": "拍照或选图",
            "detail": ""
          },
          {
            "no": 2,
            "actor": "app",
            "action": "按 250B 切包发 $TIIMG",
            "detail": ""
          },
          {
            "no": 3,
            "actor": "app",
            "action": "更新气泡五态",
            "detail": ""
          }
        ],
        "fields": [],
        "rules": [],
        "api": {
          "name": "—"
        },
        "responses": {
          "loading": "发送中…",
          "success": "图片发送成功",
          "validationFail": "请选择图片",
          "networkFail": "发送失败",
          "blocked": "暂不可发送"
        },
        "relatedFr": [
          "FR-MSG-05"
        ]
      },
      {
        "id": "OP-READ-MSG-01",
        "name": "查看下行",
        "trigger": "打开下行气泡",
        "preconditions": [
          "下行消息存在"
        ],
        "steps": [
          {
            "no": 1,
            "actor": "user",
            "action": "点击下行文本/语音",
            "detail": ""
          },
          {
            "no": 2,
            "actor": "app",
            "action": "播放或展示内容",
            "detail": ""
          },
          {
            "no": 3,
            "actor": "app",
            "action": "本机标记已读（不发 $TIRD）",
            "detail": "已读回执由终端 UDP 0x05"
          }
        ],
        "fields": [],
        "rules": [],
        "api": {
          "name": "—"
        },
        "responses": {
          "loading": "加载中…",
          "success": "本机已展示；回执归终端",
          "validationFail": "消息不存在",
          "networkFail": "蓝牙未连接时可稍后重试",
          "blocked": "platId=0 仅展示"
        },
        "relatedFr": [
          "FR-MSG-06"
        ]
      }
    ]
  }
}};