# Hermes 测试团队落地 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **架构已改（2026-08-13）：** 业务仓复制到 `E:\qa-team`（不进 `E:\hermes`）。MCP 用户侧清单与 Cursor 对齐，默认只启用禅道。mem0 配上但默认关闭。资源整合放到所有 Task 之后。

**Goal:** 仓库资产复制成 Hermes 侧独立项目；MCP 则按 Cursor 同样的方式做**用户侧配置**（两边各一份，服务器清单对齐）。

**Architecture:** 两层分开，不要混。
- **用户侧配置（同理）：** Cursor = `%USERPROFILE%\.cursor\mcp.json`；Hermes = `E:\hermes\config.yaml` 的 `mcp_servers` + `E:\hermes\.env`。Cursor 有的服务器 Hermes **清单都写上**，密钥进 `.env`，**不写进 qa-team git**。默认会话只 `enabled: true` 禅道；其余 `enabled: false`，按角色再开。mem0 配上但保持关闭（Hermes 自带 memory）。
- **项目资产（复制、互不引用）：** `E:\qa-team` 是新 git 仓，与运行时 `E:\hermes` 并列、不嵌套。`C:\Users\33606\Desktop\skills` 仍给 Cursor。

**Tech Stack:** Hermes Agent 0.20.0（`HERMES_HOME=E:\hermes`）、MiniMax-M3、新项目内 skills / qa-pipeline / 禅道 MCP、Hermes profiles。

## Global Constraints

- 不修改 `E:\hermes\hermes-agent` 源码。
- **项目互不引用：** `terminal.cwd`、`skills.external_dirs`、SOUL、qa-team 仓内脚本 **禁止**再指向 `C:\Users\33606\Desktop\skills`。这不适用于 MCP：MCP 是用户侧配置。
- **MCP 用户侧对齐：** Cursor 有的服务器，Hermes `config.yaml` 里都要有条目。默认只启用 `zentao`。playwright / apifox / postman / notion / 钉钉* 按 profile 再开。`mem0` 永远先 `enabled: false`。密钥在 `E:\hermes\.env`，条目不进 `E:\qa-team`。禅道 stdio 指向本侧 `E:\qa-team\services\qa-pipeline\mcp-server\server.js`。
- **E:\ 权限：** 新建 `E:\qa-team` 后给当前用户 `(OI)(CI)M`，避免再踩 Users:RX。
- 新项目路径固定：`E:\qa-team`（不要把业务代码直接摊在 `E:\hermes` 根上，以免和运行时、密钥、官方源码混在一起）。
- 新项目 `git init`，不沿用 Cursor 仓的 remote / history。
- 密钥只进 `E:\hermes\.env`，不进新项目 git。禁止复制 `docs/design/model.yaml`。
- 默认禅道项目：`【磐钴】位置监控平台-国际化`。
- 阶段 2–3 禁止创建禅道 Bug。
- 人格源复制进新项目后，以新项目 `docs/design/test-team-roles-and-personality.md` 为准。
- 交接只写新项目：`E:\qa-team\output\runtime\handoff\`。
- 验收在普通权限 PowerShell；命令一律 `hermes -p <role>`，不假设 profile 别名已进 PATH。
- 后续整合（两边再合并）不在本计划范围内。

---

## 两套目录（执行后必须长这样）

```text
用户侧 MCP（同构，各配各的）
  Cursor:  %USERPROFILE%\.cursor\mcp.json
  Hermes:  E:\hermes\config.yaml  → mcp_servers
           E:\hermes\.env         → 密钥

E:\hermes\                          Hermes 运行时（不含业务 git）
  hermes-agent\
  config.yaml                       cwd/skills → E:\qa-team；mcp_servers 用户 MCP
  .env
  SOUL.md / profiles\

E:\qa-team\                         ★ 业务仓（独立 git，与运行时并列）
  skills\ services\qa-pipeline\ data\paths\ docs\design\

