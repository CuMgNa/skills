# Claude Code + CC Switch 踩坑手册（Windows）

> 适用：Windows 10/11 · PowerShell 启动 `claude` · CC Switch 桌面版  
> 关联方案：[Claude-Code-Windows-CC-Switch-多API切换方案.md](./Claude-Code-Windows-CC-Switch-多API切换方案.md)  
> 整理日期：2026-07-27  
> 来源：本机实际排查与回滚过程中的问题汇总

---

## 0. 本机关键路径（先记牢）

| 用途 | 路径 |
|------|------|
| Claude Code 配置目录（环境变量） | `CLAUDE_CONFIG_DIR=E:\Claude\.claude` |
| Claude 实际读取的 settings | `E:\Claude\.claude\settings.json` |
| CC Switch 默认曾写入的 settings | `C:\Users\33606\.claude\settings.json` |
| CC Switch 设备设置 | `%USERPROFILE%\.cc-switch\settings.json` |
| CC Switch 数据库 | `%USERPROFILE%\.cc-switch\cc-switch.db` |
| 同步脚本 | `scripts/cc-switch-sync-settings.ps1` |
| 网关检测脚本 | `scripts/claude-gateway-check.ps1` |
| 环境检查脚本 | `scripts/claude-env-check.ps1` |

**本机已设置（应保持）：**

```json
// %USERPROFILE%\.cc-switch\settings.json
"claudeConfigDir": "E:\\Claude\\.claude"
```

与 `CLAUDE_CONFIG_DIR` 一致后，切换 Provider 应直接写入 E 盘；若仍不同步，再跑同步脚本。

---

## 1. 双配置目录（切换不生效的主因）

### 现象

在 CC Switch 里启用了 K3 / grok / createbug，界面显示已切换，但 `claude` → `/status` 仍是旧模型。

### 原因

| 写入方 | 路径 |
|--------|------|
| CC Switch（未指定目录时） | `~\.claude\settings.json` |
| Claude Code（本机） | `E:\Claude\.claude\settings.json` |

两边不是同一个文件。

### 处理

1. 在 CC Switch 设备设置中配置：
   ```json
   "claudeConfigDir": "E:\\Claude\\.claude"
   ```
2. 或切换后手动同步：
   ```powershell
   powershell -ExecutionPolicy Bypass -File c:\Users\33606\Desktop\skills\scripts\cc-switch-sync-settings.ps1
   ```
3. **新开 PowerShell** → `claude` → `/status`

---

## 2. 旧终端缓存环境变量

### 现象

已删除用户级 `ANTHROPIC_BASE_URL` / `AUTH_TOKEN` / `MODEL`，但 Claude 仍走旧网关或旧 Key。

### 原因

已打开的 PowerShell / Cursor 终端会**缓存进程环境变量**，优先级高于 `settings.json`。

### 处理

- 切换 Provider 后：**关掉 Claude Code，新开终端**，再运行 `claude`
- 检查用户变量（应为空）：
  ```powershell
  [Environment]::GetEnvironmentVariable('ANTHROPIC_BASE_URL','User')
  [Environment]::GetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN','User')
  [Environment]::GetEnvironmentVariable('ANTHROPIC_MODEL','User')
  ```
- **保留**：`CLAUDE_CONFIG_DIR=E:\Claude\.claude`

---

## 3. Provider 名 ≠ `ANTHROPIC_MODEL`

### 现象

CC Switch 里 Provider 名叫「K3」，启用后实际仍在用 `cpa-glm-5.2`。

### 原因

新建 Provider 时常**复制上一份 JSON**：

- 界面名称改成了 `K3`
- 但 `env.ANTHROPIC_MODEL` 仍是 `cpa-glm-5.2`
- `ANTHROPIC_DEFAULT_SONNET_MODEL` 等字段**不会覆盖**主字段 `ANTHROPIC_MODEL`

### 处理

打开该 Provider 的「配置 JSON」，确认：

```json
"ANTHROPIC_MODEL": "K3"
```

