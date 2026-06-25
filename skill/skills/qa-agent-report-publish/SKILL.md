# QA Agent2 — 报告发布（v3 升级版）

> 本 Agent 执行：**禅道 → 单一统计事实源 → 钉钉简版报告 → 钉钉推送**，可选：**Notion 富格式报告 → 校验闸门 → Notion 写入**。

<callout icon="🚫" color="red_bg">
	**数据真实性总则（最高优先级）**：测试报告的全部内容——缺陷数量、级别、状态、标题、模块、结论——**必须严格基于已有资料**（`bugStats`、禅道汇总 MD / JSON、用户上传的测试方案 / 大纲）。**严禁编造、推断或补充任何资料中不存在的缺陷、数字或结论，拒绝幻觉**。事实源缺失的内容宁可留空或如实标注「资料缺失」，也不得臆造。
</callout>

---

## 跨技能统一口径（唯一事实源）

所有串联技能遵循以下主从关系，**下游只消费、不重写**：

1. **缺陷统计事实源**：以 `bug-stats` 输出的 `bugStats.json` 为唯一事实源，钉钉与 Notion 报告的每个数字都从它取。
2. **模块归属**：以 `bug-stats` 的「模块别名映射表（一对一）」为唯一口径，每个前缀仅归一到唯一规范模块。
3. **钉钉签名 / 推送 URL**：以 `dingtalk-test-report` 的 `build_signed_webhook_url()` 为唯一实现，其它技能不得自写 URL 拼装。
4. **Notion 报告结构**：以 `test-report-notion` 的章节定义（一～五节，末节为风险与遗留影响评估）为准；第二部分统一为「有资料完整表 / 无资料精简表」。
5. **Notion 写入方式**：以 `notion-test-report` 为唯一来源；主体 Markdown 用 `replace_content`，报告信息 / 功能测试结论 / 降级通知等关键 callout 必须支持强类型 block 写入或补写。
6. **Notion 写入校验闸门**：以本技能「校验闸门（C1-C10）」为唯一定义；`notion-test-report` 写入前执行同一套闸门，**不得另存一份可独立漂移的副本**。
7. 下游技能**不得**自行重算数字、重写模块映射、重定义风险等级或闸门编号；改动任一事实源须同步检查本表。

---

## 允许引用的技能（6个）

<table header-row="true">
<tr><td>序号</td><td>技能</td><td>职责</td></tr>
<tr><td>1</td><td>`zentao-bug-summary`</td><td>拉取禅道缺陷汇总 MD/JSON</td></tr>
<tr><td>2</td><td>`bug-stats`</td><td>生成单一统计事实源 bugStats.json</td></tr>
<tr><td>3</td><td>`test-report`</td><td>编写钉钉三节简版报告（排版 bugStats）</td></tr>
<tr><td>4</td><td>`dingtalk-test-report`</td><td>写入钉钉文档 + webhook 推送</td></tr>
<tr><td>5</td><td>`test-report-notion`</td><td>编排 Notion 富格式 Markdown（可选）</td></tr>
<tr><td>6</td><td>`notion-test-report`</td><td>写入 Notion 页（含校验闸门，可选）</td></tr>
</table>

**禁止引用**：`defect-screenshot-bug-ticket`、`bug-report-and-create`、`qa-agent-defect-intake`（除非仅读 handoff）。

---

## 固定配置

```yaml
notion:
  defaultParentPageId: "36c5667c-6d3a-80d5-93bc-f38311cf751d"  # 测试报告汇总页（第一轮功能测试报告）
  materialPageId: "3585667c-6d3a-807b-8757-d831c8cd84cd"       # 测试方案（只读辅助资料，非报告父页）
  templatePageId: "c1b23699-3b3b-4b06-b2ac-0ec9ede194b6"       # 样板页（禁止写入）
dingtalk:
  atResponsibles:
    - { name: "lunu", mobile: "13250703582" }
  atUserIds: []
  isAtAll: false
```

---

## 输入

1. **优先**读取 `skill/mcp/output/handoff/latest.json`（若存在）中的 `projectName`、`reportOptions`、`materialPageId`
2. 用户可覆盖：项目名、`-no-closed`、`publishNotion`、`notionParentPageId`、`reportMode`
3. `notionParentPageId` 未指定时使用 `defaultParentPageId`
4. **handoff 禁止自动用于 Notion 写入**：`notion.pageId` 不得默认带入 `--notion-page-id`（除非用户明确要求「覆盖上次报告」）

---