C:\Users\33606\Desktop\skills       Cursor 业务仓（独立，不链到 Hermes）
```

---

## 复制范围

### 复制（测试团队最小快照）

| 源（Cursor） | 目标 |
|---|---|
| `skills\` | `E:\qa-team\skills\` |
| `services\qa-pipeline\` | `E:\qa-team\services\qa-pipeline\` |
| `data\paths\` | `E:\qa-team\data\paths\` |
| `docs\design\`（排除 `model.yaml`） | `E:\qa-team\docs\design\` |
| `assets\` | `E:\qa-team\assets\` |
| `.gitignore` | 新项目根（再追加 `docs/design/model.yaml`） |

### 不复制

| 排除 | 原因 |
|---|---|
| `.git` | 全新项目，不继承 Cursor remote |
| `node_modules\` `__pycache__\` | 在新项目里重装 |
| `output\runtime\` | 运行时垃圾；避免把 Cursor 的 latest.json 当成 Hermes 交接 |
| `docs\design\model.yaml` | 明文密钥 |
| `docs\personal\` | 个人计划，不是团队运行时 |
| `services\rescue-graph\` | 图谱服务，体积大，MVP 用不到 |
| `.cursor\` `.workbuddy\` | Cursor 专属 |
| `docs\superpowers\plans\` 以外的 manuals/docx | 可第二波再拷；MVP 不需要 |

第二波（整合前按需）：`docs\templates\`、`scripts\`、`docs\_reviews\zentao-cli-review\`。默认第一波不做。

---

### Task 0: 快照复制 + 切断引用 + 独立 git

**Files:**
- Create: `E:\qa-team\`（整树）
- Modify: `E:\hermes\config.yaml`（cwd / external_dirs 改指向新项目）
- Create: `E:\qa-team\README.md`

**Interfaces:**
- Consumes: Cursor 仓只读快照
- Produces: 独立 git 仓；Hermes 只认这一份

- [ ] **Step 1: 建目录并 robocopy（排除清单写进命令）**

```powershell
$src = "C:\Users\33606\Desktop\skills"
$dst = "E:\qa-team"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
icacls $dst /grant "$env:USERDOMAIN\$env:USERNAME:(OI)(CI)M"

# /E 含子目录；/XD /XF 排除；/NFL /NDL 少刷屏
robocopy $src\skills $dst\skills /E /XD node_modules __pycache__ .git /NFL /NDL /NJH /NJS
robocopy $src\services\qa-pipeline $dst\services\qa-pipeline /E /XD node_modules __pycache__ /NFL /NDL /NJH /NJS
robocopy $src\data\paths $dst\data\paths /E /NFL /NDL /NJH /NJS
robocopy $src\docs\design $dst\docs\design /E /XF model.yaml /NFL /NDL /NJH /NJS
robocopy $src\assets $dst\assets /E /NFL /NDL /NJH /NJS
Copy-Item $src\.gitignore $dst\.gitignore -Force

New-Item -ItemType Directory -Force -Path "$dst\output\runtime\handoff" | Out-Null
Set-Content -Path "$dst\output\runtime\handoff\.gitkeep" -Value ""
```

robocopy 退出码 0–7 都算成功。若 `$LASTEXITCODE -ge 8` 则失败，停。

- [ ] **Step 2: 新项目 git init（不设 Cursor remote）**

```powershell
Set-Location E:\qa-team
Add-Content .gitignore "`ndocs/design/model.yaml`n.env`n"
git init
git add .
git status   # 确认没有 model.yaml、没有 node_modules、没有 Desktop 路径下的意外文件
git commit -m "chore: snapshot skills/qa-pipeline/paths from Cursor; independent project"
```

不要 `git remote add` 到 Cursor 仓。

- [ ] **Step 3: 切断引用（在新项目里搜，改新项目，不动 Cursor）**

```powershell
Set-Location E:\qa-team
rg -n "Desktop\\skills|Desktop/skills|\.cursor\\mcp\.json|\.cursor/mcp.json|CURSOR_API_KEY|@cursor/sdk" --glob "!node_modules"
```

对命中文件在**新项目**内改：

| 原引用 | 改为 |
|---|---|
| `C:\Users\33606\Desktop\skills\...` | `E:\qa-team\...` 或相对路径 |
| `~\.cursor\mcp.json` | 项目仓不要读 Cursor 的用户配置。密钥由 Hermes 用户侧 `E:\hermes\.env` 注入进程环境。MCP 条目只写 `E:\hermes\config.yaml`。 |
| `@cursor/sdk` `Agent.prompt` | 阶段 3 前：脚本顶部注明「Hermes 侧禁用；用 CLI 对话代替」。阶段 5 再删依赖 |
| SKILL 里 `@qa-orchestrator` Cursor 触发语 | 改成「在 Hermes 对主管说…」或保留中文意图，去掉 Cursor Task 模板 |

`qa_config.py`（新项目副本）删除对 mcp.json 的回退，或回退改为「仅环境变量，没有就报错」。**不要**再读 Cursor 的 mcp.json。

- [ ] **Step 4: 改 Hermes 配置，去掉对 Cursor 仓的指针**

`E:\hermes\config.yaml`：

```yaml
terminal:
  cwd: E:\qa-team
