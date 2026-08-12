# 仓库结构重组设计（SDET 工具箱 monorepo）

> **状态**：设计待审批 · 未执行任何搬移
> **日期**：2026-08-12
> **作者**：Claude（经主人拷问式访谈后落定）
> **红线**：只重组"组织"（目录/命名/产物隔离/引用重写）+ 补齐缺失 frontmatter；**技能正文一字不动，不删任何数据**。

---

## 0. 这份文档解决什么

主人原话痛点：**「脚本文档技能排版极其错乱，没有规范，子目录 mcp 又包含脚本之类，不符合通用项目组织架构，不方便其余成员接收」**。

经拷问澄清，真问题不是"文件内部排版乱"，而是**物理组织混乱**——一个叫 `skill/` 的壳子里同时塞了：技能文档（SKILL.md）、一个 Node+Python 混编的 QA pipeline/MCP server（server.js + scripts/ + lib/）、几百张运行时回归截图（output/handoff）、主资产路径录制（paths/）。新人打开 `skill/` 会撞上一坨代码和截图，根本不知道自己在哪。

本设计把这堆"四不像"拆成**职能平级的 monorepo**。

---

## 1. 仓库定位

**SDET 工具箱 monorepo**。技能（skills）、QA 流水线代码（services）、运维脚本（scripts）、文档（docs）、共享资产（assets）都是平级一等公民，谁也不寄人篱下。`skill/mcp/` 这种"技能壳里寄生 server 代码"的结构是头号要拆的。

---

## 2. 目标结构总图

```
skills/                       # 21 个 Claude 技能（原名不动，从 skill/skills/* 平移）
services/
  qa-pipeline/                # 原 skill/mcp 的代码，按功能子系统分（见 §3）
    mcp-server/               # server.js + package.json + package-lock.json（MCP 服务）
    regression/               # record-path / regress* / path-replay-lib / cdp-connect / regression-shoot.py（录制+回归+回放）
    reporting/                # publish_report / bugstats + defect-image-extract / filter-active-bugs（出报告）
      lib/                    # ★ lib 整体不拆（9个.py + report_templates/），sys.path hack 假设同居一目录
    zentao/                   # zentao-bug-create / summary / upload（禅道交互）
    dingtalk_msg.json         # 钉钉消息模板（reporting 用，取消原 shared/ 子目录）
    tests/                    # 测试
    README.md                 # ← 原 mcp/scripts/README-qa-pipeline.md
  rescue-graph/               # ★[F1] emergency-rescue-graph 扶正为第二个平级服务（见 §11.1）
    build_graph.py            # 自定位 Path(__file__).parent，零引用风险
    scripts/ formal/ candidates/ graphify-out/
    ADR-001-*.md  RUNBOOK.md
scripts/                      # 通用运维脚本（cc-switch / claude-env / gateway-check + 探针）
docs/                         # 按主题（见 §4）
  design/ manuals/ personal/ templates/ guides/ _reviews/
assets/img/                   # ← 原 skill/img/ 的共享图片资源
output/
  runtime/                    # 整体 gitignore（见 §11.3）
    handoff/                  # latest.json + regression/ + steps-*.md
    reports/                  # ★[F3] output 根散文件：{项目}-bugstats / {项目}-bugs / {项目}-report
    snapshots/                # ★[F4] notion-test-report 覆盖前快照
    bug-semantic/ report-debug/
data/                         # ← 原 mcp/paths/ 的回归录制主资产（进版本库，名字上与 output 划红线）
  paths/{projectKey}/bugs/{bugId}.json
main.py / pyproject.toml      # 顶层声明（现状为占位，保留）
README.md                     # ★ 新增：根级总览，讲清 monorepo 定位与五大区
```

> **技能内 scripts/ 约定**（第四轮核查发现）：`doc-inventory/scripts/`、`product-manager-toolkit/scripts/`、`skill-creator/scripts/`+`eval-viewer/` 是技能自带资产（符合 skill-creator 外壳规范），**随技能整体平移到 `skills/<name>/`，不外提**。

### 设计原则

