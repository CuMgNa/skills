# Claude Code · Windows 多 API 切换方案（CC Switch）

> 适用环境：Windows 10/11 · PowerShell 启动 `claude`  
> 目标：国内中转 ↔ 官方 Anthropic 自由切换；**配置目录共用**（skills / MCP / 历史不拆）  
> 编制日期：2026-07-27  
> 当前机器快照：已写入 §2，实施前请再核对一次  
> **踩坑汇总**：[Claude-Code-CC-Switch-踩坑手册.md](./Claude-Code-CC-Switch-踩坑手册.md)

---

## 1. 背景与目标

### 1.1 现状问题

当前在 **Windows「用户环境变量」** 中写死了：

| 变量 | 作用 |
|------|------|
| `ANTHROPIC_BASE_URL` | 国内 API 网关 |
| `ANTHROPIC_AUTH_TOKEN` | 鉴权 Token |
| `ANTHROPIC_MODEL` | 默认模型名 |
| `CLAUDE_CONFIG_DIR` | Claude Code 配置根目录 |

这种方式**全局唯一**：所有新开的 PowerShell / 终端都走同一套 API，无法在不改系统设置的情况下切换官方与国内。

### 1.2 目标架构

| 需求 | 方案 |
|------|------|
| 多套 API（A：URL+Token，B：模型名） | CC Switch **Provider** 管理 |
| 配置目录不拆分（C 不变） | **保留** `CLAUDE_CONFIG_DIR`，两套 API 共用 |
| 常切换、少记命令 | **CC Switch 桌面版** + 系统托盘 |
| 暂无官方，先国内 | 先启用「国内 Provider」；预留「Official Login」 |
| hooks / MCP / skills | 继续放在 `CLAUDE_CONFIG_DIR` 下，与 Provider 解耦 |

### 1.3 工具选型结论

| 方案 | 结论 |
|------|------|
| CC Switch 桌面版 | **采用**（GUI + 托盘，适合频繁切换） |
| PowerShell 别名 | 备选（本方案不展开） |
| CLI `ccswitch` | 备选（本方案不展开） |

