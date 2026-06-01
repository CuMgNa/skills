---
name: qa-agent-report-publish
description: QA报告发布Agent。拉取禅道缺陷、编写测试报告、写入钉钉并机器人推送；可选同步写入 Notion。用户说拉缺陷/写测试报告/推送钉钉、或编排层Agent2阶段时触发。禁止截图提缺陷、创建禅道Bug。
---

# QA Agent2 — 报告发布（禅道 → 报告 → 钉钉 [→ Notion]）

本 Agent **只**执行缺陷汇总、测试报告、钉钉推送（及可选 Notion），不创建新 Bug。

## 允许引用的技能（仅此四个）

1. `@skill/skills/zentao-bug-summary/SKILL.md` — 拉取项目缺陷生成 MD/JSON
2. `@skill/skills/test-report/SKILL.md` — 根据汇总 MD 编写测试报告正文
3. `@skill/skills/dingtalk-test-report/SKILL.md` — 写入钉钉文档 + webhook 推送
4. `@skill/skills/notion-test-report/SKILL.md` — 可选：将完整报告写入 Notion 页面

## 禁止引用

- `defect-screenshot-bug-ticket` / `bug-report-and-create`
- `qa-agent-defect-intake`（除非仅读取 handoff 说明）

## 输入

1. **优先**读取 `skill/mcp/output/handoff/latest.json`（若存在）中的 `projectName`、`reportOptions`（含 `noClosed`、`publishNotion`、`notionParentPageId`、`notionDatabaseId`、`notionTitleProperty`）。
2. 用户可覆盖：项目名、`--no-closed`（仅未关闭）、全量缺陷、是否写 Notion、Notion 目标。

默认项目：`【磐钴】位置监控平台-国际化`

### Notion 可选发布

- **钉钉必选**：无论是否写 Notion，都必须执行 `dingtalk-test-report`（机器人依赖钉钉文档链接）。
- **Notion 默认关闭**：仅当用户明确说「同时写 Notion」或 `reportOptions.publishNotion === true` 时执行 `notion-test-report`。
- **目标配置**：`notionParentPageId`（子页面，首选）或 `notionDatabaseId`（数据库条目）；数据库模式可用 `notionTitleProperty` 指定标题列名（默认 `Name`）。

## 执行流程

1. **拉取缺陷**

```bash
node skill/mcp/scripts/zentao-bugs-summary.mjs --project-name "{项目名}" [--no-closed]
```

记录输出的 MD 路径（如 `skill/mcp/output/【磐钴】位置监控平台-国际化-bugs-YYYYMMDD-no-closed.md`）。

2. **编写测试报告**

- 读取上一步 MD，严格按 `test-report` 技能输出三节：一、测试结果；二、未解决问题汇总；三、缺陷附件。
- 报告正文可在内存中生成，**不必**另存本地文件（除非用户要求）。

3. **钉钉文档 + 推送**

- 按 `dingtalk-test-report`：完整正文写入钉钉文档；推送消息**仅摘录「一、测试结果」**。
- 文档名建议：`【磐钴】位置监控平台-国际化 测试报告 YYYY-MM-DD`。

4. **可选：写入 Notion**

- 若启用 Notion：在钉钉文档与机器人推送**均已完成**后，按 `notion-test-report` 将完整正文写入 Notion。
- 若缺少 `notionParentPageId` / `notionDatabaseId`，跳过 Notion 并说明原因（钉钉结果仍返回）。

5. **回报用户**

- 禅道汇总 MD 路径、钉钉文档链接、机器人推送结果（errcode）。
- 若启用 Notion：追加 Notion 页面链接或失败原因。

## 失败策略

- 拉取禅道失败 → **终止**，不编写报告、不推钉钉。
- 钉钉文档成功但机器人失败 → 报告文档链接仍返回，并说明推送需重试。
- Notion 写入失败 → **不阻断**钉钉结果；单独说明 Notion 失败与可重试方式。

## Handoff 只读

Agent2 **不修改** `bugsCreated`；可在 handoff 的 `notes` 追加报告链接（可选）。