| 原则 | 体现 |
|---|---|
| **职能平级** | skills/services/scripts/docs/assets 平级，无寄生 |
| **runtime vs data 硬隔离** | `output/runtime/`（运行时垃圾，gitignore）与 `data/`（主资产，进库）名字上划红线，防新人误删 paths |
| **按功能而非语言分** | qa-pipeline 内按 mcp-server/regression/reporting/zentao 分，保功能内聚；Node+Python 同居一子系统 |
| **不碰内容** | 技能正文、脚本逻辑一字不动，只挪位置 + 重写路径引用 |
| **不删数据** | 所有搬移用 `git mv`，可追溯、可回滚 |

---

## 3. services/qa-pipeline/ 内部映射（高风险区）

原 `skill/mcp/` 拆分映射表：

| 原路径 | → 目标路径 | 子系统 | 说明 |
|---|---|---|---|
| `skill/mcp/server.js` | `services/qa-pipeline/mcp-server/server.js` | mcp-server | MCP 服务入口 |
| `skill/mcp/package.json` | `services/qa-pipeline/mcp-server/package.json` | mcp-server | name=`mcp-zentao`，建议同时改名为 `qa-pipeline-mcp`（见 §7 风险 R5） |
| `skill/mcp/scripts/qa-pipeline.mjs` | `services/qa-pipeline/regression/qa-pipeline.mjs` | regression | **编排核心**，含 REPO_ROOT 上溯逻辑（见 §6） |
| `skill/mcp/scripts/record-path.mjs` | `services/qa-pipeline/regression/record-path.mjs` | regression | 路径录制 |
| `skill/mcp/scripts/regress*.mjs`（6个） | `services/qa-pipeline/regression/` | regression | regress/canvas/cleanup/mark/submit |
| `skill/mcp/scripts/regression-submit.mjs` | `services/qa-pipeline/regression/` | regression | |
| `skill/mcp/scripts/replay-path.mjs` | `services/qa-pipeline/regression/replay-path.mjs` | regression | ✅ **单条路径回放**：import cdp-connect + path-replay-lib，regress.mjs 的单条版 |
| `skill/mcp/scripts/path-replay-lib.mjs` | `services/qa-pipeline/regression/path-replay-lib.mjs` | regression | **含 PATHS_ROOT 上溯逻辑**（见 §6） |
| `skill/mcp/scripts/cdp-connect.mjs` | `services/qa-pipeline/regression/cdp-connect.mjs` | regression | ✅ **核心依赖**：被 record-path/regress/replay-path 三处 import（connectCdp+pickPage） |
| `skill/mcp/scripts/publish_report.py` | `services/qa-pipeline/reporting/publish_report.py` | reporting | 报告发布（sys.path.insert lib） |
| `skill/mcp/scripts/bugstats.py` | `services/qa-pipeline/reporting/bugstats.py` | reporting | 缺陷统计 |
| `skill/mcp/scripts/regression-shoot.py` | `services/qa-pipeline/regression/regression-shoot.py` | regression | ✅ **视觉回归采集器**：browser-use 执行，AI 截图+人判（设计文档 §5.1 点名） |
| `skill/mcp/scripts/defect-image-extract.mjs` | `services/qa-pipeline/reporting/defect-image-extract.mjs` | reporting | 缺陷图提取（输出到 output） |
| `skill/mcp/scripts/filter-active-bugs.mjs` | `services/qa-pipeline/reporting/filter-active-bugs.mjs` | reporting | 活跃缺陷过滤 |
| `skill/mcp/scripts/zentao-bug-create.mjs` | `services/qa-pipeline/zentao/zentao-bug-create.mjs` | zentao | 禅道建缺陷 |
| `skill/mcp/scripts/zentao-bugs-summary.mjs` | `services/qa-pipeline/zentao/zentao-bugs-summary.mjs` | zentao | 禅道汇总 |
| `skill/mcp/scripts/zentao-upload.mjs` | `services/qa-pipeline/zentao/zentao-upload.mjs` | zentao | 禅道传图 |
| **`skill/mcp/scripts/lib/`（整体）** | **`services/qa-pipeline/reporting/lib/`** | reporting | **★[F2] 不拆！** sys.path hack + 裸名导入 + standard.py 跨依赖，拆 shared/reporting 必断（见 §11.2） |
| `skill/mcp/scripts/tests/` | `services/qa-pipeline/tests/` | tests | |
| `skill/mcp/scripts/README-qa-pipeline.md` | `services/qa-pipeline/README.md` | — | 改名+更新路径 |
| `skill/mcp/scripts/_probe-cdp.ps1` ×2 | — | — | ⚠️ 幽灵脚本（见 §12），不搬移 |
| `skill/mcp/scripts/_bu_popover.py` | — | — | ⚠️ 幽灵脚本（见 §12），不搬移 |
| `skill/mcp/dingtalk_msg.json` | `services/qa-pipeline/reporting/dingtalk_msg.json` | reporting | ★[F2] 取消 shared/，归 reporting（reporting 用） |
| `skill/mcp/paths/` | `data/paths/` | — | **主资产**（README 明确"批量回归只扫这里"），进版本库 |
| `skill/mcp/paths/README.md` | `data/paths/README.md` | — | 更新路径 |
| `skill/mcp/output/handoff/` | `output/runtime/handoff/` | — | 运行时产物，gitignore |
| `skill/mcp/output/bug-semantic/` `report-debug/` | `output/runtime/bug-semantic/` `output/runtime/report-debug/` | — | 运行时产物，gitignore |
| `skill/mcp/output/` 根散文件（6个中文+`_zt_projects.json`） | `output/runtime/reports/` | — | ★[F3] bug-stats/publish_report 落盘产物，gitignore（见 §11.3） |
| **`emergency-rescue-graph/`（整体）** | **`services/rescue-graph/`** | — | **★[F1] 扶正为第二个平级服务**（见 §11.1），自定位零引用风险 |
| `skill/output/generate-qa-ppt.js` | — | — | ⚠️ 幽灵脚本（见 §12），不搬移 |