## 完整执行流程

### 步骤 1：拉取禅道缺陷

> **路径约定**：工作区根目录即 `skill/`，所有脚本路径以 `mcp/scripts/...` 开头（**不要**写成 `skill/mcp/...`，会多一层）。**命令为 PowerShell（Windows）语法，多条命令用 `;` 串联，禁用 `&&`。**

```powershell
node mcp/scripts/zentao-bugs-summary.mjs --project-name "{项目名}" [--no-closed] [--creator "童美娜"]
```

> ⚠️ **项目匹配（防拉错数据）**：`--project-name` 为模糊匹配。若关键词命中多个项目，脚本会**中止并列出候选**（不再静默取第一个）。此时必须改用精确 ID：`--project-id <id>`。例如"磐钴"命中 28 个项目，须用 `--project-id 1268`。

记录输出：<br>- MD 路径：`mcp/output/{项目}-bugs-{日期}.md`<br>- JSON 路径：`mcp/output/{项目}-bugs-{日期}.json`

---

### 步骤 2：生成单一统计事实源（bugstats.py）

**统一用脚本生成，禁止人工手写 bugStats**（手写极易笔误，如 byStatus 与列表长度对不上）：

```powershell
python mcp/scripts/bugstats.py --input "mcp/output/{项目}-bugs-{日期}.json"
```

- 输出：`mcp/output/{项目}-bugstats-{日期}.json`
- 脚本内置 **数字自校验**（byLevel/byStatus/各列表长度/byModule 一致性），不过则 **非零退出（硬阻断）**，绝不据此发布。
- **口径统一**：`byStatus.未关闭` = 激活(active)+回归不通过(confirmed)；`byStatus.已延期` 单独一列；`byStatus.待回归` = 已解决。

**关键约束**：<br>- `bugStats` 一旦生成，**本发布周期内只读不再重算**<br>- 钉钉报告和 Notion 报告中的**每一个数字**都必须从 `bugStats` 取，禁止重算、禁止硬编码到脚本里

---

### 步骤 3：编写钉钉简版报告（test-report 排版 bugStats）

- 严格按 `test-report` 技能输出**三节**：一、测试结果 / 二、未解决问题汇总 / 三、待回归清单（已解决，与未解决不重复）
- **数字全取 `bugStats`**，不许重算
- **必须落盘两份文件**（供钉钉文档写入与机器人推送共用，确保内容一致）：
	- 完整报告：`mcp/output/{项目}-report-{日期}.md`
	- 第一节摘录：`mcp/output/{项目}-section1-{日期}.md`（与完整报告「一、测试结果」**逐字一致**，可含 `### 一、测试结果` 标题行，脚本会自动剥离）

---

### 步骤 4：写入钉钉 + 推送（dingtalk-test-report）

- **钉钉文档创建**：由 Agent 走「钉钉文档」MCP 的 `create_document`（folderId=测试报告文件夹），正文读取步骤 3 的 `{项目}-report-{日期}.md`。正文含中文双引号时，经 MCP 传参须做 JSON 转义，避免 `Expected ',' or '}'` 解析错误；推荐将报告正文按 `\uXXXX` 转义或分段 `update_document` 追加，单次过长会被截断。
- **机器人推送 + @**：统一用脚本，签名/重试/限流/@校验全部内置，**不要再手写签名或 requests.post**：

```powershell
python mcp/scripts/publish_report.py --bugstats "mcp/output/{项目}-bugstats-{日期}.json" --mode dingtalk --title "【{项目}】测试报告 {YYYY-MM-DD}" --doc-url "https://alidocs.dingtalk.com/i/nodes/{nodeId}" --summary-file "mcp/output/{项目}-section1-{日期}.md"
```

- 推送消息**仅摘录「一、测试结果」**，内容**必须**来自 `--summary-file`（或与钉钉文档第一节逐字一致）；**禁止**使用脚本内一句话模板摘要。
- 也可传 `--report-file` 代替 `--summary-file`，脚本自动从完整报告截取第一节。
- **@ 负责人**：脚本推送前强制校验正文含每个 `@手机号`，否则直接报错（`@` 不会静默失效）；遇钉钉限流码自动退避重试。被 @ 的人须为目标群成员且手机号为其钉钉绑定号。
- **推送后校验**：脚本返回 `ok / errcode / at_effective / attempts`；`errcode==0` 且 `at_effective==true` 才算成功。

---

### 步骤 5（可选）：编排 Notion 富格式（test-report-notion）

