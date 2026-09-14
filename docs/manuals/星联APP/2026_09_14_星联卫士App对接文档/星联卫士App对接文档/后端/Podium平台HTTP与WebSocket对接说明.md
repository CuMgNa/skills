# Podium 平台 HTTP 与 WebSocket 对接说明（服务端视角）

> **pg-podium-monitor** 与 **rescuesat-tcp-platform（rstp）** 对接。  
> Monitor Web 前端消费 REST/WS 字段见 [../前端/](../前端/)。

## 整体数据流

```
救援棒终端 ←UDP→ rstp ←HTTP receive-event→ Podium 入库/路由
                                              ↓ WebSocket
                                    Monitor Web（对讲群 / 求救群 / 平台单聊）
```

反向：**rstp 拉取** Podium `terminal-status/batch`（见 [终端状态跨平台拉取对接说明.md](终端状态跨平台拉取对接说明.md)）。

## HTTP：rstp → Podium（receive-event）

包域：`com.pancoit.podium.controller.datareceiver.rescuesattcpplatform`

| 事件 | 默认路径 | 场景 |
|------|----------|------|
| 终端上下线 | `/api/rescuesat-tcp-platform/receive-event/terminal-online-status` | UDP 登录/断线 |
| 位置上报 | `.../position-report` | 机身 0x01 |
| 语音上报 | `.../speech-report` | 机身 0x02 或 APP 0x10 |
| 文本上报 | `.../text-report` | **APP 0x12** |
| 图像上报 | `.../image-report` | **APP 0x11** |
| 已读回执 | `.../read-ack` | UDP 0x05 |
| 下行状态 | `.../message-status` | rstp 下行生命周期 |
| 链路测试 | `.../test` | 配置探测 |

- **鉴权**：无（内网/专线，与 terminal-status batch 一致）
- **rstp 配置**：管理台「系统配置 → HTTP推送配置」`http.push.*-path` + `base-url`
- **APP 上行**：推送含 `uplinkSource=app`；语音/图像 Podium 侧再调 rstp `GET /admin/protocol/speech-file|image-file/{fileId}`

## 入库路由（对讲群 / 求救群 / 平台单聊）

| 路由 | 条件（摘要） |
|------|----------------|
| 平台单聊 | 默认 |
| 求救群 | 终端 SOS 中 |
| 对讲群 | 终端绑定对讲群 |

入库后 WebSocket 推送规则、REST 字段、UI 取 `fileId` 见 [../前端/上行媒体前端对接说明.md](../前端/上行媒体前端对接说明.md) 与 [../前端/监控平台WebSocket协议.md](../前端/监控平台WebSocket协议.md)。

## HTTP：Podium → rstp（卫星下行）

Podium 发起下行时调用 rstp 管理 API（Header `Authorization` 授权码）：

- `POST /admin/protocol/downlink/text/send`、`speech/send`、`cancel`
- `GET /admin/protocol/downlink/send-log`

详见 rstp 管理台「对外接口」或 OpenAPI `/doc.html`。

## rstp 联调辅助

- 配置 HTTP 推送 base-url 指向 Podium
- 「上行模拟」验证 0x10/0x11/0x12
- 「终端状态拉取记录」查看 batch 结果

## 相关文档

- [Podium侧改动说明.md](Podium侧改动说明.md) — terminal-status batch 增量
- [终端状态跨平台拉取对接说明.md](终端状态跨平台拉取对接说明.md) — 完整契约
- [../前端/README.md](../前端/README.md) — Monitor Web 前端阅读顺序