> ✅ **`lib/` 不拆的依据（F2 已验证）**：`publish_report.py:28` 用 `sys.path.insert(0, parent/"lib")` 把 lib 加进搜索路径；所有模块裸名导入（`import notion_client`）；`report_templates/standard.py` import `notion_client`，`report_context` import `bug_semantic_context/key_issues/conclusion_builder`——网状交叉依赖切不开。整体进 `reporting/lib/`，只需改 `publish_report.py` 一行 sys.path 即可（lib 与 publish_report 同在 reporting/ 下，路径不变）。

> ✅ **取消 shared/ 子目录**：lib 不拆 → 无跨子系统共享物；dingtalk_msg.json 归 reporting（唯一使用方）。

---

## 4. docs/ 主题分层映射

| 原路径 | → 目标路径 | 主题 |
|---|---|---|
| `docs/defect-path-regression-design.md` | `docs/design/defect-path-regression-design.md` | design |
| `docs/regression-collector-design.md` | `docs/design/regression-collector-design.md` | design |
| `docs/Claude-Code-CC-Switch-踩坑手册.md` | `docs/guides/Claude-Code-CC-Switch-踩坑手册.md` | guides |
| `docs/Claude-Code-Windows-CC-Switch-多API切换方案.md` | `docs/guides/Claude-Code-Windows-CC-Switch-多API切换方案.md` | guides |
| `docs/模板/` | `docs/templates/` | templates |
| `docs/文档输出/*.docx`（说明书/验收报告/手册） | `docs/manuals/` | manuals |
| `docs/文档输出/*.md`（学习计划/安排计划/研发规划） | `docs/personal/` | personal |
| `docs/文档输出/童美娜-*.{md,html,xlsx}` | `docs/personal/` | personal |
| `docs/文档输出/plan_content*.json` | `docs/personal/` | personal（生成计划的中间产物） |
| `docs/_zentao-cli-review/` | `docs/_reviews/zentao-cli-review/` | _reviews（第三方评审） |
| `docs/文档输出-_chkpost.py` | `scripts/_chkpost.py` | 探针脚本，提到 scripts（非文档） |
| `docs/文档输出-_gettoc.py` | `scripts/_gettoc.py` | 探针脚本 |

---

## 5. 其他区域映射