推荐每个 Provider 的 `env` **只保留 3 个字段**，避免 DEFAULT_* 干扰：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.createbugforyou.online",
    "ANTHROPIC_AUTH_TOKEN": "sk-***",
    "ANTHROPIC_MODEL": "K3"
  }
}
```

---

## 4. 模型 ID 必须与网关一致

### 现象

`There's an issue with the selected model (xxx)` 或 HTTP 502：`unknown provider for model xxx`。

### 本机实测参考

| 模型 ID | 常见结果 | 说明 |
|---------|----------|------|
| `cpa-glm-5.2` | 可用 | createbug / 原配置可用名 |
| `K3` | 视网关而定 | MODEL 字段必须真是 `K3` |
| `GLM-5.2` | 不稳定 | 与 `cpa-glm-5.2` 不是同一套命名 |
| `grok-4.5` | 部分网关无 | 内网曾报 `unknown provider` |
| `claude-fable-5` | 部分网关无 | 同上 |
| `glm-5.2`（全小写） | 曾失败 | 大小写敏感 |

清单文件里有的模型 ≠ 当前网关一定已挂载。

### 处理

先对目标 Base URL 做探测（见 §12），再用探测成功的**精确模型名**写入 `ANTHROPIC_MODEL`。

---

## 5. 鉴权字段用错

### 正确写法

| 场景 | 认证方式 |
|------|----------|
| Claude Code / CC Switch | `ANTHROPIC_AUTH_TOKEN`（客户端会带成 `x-api-key`） |
| `POST /v1/messages` | `x-api-key: sk-***` **或** `Authorization: Bearer sk-***` |
| `POST /v1/chat/completions` | 只用 `Authorization: Bearer sk-***` |

### 错误写法

- 单独使用 `api-key:` 头 → 常见 `Missing API key` / 401
- 混用过期的内网清单 Key 与 createbug Key → 401 `Invalid API key`

本机经验：内网清单 Key（`sk-fXKA…`）曾被拒；**createbug Key（`sk-2w1Xd…`）** 可用。Token **勿提交 Git**。

---

## 6. Base URL 踩坑

| 写法 | 风险 |
|------|------|
| `http://localhost:8317` | 本机可能未监听回环，TCP 不通 |
| `http://192.168.0.217:8317` | 内网网关常见可用地址 |
| 是否带 `/v1` | Claude Code 可能再拼 `/v1/messages`；带重复 `/v1/v1` 会 404 |
| `https://api.createbugforyou.online` | 方案第一版默认；以中转文档为准 |

createbug 根地址探测曾返回：`POST /v1/chat/completions` 等端点（CLI Proxy API Server）。

---

## 7. API 格式与本地路由

| 情况 | 建议 |
|------|------|
| Anthropic Messages 原生 | 一般可直连，不必强开本地路由 |
| OpenAI Chat / Responses | 常需 CC Switch **本地路由**做协议转换 |
| `enableLocalProxy` / 端口 15721 | 未开启或 `proxy_config.enabled=0` 时，走 15721 会超时 |

`common_config_claude` 里若残留：

```json
"OPENAI_BASE_URL": "http://192.168.0.217:8317/v1"
```

可能污染所有切换，建议保持为空对象 `"env": {}`（除非你明确需要公共注入）。

---

## 8. Claude Code 客户端模型校验 / 虚假 Sonnet

### 现象

- 顶栏显示 **Sonnet 4.6**，报错却写 `cpa-glm-5.2` / `GLM-5.2`
- 或自定义模型名在**未发请求**时就被拒

### 原因

- 用 `modelOverrides` 把 `claude-sonnet-4-6` 映射到第三方模型 → UI 显示 Sonnet，实际请求另一模型
- 把所有 `ANTHROPIC_DEFAULT_*_MODEL` 指到自定义名，界面档位名仍可能显示 Sonnet

### 处理

- **不要**用 Sonnet 映射糊弄；保持 `ANTHROPIC_MODEL` 为真实网关模型名
- 删除无意义的 `modelOverrides` / 多余 DEFAULT_* 字段

---

## 9. 改 CC Switch 数据库的注意点