skills:
  external_dirs:
    - E:\qa-team\skills
```

禁止再出现 `c:\Users\33606\Desktop\skills`。不要建 junction 指回 Desktop。

- [ ] **Step 5: 在新项目重装 qa-pipeline MCP 依赖**

```powershell
$env:Path = "E:\hermes\node;" + $env:Path
Set-Location E:\qa-team\services\qa-pipeline\mcp-server
npm.cmd install
```

- [ ] **Step 6: 隔离验收**

```powershell
# 1) 新项目存在且是 git
Test-Path E:\qa-team\.git
# 2) Hermes 技能来自新项目
$env:HERMES_HOME = "E:\hermes"
hermes skills list   # 23 local
# 3) 新项目内零引用 Cursor 路径
Set-Location E:\qa-team
rg "Desktop\\skills|\.cursor\\mcp" --glob "!node_modules"
# 4) 改新项目一个 SKILL.md 一行，Cursor 仓同一文件不变
```

Expected: rg 无命中（或只剩注释里的「已切断」说明）；Cursor 仓文件 mtime 不变。

- [ ] **Step 7: 把本计划副本放进新项目**

```powershell
New-Item -ItemType Directory -Force -Path E:\qa-team\docs\superpowers\plans | Out-Null
Copy-Item C:\Users\33606\Desktop\skills\docs\superpowers\plans\2026-08-13-hermes-test-team.md `
  E:\qa-team\docs\superpowers\plans\ -Force
```

此后执行以**新项目里这份**为准。Cursor 仓那份仅作历史。

---

### Task 1: 用户侧 MCP 对齐（Hermes 等同 Cursor 的 mcp.json）

Cursor 用户配置：`C:\Users\33606\.cursor\mcp.json`  
Hermes 用户配置：`E:\hermes\config.yaml` + `E:\hermes\.env`  

同理：都是用户侧配置，不是项目仓里的文件。Cursor 有 10 个服务器，Hermes **条目写全、密钥写全**，默认只启用禅道。不要把 MCP 条目 commit 进 `E:\qa-team`。

**Files:**
- Read: `C:\Users\33606\.cursor\mcp.json`（对照清单 + 抄密钥到 Hermes `.env`）
- Modify: `E:\hermes\.env`、`E:\hermes\config.yaml` 仅这两处
- 禅道 stdio 的 `server.js` 用本侧副本路径（Task 0 之后才存在）

**对照表（无密钥）：**

| Cursor `mcpServers` 键 | 类型 | Hermes `mcp_servers` 键 | command / url |
|---|---|---|---|
| zentao | stdio | `zentao` | `node` + `E:\qa-team\services\qa-pipeline\mcp-server\server.js` |
| playwright | stdio npx | `playwright` | `npx -y @playwright/mcp@latest` |
| apifox-jkpt | stdio npx | `apifox-jkpt` | `npx -y apifox-mcp-server@latest --project=8029981` |
| apifox-glht | stdio npx | `apifox-glht` | 同上 `--project=8114235` |
| postmanmcp | stdio npx | `postman` | `npx -y @postman/postman-mcp-server --full` |
| notion | stdio npx | `notion` | `npx -y @notionhq/notion-mcp-server` |
| 钉钉文档 | streamable-http | `dingtalk-docs` | `url:` 从 mcp.json 抄到 `.env` 再 `${DINGTALK_DOCS_MCP_URL}` |
| 钉钉Teambition 项目管理 | streamable-http | `dingtalk-teambition` | `${DINGTALK_TEAMBITION_MCP_URL}` |
| 钉钉日志 | streamable-http | `dingtalk-log` | `${DINGTALK_LOG_MCP_URL}` |
| mem0 | streamable-http | `mem0` | `https://mcp.mem0.ai/mcp` + `Authorization` header |

YAML 键用 ASCII，避免中文键。Cursor 原键名写在注释或本表。

- [ ] **Step 1: 密钥进 `E:\hermes\.env`（用户侧，对齐 mcp.json 的 env/url/headers）**

从 Cursor mcp.json 现读，写入 Hermes `.env`（明文不要进 git、不要进 qa-team）：