参考：[CC Switch GitHub](https://github.com/farion1231/cc-switch) · [官网](https://ccswitch.co/zh/)

---

## 2. 当前环境快照（本机）

实施前请在本机 PowerShell 执行 `echo $env:CLAUDE_CONFIG_DIR` 等再确认。

| 项 | 当前值 |
|----|--------|
| `CLAUDE_CONFIG_DIR` | `E:\Claude\.claude` |
| `ANTHROPIC_BASE_URL` | `https://api.createbugforyou.online` |
| `ANTHROPIC_AUTH_TOKEN` | 已设置（用户变量，勿写入文档） |
| `ANTHROPIC_MODEL` | `cpa-glm-5.2` |
| `claude` 命令 | `E:\Node.js\node_global\claude.cmd` |
| 配置目录 | `E:\Claude\.claude\`（含 `settings.json`） |
| CC Switch | **未检测到安装**（实施时需新装） |

> **注意**：`C:\Users\33606\.claude\` 也存在 `settings.json`。正式以 **`CLAUDE_CONFIG_DIR=E:\Claude\.claude`** 为准；迁移后避免两套目录混用。

---

## 3. 目标架构图

```
┌─────────────────────────────────────────────────────────┐
│  Windows 用户环境变量（精简后）                            │
│  ✓ CLAUDE_CONFIG_DIR = E:\Claude\.claude   （保留）       │
│  ✗ ANTHROPIC_BASE_URL / AUTH_TOKEN / MODEL （删除）       │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  CC Switch（桌面 / 托盘）                                 │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ 国内 Provider    │  │ Official Login（预留，未启用）│  │
│  │ Base URL + Token  │  │ 将来 /login 订阅登录         │  │
│  │ + 国内模型名      │  │                             │  │
│  └────────┬────────┘  └─────────────────────────────┘  │
│           │ 启用其一 → 写入 Claude Code env 配置         │
└───────────┼─────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────┐
│  E:\Claude\.claude\  （共用，不随 API 切换而复制）        │
│  settings.json · skills · MCP · 会话历史 · CLAUDE.md      │
└───────────┬─────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────┐
│  PowerShell: claude                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 4. 实施步骤（Windows）

### 阶段 0：备份（必做）

1. 复制整个配置目录：
   ```powershell
   Copy-Item -Recurse "E:\Claude\.claude" "E:\Claude\.claude.backup-20260727"
   ```
2. 导出当前用户环境变量（便于回滚）：
   ```powershell
   [Environment]::GetEnvironmentVariable('ANTHROPIC_BASE_URL','User')
   [Environment]::GetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN','User')
   [Environment]::GetEnvironmentVariable('ANTHROPIC_MODEL','User')
   [Environment]::GetEnvironmentVariable('CLAUDE_CONFIG_DIR','User')
   ```
   将输出保存到本地密码管理器或加密笔记（**Token 勿提交 Git**）。

3. 若存在 `E:\Claude\.claude\settings.json`，额外复制一份：
   ```powershell
   Copy-Item "E:\Claude\.claude\settings.json" "E:\Claude\.claude\settings.json.bak"
   ```

---

### 阶段 1：安装 CC Switch

1. 打开 [CC Switch Releases](https://github.com/farion1231/cc-switch/releases) 或 [ccswitch.co](https://ccswitch.co/zh/)。
2. Windows 下载 **MSI**（推荐）或 **Portable ZIP**。
3. 安装完成后启动 CC Switch，确认系统托盘出现图标。
4. （可选）设置 → 开启 **开机自启**、**单实例**，避免多开冲突。

---

### 阶段 2：在 CC Switch 中创建 Provider

#### 2.1 国内 Provider（当前默认）

1. CC Switch 顶部切换到 **Claude Code** 应用。
2. 点击 **+ 添加 Provider**。
3. 建议填写（与当前用户变量对齐，Token 在 GUI 中粘贴，勿写进文档）：

| 字段 | 建议值 |
|------|--------|
| 名称 | `国内-createbug-glm`（自定，便于识别） |
| API Key | 原 `ANTHROPIC_AUTH_TOKEN` 的值 |
| Base URL | `https://api.createbugforyou.online` |
| 模型 | `cpa-glm-5.2` |
| API 格式 | **Anthropic Messages**（原生；若中转要求 OpenAI 兼容再改） |

4. **高级选项**（若 Provider 不通再调整）：
   - Base URL **不要**多余末尾 `/` 或重复 `/v1`（以中转商文档为准）。
   - 若 CC Switch 提示需 **本地路由**：设置 → 路由 → 开启「路由总开关」+「Claude 应用路由」（多见于非 Anthropic 原生协议）。

5. 保存后点击 **启用**。

#### 2.2 官方 Provider（预留，暂不启用）

1. 再 **+ 添加 Provider**。
2. 选择预设 **Official Login** / **Anthropic 官方**。
3. **仅保存，不要启用**。
4. 将来切官方时：启用该 Provider → 新开 PowerShell → `claude` → 执行 `/login` 完成 Pro/Max 登录。

---

### 阶段 3：清理 Windows 用户环境变量

> **关键**：全局 `ANTHROPIC_*` 与 CC Switch 写入的配置会**抢优先级**，必须清理。

#### 方式 A：图形界面（推荐）

1. `Win + R` → 输入 `sysdm.cpl` → **高级** → **环境变量**。
2. 在 **33606 的用户变量** 中：
   - **删除**：`ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN`、`ANTHROPIC_MODEL`
   - **保留**：`CLAUDE_CONFIG_DIR` = `E:\Claude\.claude`
3. 确定保存。

#### 方式 B：PowerShell（需确认后执行）

```powershell
# 删除用户级 ANTHROPIC_*（保留 CLAUDE_CONFIG_DIR）
[Environment]::SetEnvironmentVariable('ANTHROPIC_BASE_URL', $null, 'User')
[Environment]::SetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', $null, 'User')
[Environment]::SetEnvironmentVariable('ANTHROPIC_MODEL', $null, 'User')
# 勿删除 CLAUDE_CONFIG_DIR
```

**必须关闭并重新打开所有 PowerShell / Cursor 终端**，环境变量才会生效。

---

### 阶段 4：确认 CC Switch 写入位置

CC Switch 启用 Provider 后，会更新 Claude Code 相关配置（通常在 `CLAUDE_CONFIG_DIR` 指向的 `settings.json` 的 `env` 段）。

1. 打开 `E:\Claude\.claude\settings.json`，确认存在类似结构（示例，非真实 Token）：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.createbugforyou.online",
    "ANTHROPIC_AUTH_TOKEN": "sk-***",
    "ANTHROPIC_MODEL": "cpa-glm-5.2"
  }
}
```

2. 若 CC Switch 改的是 `C:\Users\33606\.claude\settings.json` 而非 `E:\Claude\.claude\`：
   - 在 CC Switch 设置中指定 Claude 配置路径为 `E:\Claude\.claude`；或
   - 将 CC Switch 写入的 `env` 块**合并**到 `E:\Claude\.claude\settings.json`，并避免两套目录并行使用。

---

### 阶段 5：验证

新开 **PowerShell**（重要）：

```powershell
# 1. 用户变量应已清空 ANTHROPIC_*
$env:ANTHROPIC_BASE_URL
$env:ANTHROPIC_AUTH_TOKEN
$env:ANTHROPIC_MODEL
# 期望：空或未设置

