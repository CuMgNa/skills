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
  defaultParentPageId: "36c5667c6d3a80d593bcf38311cf751d"  # 测试报告汇总页（第一轮功能测试报告）
  templatePageId: "c1b23699-3b3b-4b06-b2ac-0ec9ede194b6"  # 样板页（禁止写入）
dingtalk:
  atResponsibles:
    - { name: "lunu", mobile: "13250703582" }
  atUserIds: []
  isAtAll: false
```

---

## 输入

1. **优先**读取 `skill/mcp/output/handoff/latest.json`（若存在）中的 `projectName`、`reportOptions`
2. 用户可覆盖：项目名、`-no-closed`、`publishNotion`、`notionParentPageId`、`reportMode`
3. `notionParentPageId` 未指定时使用 `defaultParentPageId`

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
- **口径统一**：`byStatus.未解决` 严格 = 激活(active)+回归不通过(confirmed)，**已延期单列、绝不混入未解决**；第一节如需"遗留合计"用 `bugStats.遗留合计`（=未解决+已延期）。

**关键约束**：<br>- `bugStats` 一旦生成，**本发布周期内只读不再重算**<br>- 钉钉报告和 Notion 报告中的**每一个数字**都必须从 `bugStats` 取，禁止重算、禁止硬编码到脚本里

---

### 步骤 3：编写钉钉简版报告（test-report 排版 bugStats）

- 严格按 `test-report` 技能输出**三节**：一、测试结果 / 二、未解决问题汇总 / 三、待回归清单（已解决，与未解决不重复）
- **数字全取 `bugStats`**，不许重算
- 报告正文在内存中生成，**不必另存文件**（除非用户要求）

---

### 步骤 4：写入钉钉 + 推送（dingtalk-test-report）

- **钉钉文档创建**：由 Agent 走「钉钉文档」MCP 的 `create_document`（folderId=测试报告文件夹）。正文含中文双引号时，经 MCP 传参须做 JSON 转义，避免 `Expected ',' or '}'` 解析错误；推荐将报告正文按 `\uXXXX` 转义或分段 `update_document` 追加，单次过长会被截断。
- **机器人推送 + @**：统一用脚本，签名/重试/限流/@校验全部内置，**不要再手写签名或 requests.post**：

```powershell
python mcp/scripts/publish_report.py --bugstats "mcp/output/{项目}-bugstats-{日期}.json" --mode dingtalk --title "【{项目}】测试报告 {YYYY-MM-DD}" --doc-url "https://alidocs.dingtalk.com/i/nodes/{nodeId}"
```

- 推送消息**仅摘录「一、测试结果」**（脚本已按 bugStats 生成确定性摘要）。
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

### 校验闸门（C1-C10）

全部以 `bugStats` 为基准，任一不过 → **硬阻断**，钉钉与 Notion 均不外发：

<table header-row="true">
<tr><td>编号</td><td>校验项</td><td>判定</td></tr>
<tr><td>C1</td><td>「一、测试结果」未解决数 == `byStatus.未解决`</td><td>必须相等</td></tr>
<tr><td>C2</td><td>「三、未解决问题汇总」条目数 == `byStatus.未解决`（全部罗列，不截断）</td><td>必须满足</td></tr>
<tr><td>C3</td><td>各级别数量 == `byLevel`</td><td>必须相等</td></tr>
<tr><td>C4</td><td>统计行 == bugStats</td><td>必须相等</td></tr>
<tr><td>C5</td><td>「四、待回归」条目数 == `待回归列表.length`</td><td>必须相等</td></tr>
<tr><td>C6</td><td>执行表各模块数字校验：完整表或精简表均必须逐模块 == `bugStats.byModule`；未解决合计 == `byStatus.未解决`</td><td>必须相等</td></tr>
<tr><td>C7</td><td>缺陷标题与 bugStats 原文逐条一致</td><td>必须一致</td></tr>
<tr><td>C8</td><td>扫描「一、测试结果」bullet：不得以「激活-待确认 / 激活-已确认 / 已延期」作分组标题，也不得以「[一级] / [二级] / [三级] / [四级]」开头分组；命中即不过</td><td>必须满足</td></tr>
<tr><td>C9</td><td>逐条比对：每个缺陷标题 / ID 必须能在 `bugStats.未解决列表 / 待回归列表` 找到完全一致项，且每个数字 == bugStats 对应字段，否则不过</td><td>必须满足</td></tr>
<tr><td>C10</td><td>「五、风险与遗留影响评估」每条风险引用的缺陷均存在于 `bugStats.未解决列表 / 已延期`，风险等级与级别 / 状态映射一致，且无 bugStats 之外的风险项</td><td>仅 Notion 报告；未通过只阻断 Notion 写入</td></tr>
</table>

### 写入 Notion（统一用 publish_report.py，强类型 block）

> ⚠️ **callout / table 被吞的根因**：Notion MCP 的 `API-update-page-markdown` **不解析** `<callout ...>` / `<table ...>` 私有标签，会被当纯文本或丢弃。因此**不再走 markdown replace_content 写富格式**，改由脚本直连 Notion REST API，用**强类型 block**（callout block / table block）写入：

```powershell
# 新建页（默认父页 = defaultParentPageId）
python mcp/scripts/publish_report.py --bugstats "mcp/output/{项目}-bugstats-{日期}.json" --mode notion --title "【{项目}】测试报告 {YYYY-MM-DD}" --tester "童美娜" --coverage "2026-05-21~2026-06-03"

# 幂等覆盖已建页（先清空旧 children 再写，避免重跑内容翻倍）
python mcp/scripts/publish_report.py --bugstats "...bugstats.json" --mode notion --notion-page-id "<已建页ID>"
```

脚本内置能力（替代旧的 replace_content + 手写补写）：

- **安全断言**：目标页 ID ≠ `templatePageId`，否则报错。
- **强类型 block**：报告信息 / 功能测试结论 = callout block；执行表 / 风险表 = 原生 table block；标题/段落/有序无序列表均为对应 block，**不会被吞**。
- **重试 + 退避**：所有请求 4 次重试 + 指数退避，抗 `ConnectionReset`/429/5xx。
- **幂等清空**：`--notion-page-id` 复用页时先 `clear_page` 删除旧 children，再写入，杜绝半写入/翻倍。
- **回读校验**：写入后 `count_blocks` 回读顶层块数，为 0 视为写入失败（兜底 F1）。
- **数字全取 bugStats**：第一/二/三/四/五节所有数字来自 bugStats，脚本不接受硬编码数字。

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

---

## 报告发布完成回报

- 禅道汇总 MD 路径
- 钉钉文档链接
- 机器人推送结果（errcode）与 @ 负责人是否生效（atMobiles 对应的 @手机号 是否已在正文出现）
- bugStats 路径
- 若启用 Notion：追加 Notion 页面链接或失败原因