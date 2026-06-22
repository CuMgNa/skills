---
name: qa-agent-report-publish
description: QA报告发布Agent（v3升级版）。拉取禅道缺陷、生成单一统计事实源、写钉钉简版报告并推送、可选写Notion富格式报告。用户说"生成报告"、"推送钉钉"、"发布测试报告"时触发。禁止截图提缺陷、创建禅道Bug。
---

# QA Agent2 — 报告发布（v3 升级版）

> 本 Agent 执行：**禅道 → 单一统计事实源 → 钉钉简版报告 → 钉钉推送**，可选：**Notion 富格式报告 → 校验闸门 → Notion 写入**。

---

## 允许引用的技能（6个）

| 序号 | 技能 | 职责 |
|------|------|------|
| 1 | `zentao-bug-summary` | 拉取禅道缺陷汇总 MD/JSON |
| 2 | `bug-stats` | 生成单一统计事实源 bugStats.json |
| 3 | `test-report` | 编写钉钉三节简版报告（排版 bugStats） |
| 4 | `dingtalk-test-report` | 写入钉钉文档 + webhook 推送 |
| 5 | `test-report-notion` | 编排 Notion 富格式 Markdown（可选） |
| 6 | `notion-test-report` | 写入 Notion 页（含校验闸门，可选） |

**禁止引用**：`defect-screenshot-bug-ticket`、`bug-report-and-create`、`qa-agent-defect-intake`（除非仅读 handoff）。

---

## 输入

1. **优先**读取 `skill/mcp/output/handoff/latest.json`（若存在）中的 `projectName`、`reportOptions`
2. 用户可覆盖：项目名、`--no-closed`、`publishNotion`、`notionParentPageId`、`reportMode`

---

## 完整执行流程

### 步骤 1：拉取禅道缺陷

```bash
node skill/mcp/scripts/zentao-bugs-summary.mjs --project-name "{项目名}" [--no-closed] [--creator "童美娜"]
```

记录输出：
- MD 路径：`skill/mcp/output/{项目}-bugs-{日期}.md`
- JSON 路径：`skill/mcp/output/{项目}-bugs-{日期}.json`

---

### 步骤 2：生成单一统计事实源（新增 bug-stats）

```bash
# 或在脚本中调用 bug-stats 技能逻辑
# 输出：skill/mcp/output/{项目}-bugstats-{日期}.json
```

**关键约束**：
- `bugStats` 一旦生成，**本发布周期内只读不再重算**
- 钉钉报告和 Notion 报告中的**每一个数字**都必须从 `bugStats` 取，禁止重算

---

### 步骤 3：编写钉钉简版报告（test-report 排版 bugStats）

- 严格按 `test-report` 技能输出**三节**：一、测试结果 / 二、未解决问题汇总 / 三、缺陷附件
- **数字全取 `bugStats`**，不许重算
- 报告正文在内存中生成，**不必另存文件**（除非用户要求）

---

### 步骤 4：写入钉钉 + 推送（dingtalk-test-report）

- 完整正文写入钉钉文档
- 推送消息**仅摘录「一、测试结果」**
- 文档名建议：`【{项目}】测试报告 {YYYY-MM-DD}`

---

### 步骤 5（可选）：编排 Notion 富格式（test-report-notion）

**触发条件**：`publishNotion === true` 或用户明确要求。

- 输入：`bugStats.json` + 辅助测试资料（可选）
- 输出：Notion 增强 Markdown 全文（四节结构）
- **第二部分「功能测试范围与执行情况」为条件模块**：
  - 有辅助资料 → 渲染
  - 无资料 → 隐藏（不推断、不占位、不报错）

---

### 步骤 6（可选）：校验闸门 + 写入 Notion（notion-test-report）

**触发条件**：步骤 5 完成后执行。

#### 校验闸门（C1-C7）

全部以 `bugStats` 为基准，任一不过 → **硬阻断**，钉钉与 Notion 均不外发：

| 编号 | 校验项 | 判定 |
|------|--------|------|
| C1 | 「一、测试结果」未解决数 == `byStatus.未解决` | 必须相等 |
| C2 | 「三、未解决问题汇总」条目数 == `byStatus.未解决` | 必须相等 |
| C3 | 各级别数量 == `byLevel` | 必须相等 |
| C4 | 统计行 == bugStats | 必须相等 |
| C5 | 「四、待回归」条目数 == `待回归列表.length` | 必须相等 |
| C6 | 执行表各模块未解决之和 == `byStatus.未解决`（仅第二部分存在时） | 必须相等 |
| C7 | 缺陷标题与 bugStats 原文逐条一致 | 必须一致 |

#### 写入 Notion

- 目标页安全断言：写入目标页 ID ≠ `templatePageId`（`c1b23699-3b3b-4b06-b2ac-0ec9ede194b6`）
- 主路径：`API-update-page-markdown replace_content`
- Fallback：`patch-block-children` 纯段落 + 显式降级标注
- **幂等策略**（`reportMode`）：
  - `create-new`（默认）：每次新建页，标题带日期
  - `overwrite`：命中相同 reportKey 且为草稿才覆盖；覆盖前先存快照
  - `fail-on-duplicate`：命中重复直接报错退出
- 写入后回读确认

#### 失败处置

| 类别 | 处置 |
|------|------|
| **数据类**（C1-C7 不过） | **硬阻断**：不写 Notion、不推钉钉；存草稿（标 `validation_failed`）+ 告警 |
| **版式类** | 降级放行，在报告顶部加 `<callout icon="⚠️">版式降级</callout>` |
| **Notion 写入失败** | 不阻断钉钉（钉钉已通过校验） |

---

## 失败策略

| 失败点 | 处置 |
|--------|------|
| 拉取禅道失败 | **终止**，不编写报告、不推钉钉 |
| bugStats 生成失败 | **终止**，钉钉与 Notion 均不外发 |
| 校验闸门失败（数据类） | **硬阻断**，钉钉与 Notion 均不外发，存草稿 + 告警 |
| 钉钉文档成功但机器人失败 | 文档链接仍返回，说明推送需重试 |
| Notion 写入失败 | 不阻断钉钉；单独说明失败原因与可重试方式 |

---

## Handoff 只读

Agent2 **不修改** `bugsCreated`；可在 handoff 的 `notes` 追加报告链接（可选）。

---

## 报告发布完成回报

- 禅道汇总 MD 路径
- 钉钉文档链接
- 机器人推送结果（errcode）
- bugStats 路径
- 若启用 Notion：追加 Notion 页面链接或失败原因