1. **先结束** `cc-switch` 进程，再改 `cc-switch.db`，否则会被覆盖或锁库  
2. SQLite 同一 cursor **边 iterate 边 UPDATE** 可能漏改；应先 `fetchall` 再写  
3. 改完后重启 CC Switch，并核对 `E:\Claude\.claude\settings.json` 是否已同步  

---

## 10. 用户环境变量与 CC Switch 抢优先级

全局用户变量中的 `ANTHROPIC_*` 会与 CC Switch 写入的 `settings.json` **抢优先级**。

方案约定：

| 变量 | 策略 |
|------|------|
| `CLAUDE_CONFIG_DIR` | **保留** `E:\Claude\.claude` |
| `ANTHROPIC_BASE_URL` | **删除**（交给 CC Switch） |
| `ANTHROPIC_AUTH_TOKEN` | **删除** |
| `ANTHROPIC_MODEL` | **删除** |

---

## 11. 推荐切换流程（Checklist）

1. CC Switch → Claude Code → 启用目标 Provider  
2. 打开「配置 JSON」，确认 `ANTHROPIC_MODEL` / `BASE_URL` / Token  
3. 确认 `claudeConfigDir` 已是 `E:\Claude\.claude`；若不确定则跑同步脚本  
4. **关闭**当前 Claude Code  
5. **新开** PowerShell  
6. `claude` → `/status` 核对模型与 Base  
7. 发一句简单对话验证  

同步命令：

```powershell
powershell -ExecutionPolicy Bypass -File c:\Users\33606\Desktop\skills\scripts\cc-switch-sync-settings.ps1
```

---

## 12. 快速诊断命令

### 环境与 settings

```powershell
powershell -ExecutionPolicy Bypass -File c:\Users\33606\Desktop\skills\scripts\claude-env-check.ps1
```

### 网关连通性

```powershell
powershell -ExecutionPolicy Bypass -File c:\Users\33606\Desktop\skills\scripts\claude-gateway-check.ps1
```

### 对比「CC Switch 当前」与「E 盘 settings」

看 `%USERPROFILE%\.cc-switch\cc-switch.db` 中 `is_current=1` 的 Provider，其 `ANTHROPIC_MODEL` 是否等于 `E:\Claude\.claude\settings.json` → `env.ANTHROPIC_MODEL`。不一致即切换未落到 Claude 读取路径。

### Anthropic 探测示例

```powershell
$key = "你的Key"
$body = '{"model":"cpa-glm-5.2","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}'
Invoke-RestMethod -Uri "https://api.createbugforyou.online/v1/messages" -Method POST -Headers @{
  "x-api-key" = $key
  "anthropic-version" = "2023-06-01"
  "content-type" = "application/json"
} -Body $body
```

---

## 13. 回滚与备份

| 备份 | 路径 |
|------|------|
| 配置目录备份 | `E:\Claude\.claude.backup-20260727-115416` |
| 环境变量备份（含 Token，勿提交 Git） | `E:\Claude\env-backup-20260727-115416.json` |

方案文档「第一版」目标状态：

- Provider：`国内-createbug-glm`（`cpa-glm-5.2` + `https://api.createbugforyou.online`）  
- 预留：`Claude Official`（未启用）  
- 用户变量：仅 `CLAUDE_CONFIG_DIR`  

后续自行增加的 K3 / grok 等，以 CC Switch 当前启用为准，并遵守本文 §3、§11。

---

## 14. 问题 → 排查索引

| 现象 | 优先查 |
|------|--------|
| 切换模型不生效 | §1 双目录、§2 旧终端、§11 Checklist |
| 启用了 K3 仍是 glm | §3 `ANTHROPIC_MODEL` |
| selected model 报错 / unknown provider | §4 模型 ID、§5 Key、§6 Base |
| 401 / Invalid API key | §5 鉴权与 Key |
| 顶栏 Sonnet、实际别的模型 | §8 去掉 overrides |
| 15721 超时 | §7 本地路由 |
| localhost 不通 | §6 改用内网 IP 或确认服务监听 |

---

*文档版本：v1.0 · 路径：`docs/Claude-Code-CC-Switch-踩坑手册.md`*
