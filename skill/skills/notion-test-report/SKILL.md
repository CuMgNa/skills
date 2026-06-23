# Notion 测试报告发布（v3 升级版）

## 定位

- 本技能是 `dingtalk-test-report` 的并行渠道，不替代钉钉。
- 默认不执行；仅当 Agent2 已判定 `publishNotion=true` 或用户明确要求时执行。
- **报告内容以”数据正确 + 格式保真”为优先**，版式降级必须显式标注。

---

## 输入

<table header-row="true">
<tr><td>输入</td><td>来源</td><td>说明</td></tr>
<tr><td>`notionReportMD`</td><td>`test-report-notion` 产出</td><td>Notion 增强 Markdown 全文</td></tr>
<tr><td>`bugStats`</td><td>`bug-stats` 产出</td><td>单一统计事实源（用于校验）</td></tr>
<tr><td>`notionParentPageId`</td><td>`qa-agent-report-publish` 配置</td><td>写入父页面 ID</td></tr>
<tr><td>`reportMode`</td><td>handoff 配置</td><td>`create-new`（默认）/ `overwrite` / `fail-on-duplicate`</td></tr>
<tr><td>`reportKey`</td><td>计算得出</td><td>`项目名 + 测试类型 + 覆盖期`</td></tr>
</table>

---

## 核心工具

优先使用：<br>- `API-post-page`：创建空页面（仅 title）<br>- `API-update-page-markdown` + `type: replace_content`：写入主体 Markdown（heading / paragraph / list / table 等）<br>- `API-patch-block-children`：写入或补写强类型 callout block（报告信息、功能测试结论、降级通知）

Fallback：<br>- `API-patch-block-children`：分批追加普通段落 / 列表 / 表格降级内容<br>- 普通 Markdown 降级提示：`## ⚠️ 版式降级通知` + 加粗说明，确保即使 callout 失效也可见

---

## 完整流程

### 第一步：安全断言（必须先执行）

**目标页安全断言**：写入目标页 ID 必须 ≠ `templatePageId`（`c1b23699-3b3b-4b06-b2ac-0ec9ede194b6`），防止误覆盖样板页。

若相等 → 终止并返回错误：“禁止写入样板页”。

### 第二步：幂等检查（根据 reportMode）

<table header-row="true">
<tr><td>模式</td><td>行为</td></tr>
<tr><td>`create-new`（默认）</td><td>每次新建页，标题带日期时间戳</td></tr>
<tr><td>`overwrite`</td><td>命中相同 reportKey 且为草稿才覆盖；覆盖前先存快照</td></tr>
<tr><td>`fail-on-duplicate`</td><td>命中重复直接报错退出</td></tr>
</table>

**幂等键**：`reportKey = 项目名 + 测试类型 + 覆盖期/报告日期`

**留痕（覆盖前必做）**：覆盖前用 `API-retrieve-page-markdown` 读出旧内容，存 `skill/mcp/output/snapshots/{reportKey}-{timestamp}.md`。

### 第三步：校验闸门（写入前强制校验）

**全部以 `bugStats` 为基准**，任一不过 → **硬阻断**，钉钉与 Notion 均不外发。

<table header-row="true">
<tr><td>编号</td><td>校验项</td><td>判定规则</td></tr>
<tr><td>C1</td><td>「一、测试结果」未解决数</td><td>必须 == `bugStats.byStatus.未解决`</td></tr>
<tr><td>C2</td><td>「三、未解决问题汇总」条目总数</td><td>必须 == `bugStats.byStatus.未关闭`（全部罗列，不截断）</td></tr>
<tr><td>C3</td><td>各级别数量</td><td>必须 == `bugStats.byLevel`（一级/二级/三级/四级分别相等）</td></tr>
<tr><td>C4</td><td>统计行数字</td><td>必须 == `bugStats.total` / `bugStats.byStatus.未关闭` / `bugStats.byStatus.已修复待回归` / `bugStats.byStatus.已延期`</td></tr>
<tr><td>C5</td><td>「四、待回归」条目数</td><td>必须 == `bugStats.待回归列表.length`</td></tr>
<tr><td>C6</td><td>执行表各模块未关闭之和（完整表或精简表均适用）</td><td>必须 == `bugStats.byStatus.未关闭`；每模块数字 == `bugStats.byModule`</td></tr>
<tr><td>C7</td><td>报告缺陷标题</td><td>必须与 `bugStats.未关闭列表` / `bugStats.待回归列表` 原文逐条一致</td></tr>
<tr><td>C8</td><td>「一、测试结果」分组维度</td><td>不得按级别（[一级]…[四级]）或状态（激活-待确认 / 激活-已确认 / 已延期）分组；命中即不过</td></tr>
<tr><td>C9</td><td>缺陷标题 / ID 与数字逐条溯源</td><td>每个缺陷标题 / ID 必须在 `bugStats.未关闭列表 / 待回归列表` 找到完全一致项，且每个数字 == bugStats 对应字段</td></tr>
<tr><td>C10</td><td>「五、风险与遗留影响评估」溯源</td><td>每条风险引用的缺陷均存在于 `bugStats.未关闭列表 / 已延期列表`，风险等级与级别 / 状态映射一致，且无 bugStats 之外的风险项（未通过仅阻断 Notion 写入，不影响钉钉）</td></tr>
</table>