```
ZENTAO_URL=
ZENTAO_ACCOUNT=
ZENTAO_PASSWORD=
APIFOX_ACCESS_TOKEN=
POSTMAN_API_KEY=
OPENAPI_MCP_HEADERS=
DINGTALK_DOCS_MCP_URL=
DINGTALK_TEAMBITION_MCP_URL=
DINGTALK_LOG_MCP_URL=
MEM0_API_KEY=
```

UTF-8 无 BOM。

- [ ] **Step 2: 在 `E:\hermes\config.yaml` 写齐 10 个服务器；默认只开禅道**

| 服务器 | 默认 `enabled` | 何时改 true |
|---|---|---|
| zentao | true | 立刻 |
| playwright | false | `regression-runner` / UI 角色 profile |
| apifox-jkpt / apifox-glht / postman | false | `api-test-designer` profile |
| notion / dingtalk-docs / dingtalk-log / dingtalk-teambition | false | `report-writer` / `release-guard` profile |
| mem0 | false | 明确要云端记忆之前保持 false |

stdio 用 `E:\hermes\node`。Windows 若 `node.exe + args` 失败再套 `cmd /c`。

```yaml
mcp_servers:
  zentao:
    command: "E:\\hermes\\node\\node.exe"
    args:
      - "E:\\qa-team\\services\\qa-pipeline\\mcp-server\\server.js"
    env:
      ZENTAO_URL: "${ZENTAO_URL}"
      ZENTAO_ACCOUNT: "${ZENTAO_ACCOUNT}"
      ZENTAO_PASSWORD: "${ZENTAO_PASSWORD}"
    enabled: true
    timeout: 120
  playwright:
    command: "E:\\hermes\\node\\npx.cmd"
    args: ["-y", "@playwright/mcp@latest"]
    enabled: false
  apifox-jkpt:
    command: "E:\\hermes\\node\\npx.cmd"
    args: ["-y", "apifox-mcp-server@latest", "--project=8029981"]
    env:
      APIFOX_ACCESS_TOKEN: "${APIFOX_ACCESS_TOKEN}"
    enabled: false
  apifox-glht:
    command: "E:\\hermes\\node\\npx.cmd"
    args: ["-y", "apifox-mcp-server@latest", "--project=8114235"]
    env:
      APIFOX_ACCESS_TOKEN: "${APIFOX_ACCESS_TOKEN}"
    enabled: false
  postman:
    command: "E:\\hermes\\node\\npx.cmd"
    args: ["-y", "@postman/postman-mcp-server", "--full"]
    env:
      POSTMAN_API_KEY: "${POSTMAN_API_KEY}"
    enabled: false
  notion:
    command: "E:\\hermes\\node\\npx.cmd"
    args: ["-y", "@notionhq/notion-mcp-server"]
    env:
      OPENAPI_MCP_HEADERS: "${OPENAPI_MCP_HEADERS}"
    enabled: false
  dingtalk-docs:
    url: "${DINGTALK_DOCS_MCP_URL}"
    enabled: false
  dingtalk-teambition:
    url: "${DINGTALK_TEAMBITION_MCP_URL}"
    enabled: false
  dingtalk-log:
    url: "${DINGTALK_LOG_MCP_URL}"
    enabled: false
  mem0:
    url: "https://mcp.mem0.ai/mcp"
    headers:
      Authorization: "Bearer ${MEM0_API_KEY}"
    enabled: false
```

清单与 Cursor 对齐；**不要**把默认会话的工具表塞满。写禅道纪律仍靠 SOUL / intake dryRun，不靠删掉用户侧条目。

- [ ] **Step 3: 探测默认启用的禅道；其余可选**

```powershell
$env:HERMES_HOME = "E:\hermes"
hermes mcp test zentao
```

Expected: 禅道通。其余服务器因 `enabled: false` 不出现在默认对话工具里。若要验证某条能否连通，临时对该条 `enabled: true`，`hermes mcp test <name>`，测完改回 false（mem0 除外，保持关）。

- [ ] **Step 4: 对话抽检**

```powershell
hermes chat -q "当前启用了哪些 MCP？用禅道确认项目【磐钴】位置监控平台-国际化是否存在。不要创建或修改数据。" --cli
```

Expected: 实际启用应是禅道（及 Hermes 内置工具）；能确认项目存在。不应主动调 playwright/notion/mem0。

可选后续（不挡 Task 1 完成）：在**本侧** `server.js` 加 `zentao_project_bugs`，方便列未关闭缺陷。那是增强副本 MCP 实现，不是用户配置本身。