# 2. 配置目录仍在
$env:CLAUDE_CONFIG_DIR
# 期望：E:\Claude\.claude

# 3. 启动 Claude Code
claude
```

在 Claude Code 内：

```
/status
```

核对：模型是否为 `cpa-glm-5.2`（或你在 CC Switch 启用的模型）、endpoint 是否为国内网关。

**切换 smoke test**（官方坑位预留后可测）：

1. CC Switch 托盘 → 启用「国内 Provider」→ `claude` → `/status`
2. （将来）启用「Official Login」→ 新开 `claude` → `/login` → `/status`

---

## 5. 日常使用手册

| 场景 | 操作 |
|------|------|
| 使用国内 API | CC Switch → Claude Code → 启用「国内-createbug-glm」 |
| 将来使用官方 | CC Switch → 启用「Official Login」→ `claude` → `/login` |
| 快速切换 | 系统托盘 CC Switch 图标 → 选择 Provider → 启用 |
| 修改国内 Token/模型 | CC Switch 编辑对应 Provider → 保存 → 重新启用 |
| 查看当前生效配置 | Claude Code 内 `/status` 或 CC Switch 当前启用项 |

**注意**：

- 切换 Provider 后，若 `/status` 未变，退出当前 `claude` 会话再启动。
- **不要**再在 Windows 用户变量里写回 `ANTHROPIC_*`，否则 CC Switch 切换会失效。

---

## 6. 与 Cursor / 其它工具的关系

| 工具 | 是否共用本方案 |
|------|----------------|
| Claude Code（PowerShell `claude`） | **是**，本方案主目标 |
| Cursor IDE 内置模型 | **否**，Cursor 用自身 API/模型设置，与 CC Switch 无关 |
| Claude Desktop | CC Switch 可管，但本方案未展开 |

---

## 7. 风险与注意事项

| 风险 | 缓解 |
|------|------|
| 删用户变量后 CC Switch 未启用 Provider → `claude` 无 Key | 先配好并启用国内 Provider，再删用户变量 |
| 两套 `settings.json`（C 盘 vs E 盘） | 统一以 `CLAUDE_CONFIG_DIR=E:\Claude\.claude` 为准 |
| CC Switch 覆盖 hooks | 启用前备份 `settings.json`；合并时只动 `env` 段 |
| Base URL 格式错误 | 对照中转商文档；常见错误：多余 `/v1`、末尾 `/` |
| Token 泄露 | Token 只放 CC Switch / 密码管理器，不写进 Git 与 Markdown |

---

## 8. 回滚方案

若迁移后无法使用：

1. **恢复用户环境变量**（用阶段 0 备份的值）：
   ```powershell
   [Environment]::SetEnvironmentVariable('ANTHROPIC_BASE_URL', '<原值>', 'User')
   [Environment]::SetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', '<原值>', 'User')
   [Environment]::SetEnvironmentVariable('ANTHROPIC_MODEL', 'cpa-glm-5.2', 'User')
   ```
2. CC Switch 中 **禁用** 所有 Provider（或卸载 CC Switch）。
3. 还原配置目录：
   ```powershell
   Remove-Item -Recurse -Force "E:\Claude\.claude" -ErrorAction SilentlyContinue
   Copy-Item -Recurse "E:\Claude\.claude.backup-20260727" "E:\Claude\.claude"
   ```
4. 新开 PowerShell → `claude` → `/status` 确认恢复。

---

## 9. 实施检查清单

```
阶段 0  备份 E:\Claude\.claude 与 settings.json
阶段 1  安装 CC Switch
阶段 2  创建并启用「国内 Provider」
        创建但不启用「Official Login」预留
阶段 3  删除用户变量 ANTHROPIC_BASE_URL / AUTH_TOKEN / MODEL
        保留 CLAUDE_CONFIG_DIR
