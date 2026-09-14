# Podium 侧改动说明（terminal-status 拉取）

> 模块：**pg-podium-monitor**  
> 与 rstp→Podium **推送**（`RestpReceiveController` / receive-event）方向相反；同属 `rescuesattcpplatform` 对接域。

## 本次新增（commit `70e6e19ac`，分支 `dev`）

| 类/文件 | 职责 |
|---------|------|
| `RestpTerminalStatusController` | `POST /api/rescuesat-tcp-platform/terminal-status/batch` |
| `TerminalQuotaStatusService` | 绑定判定、套餐/欠费/星豆 → 五元布尔状态 |
| `TerminalStatusBatchRequest` / `TerminalStatusRemoteItemDto` | 请求/响应 DTO |
| `EmergencyTcpServerConfig` | 短音/报位「不足」阈值（默认 10） |
| `TerminalQuotaStatusServiceTest` | 单测 6 用例 |

## 业务规则摘要

- **企业绑定**：五元状态全 `false`，不查套餐
- **仅个人绑定**：按套餐 + 星豆计算 insufficient / exhausted
- **无绑定**：全 `false`
- **`deviceDisabled`**：本期恒 `false`（预留）
- **批量上限**：100（与 rstp `batch-size` 对齐），超限返回错误

## 说明

该接口为 **rstp 服务端 → Podium 后端** 内网调用；Monitor Web 前端**不直接消费**。  
HTTP 事件接收与 WebSocket 群消息见 [Podium平台HTTP与WebSocket对接说明.md](Podium平台HTTP与WebSocket对接说明.md)；前端 REST/WS 字段见 [../前端/](../前端/)。

完整契约：[终端状态跨平台拉取对接说明.md](终端状态跨平台拉取对接说明.md)