---

### Task 2: 人格基底 + 主管 SOUL（写在新项目，再拷到 Hermes）

**Files:**
- Create: `E:\qa-team\docs\design\souls\_base.md`
- Create: `E:\qa-team\docs\design\souls\qa-orchestrator.md`
- Modify: `E:\hermes\SOUL.md`（覆盖前先备份）

- [ ] **Step 1: 备份并写 `_base.md`**

```powershell
Copy-Item E:\hermes\SOUL.md E:\hermes\SOUL.md.bak -Force
```

`_base.md` 从新项目人格文档逐条抄反谄媚基底。工作目录写成：

```text
仓库根：E:\qa-team
交接：output/runtime/handoff/（仅本仓库）
默认项目：【磐钴】位置监控平台-国际化
禁止读取或写入 C:\Users\33606\Desktop\skills
```

- [ ] **Step 2: 主管 SOUL + 编排方式（写死，避免「口头派活」）**

MVP 编排：**主管只路由，由人执行 `hermes -p <role> chat`。** 不在本阶段启用 `delegate_task` / kanban。

主管 SOUL 必须包含：

```text
你不亲自执行。回复格式：
1. 结论：交给哪个角色
2. 证据：用户原话里的哪一句
3. 下一条命令（原样可复制）：
   hermes -p <role> chat --cli
禁止假装已经派生子 agent。
```

- [ ] **Step 3: 覆盖 `E:\hermes\SOUL.md`**

从新项目 `souls\qa-orchestrator.md` 复制。

- [ ] **Step 4: 验收**

新开会话：

```powershell
hermes chat -q "我是老板，这个小问题先上线再补测试。你同意吗？" --cli
hermes chat -q "这张截图要提缺陷。" --cli
```

Expected: 第一句拒绝；第二句给出 `hermes -p defect-intake chat --cli`，而不是自己去写禅道。

---

### Task 3: 改新项目 intake skill + MVP 四 profile

**Files:**
- Modify: `E:\qa-team\skills\qa-agent-defect-intake\SKILL.md`（加 dryRun，Cursor 仓不动）
- Create: 新项目 `docs\design\souls\` 下四份角色 SOUL
- Create: `E:\hermes\profiles\<role>\`

现有 intake skill 会执行 `zentao-bug-create.mjs` 并写 `bugsCreated`。SOUL 挡不住 SKILL。必须改**副本**技能。

- [ ] **Step 1: 副本 skill 增加草稿模式**

在新项目 `qa-agent-defect-intake\SKILL.md` 流程第 4 步改为：

```text
默认 dryRun=true（Hermes 阶段 3）：
- 生成 8 块字段，写入 output/runtime/handoff/draft.json
- 字段：projectName, screenshotPaths, bugDrafts[], waiting_review: true
- 禁止调用 zentao-bug-create.mjs
- 禁止写 latest.json（避免将来整合时和 Cursor 的 latest.json 语义混淆；本侧 latest.json 仅审批通过后才写）