**触发条件**：`publishNotion === true` 或用户明确要求。

- 输入：`bugStats.json` + 辅助测试资料（可选）
- 输出：Notion 增强 Markdown 全文（五节结构，末节为「风险与遗留影响评估」）
- **第二部分「功能测试范围与执行情况」分两档渲染**：
	- 有辅助资料 → 完整执行表（含核心测试点 / 优先级）
	- 无资料 → 降级精简执行表（仅如实呈现 bugStats.byModule，不推断、不占位、不报错）

---

### 步骤 6（可选）：校验闸门 + 写入 Notion（notion-test-report）

**触发条件**：步骤 5 完成后执行。

### Notion 写入规则（强制）

<table header-row="true">
<tr><td>场景</td><td>命令</td><td>禁止</td></tr>
<tr><td>用户首次出报告 / 未指定旧页</td><td>不传 `--notion-page-id`，在 `defaultParentPageId` 下<strong>新建子页</strong></td><td>禁止从 handoff 自动带 `--notion-page-id`</td></tr>
<tr><td>同一份报告重跑 / 用户明确说「覆盖」</td><td>传 `--notion-page-id`，脚本校验 parent == `defaultParentPageId`</td><td>禁止覆盖 parent ≠ 汇总页 的页面</td></tr>
<tr><td>读取测试方案</td><td>只用 `--material-page-id` 或 `--material-auto`</td><td>禁止把 `materialPageId` 当报告父页</td></tr>
</table>

**两个 Notion 页面 ID 不可混淆**：

| ID | 用途 |
|----|------|
| `36c5667c-6d3a-80d5-93bc-f38311cf751d` | 测试报告**汇总页**（报告作为子页面挂在这里） |
| `3585667c-6d3a-807b-8757-d831c8cd84cd` | 测试方案**辅助资料**（只读，解析 1.4.1 全景表） |

**标准命令（每次新建子页）**：

```powershell
python mcp/scripts/publish_report.py --bugstats "mcp/output/{项目}-bugstats-{日期}.json" --mode notion --title "【{项目}】测试报告 {YYYY-MM-DD}" --tester "童美娜" --coverage "2026-05-21~2026-06-03" --material-page-id "3585667c-6d3a-807b-8757-d831c8cd84cd" --summary-file "mcp/output/{项目}-section1-{日期}.md"
```

> 默认在 `defaultParentPageId` 下新建；**不要**加 `--notion-page-id`，除非用户明确要求覆盖已有报告。

### 校验闸门（C1-C10）

全部以 `bugStats` 为基准，任一不过 → **硬阻断**，钉钉与 Notion 均不外发：

<table header-row="true">
<tr><td>编号</td><td>校验项</td><td>判定</td></tr>
<tr><td>C1</td><td>「一、测试结果」未关闭数 == `byStatus.未关闭`</td><td>必须相等</td></tr>
<tr><td>C2</td><td>「三、未解决问题汇总」条目数 == `byStatus.未关闭`（全部罗列，不截断）</td><td>必须满足</td></tr>
<tr><td>C3</td><td>各级别数量 == `byLevel`</td><td>必须相等</td></tr>
<tr><td>C4</td><td>统计行 == bugStats</td><td>必须相等</td></tr>
<tr><td>C5</td><td>「四、待回归」条目数 == `待回归列表.length`</td><td>必须相等</td></tr>
<tr><td>C6</td><td>执行表各模块数字校验：完整表或精简表均必须逐模块 == `bugStats.byModule`；未关闭合计 == `byStatus.未关闭`</td><td>必须相等</td></tr>
<tr><td>C7</td><td>缺陷标题与 bugStats 原文逐条一致</td><td>必须一致</td></tr>
<tr><td>C8</td><td>扫描「一、测试结果」bullet：不得以「激活-待确认 / 激活-已确认 / 已延期」作分组标题，也不得以「[一级] / [二级] / [三级] / [四级]」开头分组；命中即不过</td><td>必须满足</td></tr>
<tr><td>C9</td><td>逐条比对：每个缺陷标题 / ID 必须能在 `bugStats.未关闭列表 / 待回归列表` 找到完全一致项，且每个数字 == bugStats 对应字段，否则不过</td><td>必须满足</td></tr>
<tr><td>C10</td><td>「五、风险与遗留影响评估」每条风险引用的缺陷均存在于 `bugStats.未关闭列表 / 已延期列表`，风险等级与级别 / 状态映射一致，且无 bugStats 之外的风险项</td><td>仅 Notion 报告；未通过只阻断 Notion 写入</td></tr>
</table>

