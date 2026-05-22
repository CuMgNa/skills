---
name: qa-agent-defect-intake
description: QA缺陷录入Agent。仅用于截图提取缺陷并写入禅道。用户上传缺陷截图、说提bug/写入禅道、或编排层Agent1阶段时触发。禁止拉取缺陷汇总、写测试报告、钉钉推送。
---

# QA Agent1 — 缺陷录入（截图 → 禅道）

本 Agent **只**执行缺陷 intake，不执行报告与钉钉流程。

## 允许引用的技能（仅此两个）

1. `@skill/skills/defect-screenshot-bug-ticket/SKILL.md` — 从截图提取 8 块 Bug 单
2. `@skill/skills/bug-report-and-create/SKILL.md` — 确认后 `--steps` 直接写入禅道

## 禁止引用

- `zentao-bug-summary` / `test-report` / `dingtalk-test-report`
- `qa-agent-report-publish` / `qa-orchestrator`（除非编排层明确要求只读 handoff 路径）

## 执行流程

1. 读取用户截图（及可选一句简述、项目名；默认项目：`【磐钴】位置监控平台-国际化`）。
2. 按 `defect-screenshot-bug-ticket` 输出 8 块字段，展示给用户确认。
3. 用户确认后，按 `bug-report-and-create` 构造 `zentao-bug-create.mjs` 命令（`--steps` 内用真实换行或 `\n`，序号 `1.` `2.` `3.`）。
4. 执行脚本，收集返回的 Bug ID 与链接。
5. **写入 handoff**（必须，即使部分失败）：

路径：`skill/mcp/output/handoff/latest.json`

```json
{
  "projectName": "【磐钴】位置监控平台-国际化",
  "timestamp": "2026-05-13T16:00:00+08:00",
  "screenshotPaths": ["绝对路径1.png"],
  "bugsCreated": [{ "id": 3037, "title": "【模块】标题", "url": "https://zentao.../bug-view-3037.html", "severity": 3, "pri": 2 }],
  "bugsFailed": [],
  "reportOptions": { "noClosed": true, "openedBuild": "管理后台-国际化V1.3" },
  "notes": ""
}
```

6. 向用户汇报：已创建 Bug 列表 + handoff 路径；若编排层后续要跑 Agent2，提示可 `@qa-agent-report-publish` 或 `@qa-orchestrator 继续出报告`。

## 幂等

- 若 `handoff/latest.json` 中已有**同日同 title** 的 `bugsCreated`，询问用户是否跳过重复创建。

## 脚本路径（工作区根相对）

`skill/mcp/scripts/zentao-bug-create.mjs`