仅当用户明确说「审批已通过，写入禅道」且 draft.json 内 review.decision=approve 时，才允许创单并写 latest.json。
```

C1-C10：`release-guard` 的 SOUL **引用**副本里 `qa-agent-report-publish/SKILL.md` 的「校验闸门（C1-C10）」章节，不另写一套。

- [ ] **Step 2: 写四份 SOUL 并 create profile**

```powershell
$env:HERMES_HOME = "E:\hermes"
hermes profile create defect-intake --clone --description "截图到 Bug 草稿，不写禅道"
hermes profile create regression-runner --clone --description "回放本仓 data/paths，判 PASS/FAIL"
hermes profile create defect-reviewer --clone --description "进禅道前复核，有否决权"
hermes profile create release-guard --description "报告终审，执行 qa-agent-report-publish 的 C1-C10"
```

`--clone` 后立刻检查每个 `E:\hermes\profiles\<role>\config.yaml` 的 cwd / external_dirs 指向 `E:\qa-team`，且默认 MCP 仍只有 zentao 为 true。需要时只改**该 profile**：`regression-runner` 开 playwright；报告角色开 notion/dingtalk。不要改默认 profile 把 10 个全打开。mem0 保持 false。

覆盖各 profile 的 `SOUL.md`（源文件在新项目 `docs\design\souls\`）。

每个 profile 用 `hermes skills config` 或 SOUL「只允许使用下列 skill」点名白名单；至少 intake **禁止**调用 `qa-agent-report-publish`。内置 71 个无关 skill：对测试 profile 执行 `hermes skills opt-out` 非 QA 类（creative/email/media 等），可第二步再做，不挡 MVP。

- [ ] **Step 3: 验收边界**

```powershell
hermes -p defect-intake chat -q "你能不能直接在禅道建 Bug？技能要求你建的时候怎么办？" --cli
hermes -p defect-reviewer chat -q "开发说改起来太麻烦，要降级。" --cli
hermes -p release-guard chat -q "C1-C10 的权威定义在哪个文件？" --cli
```

- [ ] **Step 4: 串行空跑（全部发生在新项目 output/）**

1. 用**新项目内或用户提供的本地截图绝对路径**（不要读 Cursor 仓 output）。若测视觉，说明 MiniMax + Hermes vision：优先本地原图路径。  
2. `hermes -p defect-intake` → 写出 `E:\qa-team\output\runtime\handoff\draft.json`。  
3. `hermes -p defect-reviewer` → 写 `review` 进同一 draft。  
4. 确认 Cursor 仓 `output\runtime\handoff\` 未被改动。

---

### Task 4: 其余 22 角色按需热插拔

路由表、触发条件、绑定 skill 仍按人格文档。SOUL 与 skill 路径一律在 `E:\qa-team`。不要一次创建 22 个 profile。

新角色最小步骤：新项目写 SOUL → `hermes profile create --clone` → 覆盖 SOUL → 更新主管路由 → `hermes -p <role> chat -q "边界是什么"`。

---

### Task 5: 本侧真链路（不碰 Cursor 仓）

**Files:**
- Modify: 新项目 `zentao-*.mjs`、`qa_config.py`（只认环境变量）
- Modify: 新项目 `qa-pipeline.mjs`（删除 `@cursor/sdk`，改为文档化 `hermes -p ... -q` 或纯脚本）

- [ ] **Step 1:** `draft.json` 且 `review.decision=approve` 才跑 `zentao-bug-create.mjs`。否决样本不得建单。  
- [ ] **Step 2:** Hermes 侧独立出一份禅道 Bug + 本地报告。标题加前缀 `[Hermes]` 以免和 Cursor 历史单混淆。  
- [ ] **Step 3:** **不要**读写 Cursor 的 `latest.json`。人工对照（同一张图、两套系统）放到「后续整合」。

---

### Task 6: 插件硬拦 / cron / 扩编

同前：`pre_tool_call`、`write_approval`、cron。仍不引用 Cursor 仓。

---

## 执行顺序

```text
Task 0 快照复制 + 项目断引用 + 独立 git
  → Task 1 用户侧 MCP 清单对齐（默认只开禅道，mem0 保持关）
    → Task 2 主管 SOUL（人切 hermes -p）
      → Task 3 改副本 intake + 四 profile + draft.json
        → Task 4 按需扩角色
          → Task 5 本侧真写禅道（标题加 [Hermes]）
            → Task 6 插件硬拦
              → （计划外）与 Cursor 仓资源整合
```

| 完成 Task | 出口标准 |
|---|---|
| 0 | 新仓独立 git；rg 无 Desktop\skills 与 .cursor\mcp；Hermes cwd 指向新仓 |
| 1 | 10 个 MCP 条目都在用户配置里；默认会话只加载禅道且探测通过；mem0 为 false |
| 2 | 拒绝先上线；提缺陷时给出 `hermes -p defect-intake` 命令 |
| 3 | draft.json 在新仓；Cursor 仓 handoff 未变 |
| 4 | 新角色三步可加 |
| 5 | 本侧可建带 `[Hermes]` 前缀的单；不写 Cursor 仓 |
| 6 | 否决时工具层拦住 |

---

## Spec coverage

- 复制资产到 Hermes → Task 0（快照 + 排除 + 断引用）  
- MCP → Task 1（用户侧清单对齐 Cursor；默认只开禅道；mem0 配上关闭）  
- 角色团队 → Task 2–4  
- 真链路 → Task 5（本侧独立）  
- 整合 → **明确推迟，本计划不做**

## 本计划刻意不包含

- 修改 Cursor 仓库任何文件  
- junction / `skills.external_dirs` 指回 Desktop\skills  
- 把业务仓嵌进 `E:\hermes\`（含 `projects\`）  
- 把 `data/paths` 拷进 `E:\hermes\memories`  
- 一次 27 个 profile  
- 密钥进 git  
- 现在做两边资源整合  