**v2 标准管线追加闸门**（由 `lib/report_context.validate_report_context` 实现，阻断级）：

<table header-row="true">
<tr><td>编号</td><td>校验项</td><td>判定</td></tr>
<tr><td>C1'</td><td>级别分布合计 == 总数；状态分布合计 == 总数</td><td>必须相等</td></tr>
<tr><td>C2'</td><td>完整执行表「未关闭/待回归」列合计 == `bugStats` 对应口径（每个禅道模块唯一归并，不重复计数）</td><td>必须相等</td></tr>
<tr><td>C3'</td><td>重点问题引用的每个缺陷 ID 均存在于 `bugStats` 未关闭/待回归/延期列表</td><td>必须满足</td></tr>
<tr><td>C4'</td><td>报告级别分布 == `bugStats.byLevel`（severity 不得反向污染展示）</td><td>必须相等</td></tr>
</table>

告警级（提示不阻断）：资料解析降级原因、覆盖率低于阈值、缺陷语义产物缺失、业务影响不可溯源率、字段冲突计数——均写入 `mcp/output/report-debug/{项目}-report-debug-{日期}.json` 与报告附录。

### 写入 Notion（统一用 publish_report.py，强类型 block）

> ⚠️ **callout / table 被吞的根因**：Notion MCP 的 `API-update-page-markdown` **不解析** `<callout ...>` / `<table ...>` 私有标签，会被当纯文本或丢弃。因此**不再走 markdown replace_content 写富格式**，改由脚本直连 Notion REST API，用**强类型 block**（callout block / table block）写入：

```powershell
# 新建页（默认父页 = defaultParentPageId）；有测试方案时加 --material-auto 或 --material-page-id
python mcp/scripts/publish_report.py --bugstats "mcp/output/{项目}-bugstats-{日期}.json" --mode notion --title "【{项目}】测试报告 {YYYY-MM-DD}" --tester "童美娜" --coverage "2026-05-21~2026-06-03" --material-auto

# 或指定资料页 / 本地 Markdown（material-page-id 仅用于读测试方案，不是报告父页）
python mcp/scripts/publish_report.py --bugstats "...bugstats.json" --mode notion --material-page-id "3585667c-6d3a-807b-8757-d831c8cd84cd"
python mcp/scripts/publish_report.py --bugstats "...bugstats.json" --mode notion --material-file "mcp/output/test-plan.md"

# 幂等覆盖已建页（仅当该页已是汇总页下的子页；脚本会校验 parent，否则硬阻断）
python mcp/scripts/publish_report.py --bugstats "...bugstats.json" --mode notion --notion-page-id "<汇总页下已建子页ID>" --material-auto
```

**第二节执行表判定（由 `publish_report.py` 内置，无需单独跑 test-report-notion 落盘）**：
- 传入 `--material-auto` / `--material-page-id` / `--material-file` 且成功解析 1.4.1 全景表 → **完整执行表**（8 列，含核心测试点 / 优先级）
- 未传资料或解析失败 → **精简执行表**（5 列，仅 bugStats.byModule）

脚本内置能力（替代旧的 replace_content + 手写补写）：

