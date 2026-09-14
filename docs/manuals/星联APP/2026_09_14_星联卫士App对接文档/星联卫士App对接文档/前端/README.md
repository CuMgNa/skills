# Podium Monitor Web 前端对接

> 面向 **pg-podium-monitor** 监控平台 Web 前端；与 [需求文档/](../需求文档/)（星联卫士手机 App PRD）分离。

## 阅读顺序

1. [监控平台WebSocket协议.md](监控平台WebSocket协议.md) — 连接 `/ws`、登录 type 10、全量 type 字典
2. [上行媒体前端对接说明.md](上行媒体前端对接说明.md) — **主文档**：TEXT / IMAGE / VOICE × 平台单聊 / 对讲群 / 求救群
3. [图像上行前端对接说明.md](图像上行前端对接说明.md) — 图像专题（type 20/21、imageInfo）
4. [Podium 服务端对接](../后端/Podium平台HTTP与WebSocket对接说明.md) — rstp → Podium receive-event（联调背景）

## 三路由速查

| 路由 | 列表 REST | WS type | 媒体取址 |
|------|-----------|---------|----------|
| 平台单聊 | `GET /api/monitor/platform-chats/{addr}` | 20 (+21 仅 IMAGE) | `imageInfo.fileId` / 文本明文 |
| 对讲群 | `GET /api/monitor/intercom/message/page` | 103 / 104 | IMAGE/VOICE：`content=fileId` |
| 求救群 | `GET /api/monitor/emergency/chat/record/page` | 100 | 同上 |

鉴权：Monitor 登录态 **Token**。