| 原路径 | → 目标 | 说明 |
|---|---|---|
| `skill/skills/*/`（21个） | `skills/*/` | **原名不动**，整体平移 |
| `skill/api-test-framework/` | `skills/api-test-framework/` | 也是技能，平移 |
| `skill/img/`（17张截图） | `assets/img/` | 共享资产 |
| `skill/output/generate-qa-ppt.js` | `services/qa-pipeline/reporting/generate-qa-ppt.js` | 误入 output 的脚本，归 reporting |
| `scripts/cc-switch-sync-settings.{ps1,py}` | `scripts/`（原位） | 不动 |
| `scripts/claude-env-check.ps1` | `scripts/`（原位） | 不动 |
| `scripts/claude-gateway-check.ps1` | `scripts/`（原位） | 不动 |
| `skill/`（空壳） | 删除空目录 | 搬空后移除 |

---

## 6. 引用重写清单（最高风险，逐项核对）

### 6.1 脚本内 `__dirname` 上溯逻辑（命脉，改错则流水线断）

| 文件 | 行 | 现状 | 目标 | 风险 |
|---|---|---|---|---|
| `qa-pipeline.mjs` | 20 | `REPO_ROOT = resolve(__dirname, "..", "..", "..")` （scripts→mcp→skill→根 = 3级） | 搬到 `services/qa-pipeline/regression/` 后改为 **4级** 上溯，或改用更稳的查找逻辑 | ★★★ 改错则 HANDOFF_PATH 指向虚空 |
| `qa-pipeline.mjs` | 21 | `HANDOFF_PATH = join(REPO_ROOT, "skill", "mcp", "output", "handoff", "latest.json")` | 改为 `join(REPO_ROOT, "output", "runtime", "handoff", "latest.json")` | ★★★ |
| `path-replay-lib.mjs` | 9 | `PATHS_ROOT = path.resolve(__dirname, '..', 'paths')` （scripts→mcp/paths） | 搬到 regression/ 后，paths 搬到 `data/paths/`，需改为跨目录指向 `REPO_ROOT/data/paths` | ★★★ 改错则回归录制找不到主资产 |
| `defect-image-extract.mjs` | 261 | `defaultOutDir = resolve(__dirname, "..", "output")` | 改为指向 `output/runtime/` | ★★ |
| `zentao-upload.mjs` | 24 | `join(__dirname, "..", "..", ".cursor", "mcp.json")` | 上溯层数随目录变化调整 | ★★ |
| `qa-pipeline.mjs` | 234 | `join(__dirname, "zentao-bugs-summary.mjs")` | zentao 脚本将搬到 `zentao/` 子目录，需改路径 | ★★★ 同目录假设破裂 |

> **建议**：与其逐个改上溯层数（脆弱），执行时考虑在 qa-pipeline 内统一引入一个 `repo-root.js` 定位器（从 `__dirname` 向上查找含 `pyproject.toml` 或 `.git` 的目录），一次性消除所有硬编码层级。这属于"执行期决策"，需主人批准。

### 6.2 SKILL.md / 文档内的硬编码路径（18+7 文件）

需把 `skill/mcp/scripts/` → `services/qa-pipeline/<子系统>/`、`skill/skills/` → `skills/`、`skill/mcp/output/` → `output/runtime/`、`skill/mcp/paths/` → `data/paths/` 全量替换。涉及文件：

- **技能（写死 skill/mcp）**：`qa-orchestrator`、`notion-test-report`、`bug-report-and-create`、`bug-stats`、`qa-agent-report-publish`、`qa-agent-defect-intake`、`doc-inventory/文档盘点报告-演示.md`
- **技能（写死 skill/skills）**：`qa-orchestrator`、`qa-agent-defect-intake`、`test-report`、`doc-inventory/文档盘点报告-演示.md`
- **代码/文档**：`qa-pipeline.mjs`、`README-qa-pipeline.md`、`tests/test_report_context.py`
- **设计文档**：`docs/defect-path-regression-design.md`、`docs/regression-collector-design.md`