- **安全断言**：目标页 ID ≠ `templatePageId`，否则报错。
- **父页校验**：传 `--notion-page-id` 时，脚本校验目标页 parent == `defaultParentPageId`，且 parent ≠ `materialPageId`；不过则硬阻断。
- **强类型 block**：报告信息 / 功能测试结论 = callout block；执行表 / 风险表 = 原生 table block；标题/段落/有序无序列表均为对应 block，**不会被吞**。
- **重试 + 退避**：所有请求 4 次重试 + 指数退避，抗 `ConnectionReset`/429/5xx。
- **幂等清空**：`--notion-page-id` 复用页时先 `clear_page` 删除旧 children，再写入，杜绝半写入/翻倍。
- **回读校验**：写入后 `count_blocks` 回读顶层块数，为 0 视为写入失败（兜底 F1）。
- **数字全取 bugStats**：第一/二/三/四/五节所有数字来自 bugStats，脚本不接受硬编码数字。
- **辅助资料 → 完整执行表（v2 标准管线）**：解析层已由 `lib/material_context.py` 承接（旧 `lib/test_plan_material.py` 转为兼容 shim，仅委托不再含逻辑）。多级锚点扫描（强锚点：1.4.1 / 2.1 范围 / 范围全景表；弱锚点：测试方案 / 测试计划 / 逻辑大纲 / 功能清单 / 模块清单 / 用例矩阵）+ 同义表头识别 + 资料类型自识别 + **多资料合并**（`--material-file`/`--material-page-id` 均可多次）。解析失败时降级为精简表并在第二节顶部补黄色 callout 标注原因（不再静默返回空 rows）。
- **缺陷语义产物（只读消费）**：报告阶段读取 `mcp/output/bug-semantic/*.jsonl`（由 `bug-report-and-create` 创建缺陷成功后写入）构建 `BugSemanticContext`；缺失时降级为「禅道 steps / 标题级」语义分析并在附录如实标注。**报告阶段绝不触发缺陷创建**。
- **动态重点问题**：「重点问题」方向由缺陷 `impactSignals`（资金/计费、权限/安全、数据一致性、消息/通信、界面/体验）动态聚类，而非写死分类；不可溯源的业务影响标注「（影响待复核）」。
- **标准报告模板（多语言）**：`lib/report_templates/standard.py` 渲染「结论 / 指标看板 / 重点问题 / 范围聚合 / 模块明细 / 风险 / 清单 / 附录」八段，Notion blocks 与钉钉投影同源（数字一致）；`--locale zh-CN|en-US`、`--template standard`。
- **集中配置**：阈值 / severity 映射 / impactSignals 词典 / 模块别名集中在 `lib/report_config.py`，支持 `--project-config <json>` 项目级覆盖（新项目接入只改配置不改代码）。
- **级别口径**：展示级别（一/二/三/四级）**只来自 bugStats**，禅道 severity 仅作语义参考，**不反向污染**展示数字（severity 与 bugStats 级别冲突时记入附录冲突清单）。
- **新增 CLI 参数**：`--report-kind smoke|functional|regression|auto`、`--material-engine legacy|context|shadow`（shadow 仅 diff 对照，不改发布结果）、`--locale`、`--template`、`--project-config`、`--semantic-dir`/`--semantic-key`、`--dry`（只构建不发布）、`--allow-fallback`（钉钉无详细第一节时用确定性结论）。
- **Markdown 加粗**：`notion_client.rich_text_from_markdown` 将 section1 等文案中的 `**...**` 转为 Notion `annotations.bold`；与钉钉共用 Markdown 时无需去掉星号。

### 失败处置

<table header-row="true">
<tr><td>类别</td><td>处置</td></tr>
<tr><td>**数据类**（C1-C9 不过）</td><td>**硬阻断**：不写 Notion、不推钉钉；存草稿（标 `validation_failed`）+ 告警</td></tr>
<tr><td>**版式类**</td><td>先自动补写关键富格式块；补写失败才降级放行。报告顶部必须先加普通 Markdown 可见降级提示，可选再追加黄色 callout；不得只依赖 callout 承载降级通知</td></tr>
<tr><td>**Notion 写入失败**</td><td>不阻断钉钉（钉钉已通过校验）</td></tr>
</table>

---

## 失败策略

<table header-row="true">
<tr><td>失败点</td><td>处置</td></tr>
<tr><td>拉取禅道失败</td><td>**终止**，不编写报告、不推钉钉</td></tr>
<tr><td>bugStats 生成失败</td><td>**终止**，钉钉与 Notion 均不外发</td></tr>
<tr><td>校验闸门失败（数据类）</td><td>**硬阻断**，钉钉与 Notion 均不外发，存草稿 + 告警</td></tr>
<tr><td>钉钉文档成功但机器人失败</td><td>文档链接仍返回，说明推送需重试</td></tr>
<tr><td>Notion 写入失败</td><td>不阻断钉钉；单独说明失败原因与可重试方式</td></tr>
</table>

---

## Handoff 只读

Agent2 **不修改** `bugsCreated`；可在 handoff 的 `notes` 追加报告链接（可选）。

**handoff 可读字段**：`projectName`、`reportOptions`、`materialPageId`、`notionParentPageId`

**handoff 不可自动用于 Notion 写入**：`notion.pageId`（除非用户明确说「覆盖上次报告」）

写入成功后 handoff 应记录 `notion.parentPageId` 供审计，但下次默认仍新建子页。

---

## 报告发布完成回报

- 禅道汇总 MD 路径
- 钉钉文档链接
- 机器人推送结果（errcode）与 @ 负责人是否生效（atMobiles 对应的 @手机号 是否已在正文出现）
- bugStats 路径
- 若启用 Notion：追加 Notion 页面链接或失败原因