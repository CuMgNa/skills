window.RULES={topics:[
  {
    "id": "app_frame_only",
    "title": "应用层只认 $xxxx",
    "owner": "APP",
    "summary": "禁止 JSON；不组 UDP；不保存授权码；无 $TIRD",
    "rules": [
      {
        "no": 1,
        "cond": "任意蓝牙应用载荷",
        "result": "必须是 $CMD,fields...*hh 帧"
      },
      {
        "no": 2,
        "cond": "平台授权码",
        "result": "留在终端，APP 不存储"
      },
      {
        "no": 3,
        "cond": "下行已读",
        "result": "终端发 UDP 0x05；APP 不发 $TIRD"
      }
    ],
    "state": null
  },
  {
    "id": "ble_snapshot",
    "title": "连接后快照三帧",
    "owner": "终端→APP",
    "summary": "GATT 连上后必推 TOSTA+TOLOC+TOSIG",
    "rules": [
      {
        "no": 1,
        "cond": "BLE GATT 连接成功",
        "result": "终端依次推 $TOSTA、$TOLOC、$TOSIG"
      },
      {
        "no": 2,
        "cond": "字段变化（断网/联网/SOS/定位/信号）",
        "result": "终端主动 Notify 对应帧；APP 可用查询核对"
      },
      {
        "no": 3,
        "cond": "平台 0x80 授权/登录结果",
        "result": "终端内部处理，仅经 $TOSTA.netStatus 反映给 APP"
      }
    ],
    "state": null
  },
  {
    "id": "send_gate",
    "title": "发送门闩",
    "owner": "APP",
    "summary": "三道门：ttMod=1 + netStatus=2 + 发包前 TOGAT=1",
    "rules": [
      {
        "no": 1,
        "cond": "ttMod=1 且 netStatus=2 且 TOGAT=1",
        "result": "允许发送"
      },
      {
        "no": 2,
        "cond": "ttMod=0",
        "result": "提示「天通模块未开启」；须 $TITSM,1"
      },
      {
        "no": 3,
        "cond": "蓝牙未连或 netStatus≠2 或 TOGAT=0",
        "result": "置灰并提示「暂不可发送」；在途按 TODST=0 等待"
      }
    ],
    "state": null
  },
  {
    "id": "todst_ui",
    "title": "TODST / TOACK 整条消息 UI",
    "owner": "APP",
    "summary": "五态汇总、重试上限与平台回执",
    "rules": [
      {
        "no": 1,
        "cond": "TODST=0",
        "result": "整条等待，不计包失败；恢复后从当前包继续；连续等待达配置时长则整条失败"
      },
      {
        "no": 2,
        "cond": "TODST=2 或 5s 无 TODST",
        "result": "本轮失败 +1；同轮两种只计 1 次；满 3 次整条失败"
      },
      {
        "no": 3,
        "cond": "TODST=3 后 10s 无 4",
        "result": "整条失败，不重发"
      },
      {
        "no": 4,
        "cond": "各包都是 4",
        "result": "UI 发送成功"
      },
      {
        "no": 5,
        "cond": "各包至少 3 尚未都 4",
        "result": "UI 成功等待回执"
      },
      {
        "no": 6,
        "cond": "收到 $TOACK",
        "result": "记录 termBizId/pktIdx；随后应收到同 seq 的 TODST=4"
      },
      {
        "no": 7,
        "cond": "连续「等待」达到 waitTimeoutMinutes（默认 10）",
        "result": "整条失败，failReason=等待发送超时；不再自动续发"
      }
    ],
    "state": null
  },
  {
    "id": "wait_timeout",
    "title": "等待发送超时",
    "owner": "APP",
    "summary": "默认 10 分钟；设置可改；超时整条失败",
    "rules": [
      {
        "no": 1,
        "cond": "消息进入「等待」（未发或 TODST=0）",
        "result": "APP 开始连续等待计时"
      },
      {
        "no": 2,
        "cond": "条件恢复并离开等待态",
        "result": "计时清零；从当前包续发"
      },
      {
        "no": 3,
        "cond": "连续等待 ≥ 配置分钟数（默认 10）",
        "result": "整条失败；气泡展示失败与「等待发送超时」；不自动重试"
      },
      {
        "no": 4,
        "cond": "设置页修改 waitTimeoutMinutes",
        "result": "立即作用于后续计时；档位仅 5/10/15/30/60；属本地配置不走 $xxxx"
      }
    ],
    "state": null
  },
  {
    "id": "seq_retry",
    "title": "seq 自增与迟到丢弃",
    "owner": "APP",
    "summary": "seq 32800～65535；按 deviceId 持久化；同条重试保持 seq；整条失败后再发才换新 seq",
    "rules": [
      {
        "no": 1,
        "cond": "发起新消息（含整条失败后用户再次发送）",
        "result": "seq 在 32800～65535 自增；到 65535 后回 32800"
      },
      {
        "no": 2,
        "cond": "迟到的旧 seq 的 $TODST/$TOACK",
        "result": "APP 丢弃，不驱动当前气泡态"
      },
      {
        "no": 3,
        "cond": "按 $TOSTA.deviceId 管理 seq",
        "result": "本地持久化下一 seq；换终端（deviceId 变）从 32800 起；同终端重连续用已存值"
      },
      {
        "no": 4,
        "cond": "语音/图片分包",
        "result": "串行：本包 TODST=4 后再发下一包；同条消息共用 seq；包失败重试保持 seq/idx"
      }
    ],
    "state": null
  },
  {
    "id": "downlink_dedupe",
    "title": "下行去重与回执",
    "owner": "APP+终端",
    "summary": "APP 去重展示；回执归终端",
    "rules": [
      {
        "no": 1,
        "cond": "同一 platId+idx 重复到达",
        "result": "APP 按 platId,idx 去重"
      },
      {
        "no": 2,
        "cond": "下行文本/语音已打开",
        "result": "本机 UI 可标已读；不发蓝牙已读帧"
      },
      {
        "no": 3,
        "cond": "platId=0 按键短音",
        "result": "进入同一会话列表展示；本机 UI 可标已读"
      },
      {
        "no": 4,
        "cond": "0x05 已读上报",
        "result": "APP 已连：终端推完 TOTXT/TOVOI 后上报；APP 未连：本机播完后上报；APP 不发蓝牙已读帧"
      },
      {
        "no": 5,
        "cond": "会话持久化",
        "result": "按 deviceId 落本地库；不做后连补推错过的下行"
      }
    ],
    "state": null
  },
  {
    "id": "map_toloc",
    "title": "地图坐标来自 TOLOC",
    "owner": "APP",
    "summary": "仅展示本终端；本地底图不占卫星带宽",
    "rules": [
      {
        "no": 1,
        "cond": "locStatus≠1",
        "result": "不显示假坐标，画布提示搜星中或无效"
      },
      {
        "no": 2,
        "cond": "下载/图层/缩放/定位",
        "result": "本地能力，不发卫星指令"
      }
    ],
    "state": null
  },
  {
    "id": "gb2312_chars",
    "title": "不可转码字符",
    "owner": "APP",
    "summary": "文本含无法转 GB2312 的字符则拦截",
    "rules": [
      {
        "no": 1,
        "cond": "输入或粘贴含无法转 GB2312 的字符",
        "result": "Toast 提示，不装进 $TITXT"
      }
    ],
    "state": null
  },
  {
    "id": "send_progress_fail",
    "title": "分包进度与失败原因",
    "owner": "APP",
    "summary": "发送中显示 m/n；失败感叹号展示归纳原因",
    "rules": [
      {
        "no": 1,
        "cond": "整条 UI 为发送中",
        "result": "文案「发送中 m/n」；文本为 1/1"
      },
      {
        "no": 2,
        "cond": "整条 UI 为失败",
        "result": "显示感叹号；点击展示 APP 按 TODST/超时归纳的 failReason"
      },
      {
        "no": 3,
        "cond": "协议无独立失败原因码",
        "result": "不虚构终端原因字段"
      }
    ],
    "state": null
  },
  {
    "id": "query_timeout",
    "title": "查询与上报超时",
    "owner": "APP",
    "summary": "配对指令 5 s；单消息在途",
    "rules": [
      {
        "no": 1,
        "cond": "TIQRY/TILOC/TISIG/TIDSQ/TITXT/TIVOI/TIIMG 发出后 5 s 无对应下行",
        "result": "本轮失败"
      },
      {
        "no": 2,
        "cond": "同时仅一条消息在途",
        "result": "上一条未完成前不发下一条业务消息"
      }
    ],
    "state": null
  },
  {
    "id": "terminal_fw_scope",
    "title": "终端固件工作范围",
    "owner": "终端",
    "summary": "UDP协议 V1.10 不动功能；本期 V1.11 三路上行 + V1.12 号段 + APP 交互协议 v1.8 蓝牙桥；互斥与号段须最小回归",
    "rules": [
      {
        "no": 1,
        "cond": "任意嵌入式开发",
        "result": "不改板级/不换料；UDP协议 V1.10 已实现逻辑不重做（除非修 bug）"
      },
      {
        "no": 2,
        "cond": "UDP协议 V1.10 基线",
        "result": "0x00/0x80/0x01/0x02/0x03/0x05/0x81/0x82/0x83 及附录 A 已实现；本期须回归互斥与号段"
      },
      {
        "no": 3,
        "cond": "UDP协议 V1.11/V1.12 APP 上行与号段",
        "result": "实现 0x10/0x11/0x12；机身短音仍走 0x02，勿混；0x83 回执覆盖这三类；机身 termBizId 0～32767；APP 上行 termBizId=APP seq（32800～65535）；平台须已支持 V1.12"
      },
      {
        "no": 4,
        "cond": "APP 交互协议 v1.8 蓝牙桥",
        "result": "14 条 $xxxx 帧引擎 + GATT；连上推 TOSTA→TOLOC→TOSIG；查询 5s 内答；变化 Notify；联调前须填齐工程附录 GATT 表"
      },
      {
        "no": 5,
        "cond": "桥接发送",
        "result": "TITXT→0x12、TIVOI→0x10、TIIMG→0x11；TODST/TOACK/TIDSQ；条件不足 TODST=0 且不发 UDP；APP 上行 UDP termBizId=APP seq；分包串行等 TODST=4"
      },
      {
        "no": 6,
        "cond": "禁用/用完与互斥",
        "result": "设备禁用时 APP 上报 TODST=0；短音用完仅拦 TIVOI；机身 0x01/0x02 与 APP 上行共用一条在途通道；须回归"
      },
      {
        "no": 7,
        "cond": "通用发送规则",
        "result": "分包有序串行；未联网或 TODST=0 暂停后续发；APP 等待超时属手机侧；0x05 见工程附录"
      }
    ],
    "state": null
  }
]};