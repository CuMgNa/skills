---
name: qa-agent-report-publish
description: QA报告发布Agent。拉取禅道缺陷、编写测试报告、写入钉钉并机器人推送。用户说拉缺陷/写测试报告/推送钉钉、或编排层Agent2阶段时触发。禁止截图提缺陷、创建禅道Bug。
---

# QA Agent2 — 报告发布（禅道 → 报告 → 钉钉）

本 Agent **只**执行缺陷汇总、测试报告、钉钉推送，不创建新 Bug。

## 允许引用的技能（仅此三个）

1. `@skill/skills/zentao-bug-summary/SKILL.md` — 拉取项目缺陷生成 MD/JSON
2. `@skill/skills/test-report/SKILL.md` — 根据汇总 MD 编写测试报告正文
3. `@skill/skills/dingtalk-test-report/SKILL.md` — 写入钉钉文档 + webhook 推送

## 禁止引用

- `defect-screenshot-bug-ticket` / `bug-report-and-create`
- `qa-agent-defect-intake`（除非仅读取 handoff 说明）

## 输入

1. **优先**读取 `skill/mcp/output/handoff/latest.json`（若存在）中的 `projectName`、`reportOptions.noClosed`。
2. 用户可覆盖：项目名、`--no-closed`（仅未关闭）、全量缺陷。

默认项目：`【磐钴】位置监控平台-国际化`

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

4. **回报用户**

- 禅道汇总 MD 路径、钉钉文档链接、机器人推送结果（errcode）。

## 失败策略

- 拉取禅道失败 → **终止**，不编写报告、不推钉钉。
- 钉钉文档成功但机器人失败 → 报告文档链接仍返回，并说明推送需重试。

## Handoff 只读

Agent2 **不修改** `bugsCreated`；可在 handoff 的 `notes` 追加报告链接（可选）。