> ⚠️ 注意：SKILL.md 正文属于"内容"，但**路径引用**是组织的一部分。替换路径 ≠ 改内容（不动语义、不动章节、不动措辞），仅替换路径字符串。此操作在主人定的红线内。

### 6.3 配置与记忆区（易遗漏）

| 文件 | 内容 | 处理 |
|---|---|---|
| `.claude/settings.local.json` | 3 条 `Bash(node skill/mcp/scripts/...)` 权限白名单 | 执行后重跑流水线时自然失效，可按新路径补白名单 |
| `.cursor/rules/qa-orchestrator.mdc` | 2 处 `skill/mcp/...`、`skill/skills/...` | 替换路径 |
| `.codebuddy/automations/automation/memory.md` | 含 skill/mcp | 替换 |
| `.workbuddy/memory/*.md`（3个） | 含 skill/mcp | **历史记忆，建议保留原文不改动**（仅作归档），或注明"路径为历史值" |

### 6.4 .gitignore 规则更新

```diff
- skill/mcp/output/handoff/latest.json
- skill/mcp/output/handoff/*.json
- skill/mcp/output/handoff/*.mjs
- skill/mcp/output/handoff/regression/
- !skill/mcp/output/handoff/.gitkeep
- !skill/mcp/output/handoff/handoff.schema.json
+ output/runtime/handoff/latest.json
+ output/runtime/handoff/*.json
+ output/runtime/handoff/*.mjs
+ output/runtime/handoff/regression/
+ !output/runtime/handoff/.gitkeep
+ !output/runtime/handoff/.gitkeep
  （★[F5] 删除 `!output/runtime/handoff/handoff.schema.json`——该文件实测不存在，是幽灵引用）

- skill/mcp/output/notion-*.py
- skill/mcp/output/dingtalk_push_*.py
- skill/mcp/output/*_push_*.py
+ output/runtime/notion-*.py
+ output/runtime/dingtalk_push_*.py
+ output/runtime/*_push_*.py

+ # ★[F3] output 根散落产物（bug-stats/publish_report 落盘）
+ output/runtime/reports/
+ # ★[F4] notion 覆盖前快照（notion-test-report 生成）
+ output/runtime/snapshots/
+ # _zt_projects.json（zentao 项目缓存）
+ output/runtime/_zt_projects.json

+ # Python 字节码（脚本搬家后路径变化）
  __pycache__/
  *.pyc
  *.pyo
+ services/qa-pipeline/**/__pycache__/
+ services/rescue-graph/**/__pycache__/
```

> `.playwright-mcp/`、`.env`、`.mcp.json`、canvas runtime 等规则与本次搬移无关，保持不动。
> ⚠️ **gitignore 红线复核**：`data/` 全程不进 gitignore（主资产必须入库）；`output/runtime/` 整体忽略但保留 `.gitkeep` 占位。

---

## 7. 风险点与对策