**失败处置**：

<table header-row="true">
<tr><td>类别</td><td>处置</td></tr>
<tr><td>**数据类**（C1-C9 任何不过）</td><td>**硬阻断**：不写 Notion、不推钉钉；保留草稿（标 `validation_failed`）；告警「哪条校验、期望值 vs 实际值」</td></tr>
<tr><td>**版式类**（调用 `API-update-page-markdown` 时格式渲染异常）</td><td>先自动补写关键富格式块；补写失败才降级放行。降级提示必须先用普通 Markdown 可见块写入（`## ⚠️ 版式降级通知` + 加粗说明），可选再追加黄色 callout</td></tr>
<tr><td>**资料缺失**（第二部分辅助资料缺失）</td><td>不算失败；按 `test-report-notion` 规则降级渲染「精简执行表」（不再隐藏第二部分），C6 仍校验精简表各模块未解决之和</td></tr>
</table>

### 第四步：Notion 富格式能力探针（正式写入前）

写正式报告前，先用最小探针验证当前写入能力：

```markdown
<callout icon="📝" color="gray_bg">
	**报告信息**
	- 项目：测试项目
	- 测试类型：功能测试
</callout>

> 这是 quote

<table header-row="true">
<tr>
<td>字段</td>
<td>值</td>
</tr>
<tr>
<td>项目</td>
<td>测试项目</td>
</tr>
</table>
```

回读判定：<br>- callout / quote / table / list 均保真 → 可直接走主路径。<br>- callout 丢失但其它结构保真 → 主体仍用 Markdown，关键 callout 必须走强类型 block API。<br>- 多类结构丢失 → 进入版式降级，且顶部必须写入普通 Markdown 降级提示。

### 第五步：写入 Notion

#### 主路径（主体 Markdown + 关键 callout 强类型写入）

1. `API-post-page` 在 `notionParentPageId` 下创建空页（仅 title = `{项目} 测试报告 {YYYY-MM-DD}`）
2. 将 `notionReportMD` 中的 `<!-- NOTION_CALLOUT:* -->` 视为语义占位；主体内容用 `API-update-page-markdown` + `type: replace_content` 写入
3. 对以下关键块使用强类型 callout block 写入或补写：`REPORT_INFO`、`EXECUTION_CONCLUSION`、`FORMAT_DEGRADE_NOTICE`
4. 写入后 **回读** `API-retrieve-page-markdown` 做结构化一致性检查（F1-F4）

#### Fallback（patch-block-children）

当 `replace_content` 失败时：

1. 降级为 `patch-block-children` 追加模式
2. 在报告顶部先写入普通 Markdown 可见降级提示，禁止只依赖 callout：
	```markdown
## ⚠️ 版式降级通知

**由于 Notion 富格式写入失败，本报告部分样式已降级为普通文本。数据内容仍以 bugStats 为准。**
	```
3. 如果强类型 callout block 可用，再额外追加黄色 callout；不可用时普通 Markdown 提示已满足可见性
4. 逐段追加 `paragraph`、`bulleted_list_item`、`numbered_list_item`、必要表格降级块

### 第六步：回读校验（结构化闸门）

写入后执行 `API-retrieve-page-markdown` 读取刚写入的页面内容，按以下规则校验：

- F1：报告信息必须以 callout 或普通 Markdown 可见块存在
- F2：若第二部分存在，功能测试结论必须以 callout 或普通 Markdown 可见块存在
- F3：若进入 fallback，顶部必须存在「⚠️ 版式降级通知」普通标题块
- F4：报告正文不得残留未被解析的 `<callout ...>` 原始文本

处置：F1-F4 不通过时，优先用强类型 block API 自动补写；补写失败则插入普通 Markdown 降级提示；若连降级提示也无法写入，则视为 Notion 写入失败，不得静默发布。

---

## 输出

成功时返回：

```json
{
  "notionPageId": "<新建页面ID>",
  "notionUrl": "https://www.notion.so/……",
  "notionWriteStatus": "success",
  "reportMode": "create-new",
  "sectionTwoRendered": true
}
```

失败时返回：

```json
{
  "notionWriteStatus": "failed",
  "error": "错误描述",
  "failedAt": "校验闸门 / replace_content / 回读校验",
  "sectionTwoRendered": false
}
```

---

## 关键约束

1. **目标页安全断言先于一切**：写入前必须校验目标页 ≠ 样板页
2. **父页必须正确**：报告页必须作为 `notionParentPageId`（defaultParentPageId）的**子页面**新建；`materialPageId` 仅用于读测试方案，禁止当作报告父页；传 `--notion-page-id` 时脚本会校验 parent
3. **校验闸门先于写入**：C1-C10 全部通过才进入写入步骤
4. **降级必须显式标注且可见**：任何版式降级都必须在报告顶部先加普通 Markdown 可见块说明；不得只用 callout 承载降级提示
5. **关键 callout 强类型写入**：报告信息、功能测试结论、降级通知等关键卡片不得只依赖 Markdown `<callout>` 解析，必须支持强类型 block 写入 / 补写
6. **回读校验是结构化闸门**：写入后必须回读并执行 F1-F4；失败时自动补写或显式降级，不能只记录告警
7. **Notion 失败不阻断钉钉**：钉钉已通过同一份 bugStats 与校验，Notion 写入失败时钉钉推送不受影响