阶段 4  确认 settings.json 写在 E:\Claude\.claude
阶段 5  新开 PowerShell → claude → /status 验证
日常    仅通过 CC Switch 切换，不再改系统环境变量
```

---

## 10. 后续扩展（可选）

| 项 | 说明 |
|----|------|
| 第二套国内中转 | CC Switch 再添加 Provider，托盘切换 |
| 官方 API Key（非订阅） | 添加 Provider，填 `ANTHROPIC_API_KEY`，Base URL 留空或官方地址 |
| 用量统计 | CC Switch 内置 Token/费用视图 |
| MCP 统一管理 | CC Switch MCP 页签（与 Provider 切换独立） |

---

## 附录 A：PowerShell 一键查看当前状态（诊断用）

将以下内容保存为 `claude-env-check.ps1`，迁移前后均可运行：

```powershell
Write-Host "=== User env ===" -ForegroundColor Cyan
@('CLAUDE_CONFIG_DIR','ANTHROPIC_BASE_URL','ANTHROPIC_AUTH_TOKEN','ANTHROPIC_API_KEY','ANTHROPIC_MODEL') | ForEach-Object {
  $v = [Environment]::GetEnvironmentVariable($_, 'User')
  if ($_ -match 'TOKEN|KEY' -and $v) { $v = $v.Substring(0, [Math]::Min(4, $v.Length)) + '***' }
  Write-Host "  User.$_ = $(if ($v) { $v } else { '(not set)' })"
}

Write-Host "`n=== Session env ===" -ForegroundColor Cyan
@('CLAUDE_CONFIG_DIR','ANTHROPIC_BASE_URL','ANTHROPIC_AUTH_TOKEN','ANTHROPIC_MODEL') | ForEach-Object {
  $v = (Get-Item "Env:$_" -ErrorAction SilentlyContinue).Value
  if ($_ -match 'TOKEN|KEY' -and $v) { $v = $v.Substring(0, [Math]::Min(4, $v.Length)) + '***' }
  Write-Host "  Session.$_ = $(if ($v) { $v } else { '(not set)' })"
}

$configDir = [Environment]::GetEnvironmentVariable('CLAUDE_CONFIG_DIR', 'User')
if (-not $configDir) { $configDir = "$env:USERPROFILE\.claude" }
$settings = Join-Path $configDir 'settings.json'
Write-Host "`n=== settings.json ===" -ForegroundColor Cyan
Write-Host "  Path: $settings"
Write-Host "  Exists: $(Test-Path $settings)"

Write-Host "`n=== claude binary ===" -ForegroundColor Cyan
Get-Command claude -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
```

---

---

## 11. 实施记录（2026-07-27）

| 阶段 | 状态 | 说明 |
|------|------|------|
| 0 备份 | 已完成 | `E:\Claude\.claude.backup-20260727-115416`；密钥备份 `E:\Claude\env-backup-20260727-115416.json`（勿提交 Git） |
| 1 安装 | 已完成 | CC Switch v3.18.0 → `C:\Users\33606\AppData\Local\Programs\CC Switch\cc-switch.exe` |
| 2 Provider | 已完成 | **国内-createbug-glm**（默认启用）+ **Claude Official**（预留未启用） |
| 3 清用户变量 | 已完成 | 已删用户级 `ANTHROPIC_*`；保留 `CLAUDE_CONFIG_DIR=E:\Claude\.claude` |
| 4 settings | 已完成 | `env`：`https://api.createbugforyou.online` + `cpa-glm-5.2` |
| 5 验证 | 待你确认 | **新开 PowerShell** → `claude` → `/status` |
| 回滚 | 已完成 | 2026-07-27 15:20 起已撤掉后续内网多模型改动，恢复为本表第一版 |

**第一版 Provider 清单（当前）：**

| Provider | Base URL | 模型 | 状态 |
|----------|----------|------|------|
| 国内-createbug-glm | `https://api.createbugforyou.online` | `cpa-glm-5.2` | 可切换 |
| K3 / grok-4.5 等 | 同网关 | 各自模型 ID | 以 CC Switch 当前启用为准 |
| Claude Official | 官方 | — | 预留未启用 |

### 切换不生效（重要）

CC Switch 默认写入 `C:\Users\<用户>\.claude\settings.json`，而本机 Claude Code 通过 `CLAUDE_CONFIG_DIR` 读取 **`E:\Claude\.claude\settings.json`**。两处不同步时，GUI 切换看起来成功，但 `claude` 仍用旧模型。

**切换后请执行同步：**

```powershell
powershell -ExecutionPolicy Bypass -File c:\Users\33606\Desktop\skills\scripts\cc-switch-sync-settings.ps1
```

然后：**新开 PowerShell** → `claude` → `/status`。

也可在 CC Switch 设置里把 Claude 配置目录改成 `E:\Claude\.claude`（若版本提供该选项）。

**本机已配置：** `~/.cc-switch/settings.json` → `"claudeConfigDir": "E:\\Claude\\.claude"`（与 `CLAUDE_CONFIG_DIR` 一致）。切换后应直接写入该目录；若 GUI 仍写到 `~\.claude`，再跑同步脚本。

CC Switch DB：`%USERPROFILE%\.cc-switch\cc-switch.db`

*文档版本：v1.0 恢复 · 路径：`docs/Claude-Code-Windows-CC-Switch-多API切换方案.md`*