| 编号 | 风险 | 等级 | 对策 |
|---|---|---|---|
| R1 | `__dirname` 上溯层数改错，HANDOFF_PATH/PATHS_ROOT 指向虚空，Agent1→Agent2 handoff 断、回归找不到主资产 | ★★★ | 见 §6.1，逐脚本核对；建议引入 repo-root 定位器；执行后**必须跑一次完整 QA 流水线冒烟测试**验证 |
| R2 | SKILL.md 路径替换误伤正文（路径字符串恰巧出现在语义文本里） | ★★ | 替换前 grep 每个目标路径的上下文，人工确认；仅替换明确的路径 token |
| R3 | ~~`lib/` 子系统归属判断错误~~ | ✅ 已消除 | ★[F2] lib 整体不拆，进 `reporting/lib/`，此风险作废 |
| R4 | `zentao-bugs-summary.mjs` 被搬到 `zentao/`，但 `qa-pipeline.mjs:234` 用 `join(__dirname, "zentao-bugs-summary.mjs")` 假设同目录 | ★★★ | §6.1 已列；改为跨子目录引用 |
| R5 | `package.json` name=`mcp-zentao` 与目录 `mcp`、未来 `qa-pipeline` 三者不一致 | ★ | 执行期建议统一改 name；属可选优化，不影响功能 |
| R6 | `.workbuddy/memory` 是历史记忆，改路径会篡改历史 | ★ | 建议不改，仅归档；或加"历史路径"注释 |
| R7 | 搬移中途中断，留下半搬状态 | ★★ | 全程 `git mv`，每阶段结束 commit；提供回滚命令（见 §9） |
| R8 | `data/paths/` 与 `output/runtime/` 混淆导致新人误删主资产 | ★★ | 名字上硬隔离（data vs output）+ 根 README 明确标注"data/ 是主资产，不可删" |
| R9 | `qa-agent-report-publish/SKILL.md:74` 有运行时假设："工作区根即 `skill/`，路径以 `mcp/scripts/` 开头" | ★★★ | 搬移后该假设彻底失效；必须同步改这条指令，否则误导所有 Agent（见 §6.2 补充） |
| R10 | `publish_report.py:28` 的 `sys.path.insert(0, parent/"lib")` 假设 lib 与脚本同目录 | ★★ | ★[F2] lib 与 publish_report 同进 `reporting/`，路径不变，sys.path 无需改；但需核验 tests/ 的 sys.path 是否也指向 lib |
| R11 | 误删活代码（检测盲区导致冤杀） | ★★★ | 已发生并修正：§12 记录 5 个误判翻案（cdp-connect 等）。教训：判定幽灵须穷尽 import/spawn/外部工具执行/docstring 五维，只查 grep 文件名不够 |

---

## 8. frontmatter 补齐清单（边界内唯一的内容改动）

以 skill-creator 规范为准：每个 SKILL.md 必须有 `name` + `description`。扫描发现 `bug-stats/SKILL.md` **完全无 frontmatter**（直接 `# 标题` 开头）。执行时需为它补：

```yaml
---
name: bug-stats
description: <从正文提炼一句话触发描述>
---
```

> 其余 20 个技能的 frontmatter 已具备 name+description，**不改动**。补 frontmatter 仅限"缺的补齐"，**已有的一律不动**（不统一风格、不重写 description）。

---

## 9. 执行顺序与回滚

**建议分三阶段执行**（即使主人选了"只先出设计"，执行时仍按此顺序最稳）：

1. **阶段一（低风险）**：搬 `skills/`（21+1 个技能平移）+ `assets/img/` + 根 README；同步替换 SKILL.md 内的 `skill/skills/` → `skills/`。验收。
2. **阶段二（高风险）**：拆 `services/qa-pipeline/` + 搬 `data/paths/` + `output/runtime/`；重写所有 `__dirname` 上溯与 `skill/mcp/` 引用；更新 .gitignore；跑冒烟测试。验收。
3. **阶段三（中风险）**：理 `docs/` 主题分层 + 探针脚本归位 + 补 `bug-stats` frontmatter；清理空 `skill/` 壳。验收。

**回滚**：每阶段一个 commit，回滚即 `git revert <commit>`。搬移全用 `git mv`，历史可追溯。

---

## 10. 第四轮核查：覆盖盲查（发现 3 处遗漏）

对全仓库脚本盲扫（排除 node_modules/.git/__pycache__），发现以下区域在初版文档未覆盖，现已补入 §2/§3：

