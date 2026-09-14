window.MOCK={
  "region": "default",
  "regionKeys": [
    "default"
  ],
  "regionMeta": {
    "default": {
      "short": "Default",
      "label": "默认"
    }
  },
  "device": {
    "deviceId": "123456789012",
    "battery": 85,
    "netStatus": 2,
    "signalBars": 4,
    "locStatus": 1,
    "lat": 39.904987,
    "lon": 116.407394,
    "sosStatus": 0,
    "connectedSeconds": 5
  },
  "appVersion": "V1.2.1",
  "cmdLog": [
    {
      "dir": "RX",
      "frame": "$TOSTA,123456789012,85,0,1,2*4D",
      "ttMod": 1,
      "ts": "12:00:01"
    },
    {
      "dir": "RX",
      "frame": "$TOLOC,1,39.904987,116.407394,1724572800*58",
      "ts": "12:00:01"
    },
    {
      "dir": "RX",
      "frame": "$TOSIG,-70,1,12345,25*6B",
      "ts": "12:00:02"
    },
    {
      "dir": "RX",
      "frame": "$TOACK,1,9001,1*75",
      "ts": "12:00:05"
    },
    {
      "dir": "RX",
      "frame": "$TODST,1,4*5C",
      "ts": "12:00:05"
    }
  ],
  "authLicenses": {
    "voice": {
      "status": "expired",
      "expireDate": "2024-08-25",
      "hint": "授权已超过有效期",
      "records": [
        {
          "deviceId": "EIHDEHHEJJJIIFE",
          "effectiveAt": "2024-05-06 14:09:00",
          "expireAt": "2024-08-25 14:09:00",
          "totalCalls": 10,
          "usedCalls": 10,
          "remainCalls": 0
        }
      ]
    },
    "image": {
      "status": "permanent",
      "expireDate": "永久有效",
      "hint": "授权永久有效",
      "records": [
        {
          "deviceId": "EIHDEHHEJJJIIFE",
          "effectiveAt": "2025-05-06 14:09:00",
          "expireAt": "永久有效",
          "totalCalls": 10,
          "usedCalls": 5,
          "remainCalls": 5
        }
      ]
    },
    "app": {
      "status": "permanent",
      "expireDate": "永久有效",
      "hint": "授权永久有效",
      "records": [
        {
          "deviceId": "EIHDEHHEJJJIIFE",
          "effectiveAt": "2025-05-06 14:09:00",
          "expireAt": "永久有效",
          "totalCalls": 10,
          "usedCalls": 5,
          "remainCalls": 5
        }
      ]
    }
  },
  "phrases": [
    "我在这里一切正常",
    "麻烦各位队友报一下自己的位置",
    "我已经安全到达目的地"
  ],
  "chat": [
    {
      "dir": "in",
      "type": "text",
      "text": "请确认位置安全",
      "platId": "80003",
      "ts": "15:28"
    },
    {
      "dir": "in",
      "type": "voice",
      "duration": 3,
      "platId": "80001",
      "ts": "15:30"
    },
    {
      "dir": "out",
      "type": "voice",
      "duration": 3,
      "uiStatus": "success",
      "pktDone": 3,
      "pktTotal": 3,
      "ts": "15:30"
    },
    {
      "dir": "out",
      "type": "voice",
      "duration": 3,
      "uiStatus": "failed",
      "pktDone": 2,
      "pktTotal": 3,
      "failReason": "本包发送失败已满 3 次",
      "ts": "15:31"
    },
    {
      "dir": "out",
      "type": "voice",
      "duration": 3,
      "uiStatus": "sending",
      "pktDone": 2,
      "pktTotal": 3,
      "ts": "15:32"
    },
    {
      "dir": "out",
      "type": "image",
      "uiStatus": "sending",
      "pktDone": 2,
      "pktTotal": 5,
      "ts": "15:33"
    },
    {
      "dir": "out",
      "type": "text",
      "text": "等待卫星可用",
      "uiStatus": "waiting",
      "ts": "15:34"
    },
    {
      "dir": "out",
      "type": "image",
      "uiStatus": "failed",
      "pktDone": 1,
      "pktTotal": 5,
      "failReason": "已发出后 10 秒未收到平台回执",
      "ts": "15:35"
    }
  ],
  "messages": [
    {
      "msgType": 1,
      "platformBizId": "80001",
      "preview": "下行文本示例",
      "ts": 1724572800,
      "read": false
    },
    {
      "msgType": 2,
      "platformBizId": "80002",
      "preview": "语音 3 秒",
      "ts": 1724572860,
      "read": false
    }
  ],
  "waitTimeoutMinutes": 10,
  "waitTimeoutOptions": [
    5,
    10,
    15,
    30,
    60
  ]
};