| 遗漏物 | 实测证据 | 处置 |
|---|---|---|
| **技能内 scripts/** | `doc-inventory/scripts/scan_docs.ps1`、`product-manager-toolkit/scripts/{customer_interview_analyzer,rice_prioritizer}.py`、`skill-creator/scripts/`（8个py）+ `eval-viewer/generate_review.py` | 随技能整体平移到 `skills/<name>/`，**不外提**（符合 skill-creator 外壳规范）。已在 §2 末尾加约定 |
| **`emergency-rescue-graph/scripts/`** | 含 11 个 .py（apply_stale_orphan / save_mcp_raw / sync_notion_pages / write_mcp_page 等），比初版统计多 | 随 rescue-graph 整体扶正（§11.1），内部不动 |
| **`skill/mcp/package-lock.json`** | mcp 根下存在，初版只列了 package.json | 已补入 §2 的 mcp-server/（随 package.json 一起） |

---

## 11. 核查修正（F1-F5，基于三轮实测证据）

初版设计的 5 处缺陷，逐条修正如下。每条均附实测依据。

### 11.1 F1 — `emergency-rescue-graph/` 扶正为 `services/rescue-graph/`

**性质研判**（实测）：
- 有 ADR-001（架构决策记录：受控投影，禁止读 pending 进发布图）、RUNBOOK（执行手册）
- `build_graph.py` 用 `Path(__file__).resolve().parent` **自定位**——不依赖外部路径，搬移零引用风险
- 自带完整项目结构：`scripts/`(11个py) + `formal/`(源 jsonl) + `candidates/`(候选) + `graphify-out/`(产物) + `coverage.json`
- 与 qa-pipeline **无任何代码依赖**
- git 未跟踪（0 文件），是本地未提交项目

**为什么扶正为顶层服务**（排除其他选项）：
- ❌ 塞进 qa-pipeline/：无代码依赖，不是子模块
- ❌ 放 docs/：有可执行代码，非纯文档
- ❌ 保持顶层 emergency-rescue-graph/：名字是"项目实例"非"服务职能"，不符合 monorepo 按职能命名约定
- ✅ `services/rescue-graph/`：与 qa-pipeline 平级的第二个服务（一做 QA 流水线，一做知识图谱），职能平级原则

**扶正要点**：
- 目录整体改名 `emergency-rescue-graph/` → `services/rescue-graph/`，内部结构不动
- `graphify-out/` 是**发布产物**（GRAPH_REPORT.md 给人看），虽是产物但按 ADR-001 视为发布物，**保持原样**，根 README 标注其性质
- 因 git 未跟踪，扶正即"首次纳入版本库"——建议主人先 `git add services/rescue-graph/` 审视一遍再提交

### 11.2 F2 — `lib/` 不拆，整体进 `reporting/lib/`（对初版的最大修正）

**初版错误**：把 lib 拆成 `shared/`（qa_config/notion_client/dingtalk_client）+ `reporting/`（其余）。

**实测证据（证伪）**：
- `publish_report.py:28`：`sys.path.insert(0, str(Path(__file__).parent / "lib"))` —— lib 靠 sys.path hack 注入
- 所有模块**裸名导入**：`import notion_client`、`import qa_config`，假设同居一目录
- `report_templates/standard.py:12`：`import notion_client as nc` —— reporting 子目录跨依赖 shared 模块
- `report_context.py` 同时 import `bug_semantic_context / key_issues / conclusion_builder / material_context / report_config` —— 网状交叉

**后果**：拆两目录后，sys.path 只指向一个 lib，另一个目录的裸名 import 必断，publish_report 直接跑不起来。

**修正**：lib 整体 → `services/qa-pipeline/reporting/lib/`。因 publish_report.py 与 lib 同在 reporting/ 下，`sys.path.insert(parent/"lib")` 路径**不变**，零改动。代价是失去 shared 洁癖，但**保功能 > 追洁癖**。

### 11.3 F3/F4/F5 — output 收编 + 删幽灵 schema

| 修正 | 实测 | 处置 |
|---|---|---|
| **F3** output 根散文件 | 6 个中文文件名（{项目}-bugstats/{项目}-bugs/{项目}-report）+ `_zt_projects.json`，是 bug-stats/publish_report 落盘产物 | → `output/runtime/reports/` + `_zt_projects.json`，gitignore |
| **F4** snapshots/ | notion-test-report/SKILL.md:51 引用 `output/snapshots/`（运行时生成，当前不存在） | → `output/runtime/snapshots/`，gitignore |
| **F5** handoff.schema.json | `find` 全仓库无此文件 | 删除 gitignore 的 `!保留` 规则 + 删除所有引用（qa-orchestrator:18、qa-pipeline.mjs:147、.gitignore:7） |

---

## 12. 幽灵脚本清单（终审：6 个真幽灵）

> ⚠️ **本节经两轮修正**。初版用四重 grep 检出 11 个候选，但复查发现**检测方法有两个盲区**，导致 5 个误判。下表是终审结果。

### 12.1 检测方法复盘（为何初版误判）

初版四重查（代码引用/文档引用/白名单/git跟踪）有两个致命盲区：

| 盲区 | 表现 | 修正 |
|---|---|---|
| **grep 过滤过激** | 排除"自身文件"时，连调用方文件里的 import 也误伤 | 改查**导出符号**（如 `connectCdp/pickPage`）而非文件名 |
| **漏"外部工具按路径执行"** | browser-use 等 AI agent 不留 import，只留 docstring+设计文档+心得 | 增加**第五维：语义证据**（docstring 自述调用方 + 设计文档点名 + 学习心得收录） |

### 12.2 翻案记录（5 个，初版误判，实为活组件）

| 脚本 | 初版判定 | 终审判定 | 翻案证据 |
|---|---|---|---|
| `cdp-connect.mjs` | 幽灵 | ✅ **核心依赖** | 被 record-path.mjs:18 / **regress.mjs:16** / replay-path.mjs:11 三处 import connectCdp+pickPage |
| `regression-shoot.py` | 幽灵 | ✅ **视觉采集器** | 设计文档 §5.1 点名 + docstring"由 browser-use 执行" + 学习心得收录为真实案例 |
| `replay-path.mjs` | 幽灵 | ✅ **单条回放** | import cdp-connect + path-replay-lib，是 regress.mjs 的单条版 |
| `regress-mark.mjs` | 疑似预留 | ✅ **批量标记工具** | docstring 清晰：批量在 template.md 标 PASS/FAIL |
| `regress-cleanup.mjs` | 疑似预留 | ✅ **清理工具** | docstring 清晰：清旧回归 batch，每池保留最新 N |

> 教训：**判定"幽灵"必须穷尽调用路径**——import、spawn/exec、外部工具按路径执行、docstring 自述，缺一不可。只查 grep 文件名会冤杀活代码。

### 12.3 真幽灵清单（6 个，经终审确认）

**共性**：全部 UNTRACKED、全仓库零出现（原始 grep 不过滤）、文件特征为一次性任务（硬编码具体 bug 坐标/docx 路径/赛事名）、任务已完成即废弃。

| 脚本 | 性质（文件头证据） | 建议 |
|---|---|---|
| `_bu_popover.py` | 一次性探针：注释"hover 到第一条语音消息中心(825,257)"，硬编码坐标查某 bug | 删 |
| `_probe-cdp.ps1` | CDP 调试探针：探测 127.0.0.1:9222 连通性 | 删 |
| `_probe-cdp2.ps1` | 上一条的加强副本（`_probe-cdp` 的 v2） | 删 |
| `docs/文档输出-_chkpost.py` | 一次性脚本：硬编码 `天通救援棒操作手册V1.0.docx` 查标题计数 | 删 |
| `docs/文档输出-_gettoc.py` | 一次性脚本：硬编码同一 docx 提取目录 | 删 |
| `skill/output/generate-qa-ppt.js` | 一次性 PPT 生成器："AI 应用先锋赛汇报版"，赛事已结束 | 删（或主人留存归档） |

> ✅ **执行纪律**：删除一律走"先移到 `output/runtime/_quarantine/` 隔离区 + 一个 commit"，而非直接 `rm`，保留可恢复期。6 个均建议删，主人确认即可。

---

## 13. 待主人审批的开放项

1. **§6.1 repo-root 定位器**：是否同意引入一个 `repo-root.js` 统一定位仓库根，替代逐脚本改上溯层数？（推荐：同意，一劳永逸）
2. **§3 package.json 改名**：`mcp-zentao` → `qa-pipeline-mcp` 是否要做？（可选）
3. **§6.3 .workbuddy 记忆**：历史记忆里的旧路径是否保留不改？（推荐：保留）
4. **`data/` 位置**：放顶层 `data/`，还是贴近代码 `services/qa-pipeline/data/`？（前者全局可见，后者内聚；当前设计选顶层）
5. **§12.3 真幽灵 6 个**：全部建议删（隔离区方式），主人确认
6. **执行授权**：本设计审批通过后，是否授权按 §9 三阶段执行？

---

> **审批后下一步**：主人勾选上述开放项 → 按 §9 分阶段执行 → 每阶段验收。
