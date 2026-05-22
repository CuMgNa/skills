---
name: qa-orchestrator
description: QA全流程编排。用户说全流程/截图到报告/提缺陷并出报告、或需自动串行缺陷录入与报告发布时触发。路由到Agent1(截图→禅道)与Agent2(拉缺陷→报告→钉钉)，管理handoff。
---

# QA Orchestrator — 双 Agent 编排

协调 **Agent1（缺陷录入）** 与 **Agent2（报告发布）**，统一 handoff 契约。

## 默认项目

`【磐钴】位置监控平台-国际化`（用户可覆盖）

## 意图路由

| 用户意图 | 执行 |
|----------|------|
| 上传截图 / 提缺陷 / 写禅道 / 识别缺陷 | **仅 Agent1** → `@skill/skills/qa-agent-defect-intake/SKILL.md` |
| 拉缺陷 / 写测试报告 / 推送钉钉 / 出报告 | **仅 Agent2** → `@skill/skills/qa-agent-report-publish/SKILL.md` |
| 全流程 / 截图到报告 / 缺陷+报告一条龙 | **Agent1 → Agent2**（串行） |

## Handoff 契约

- **路径**：`skill/mcp/output/handoff/latest.json`
- **Schema**：`skill/mcp/output/handoff/handoff.schema.json`
- Agent1 **必须写入**；Agent2 **必须读取**（存在时优先用其中 `projectName`、`reportOptions`）
- 已加入 `.gitignore`，勿提交仓库

示例见 `handoff.schema.json`。

## IDE 执行方式（推荐）

### 方式 A：同一会话分步（Task 不可用时）

1. 读取本技能，判定路由。
2. **全流程**：先完整执行 `qa-agent-defect-intake`（含用户确认写禅道），再执行 `qa-agent-report-publish`。
3. 两步之间检查 `handoff/latest.json` 是否存在且 `projectName` 正确。

### 方式 B：Task 子 Agent（可用时）

**Agent1 子任务 prompt 模板：**

```
你是 QA Agent1（缺陷录入）。严格遵循 @skill/skills/qa-agent-defect-intake/SKILL.md。
项目：{projectName}
截图路径：{screenshotPaths}
用户简述：{userNote}
完成后必须写入 skill/mcp/output/handoff/latest.json。不要拉取禅道汇总、不要写测试报告、不要推钉钉。
```

**Agent2 子任务 prompt 模板：**

```
你是 QA Agent2（报告发布）。严格遵循 @skill/skills/qa-agent-report-publish/SKILL.md。
先读取 skill/mcp/output/handoff/latest.json（若存在）。
项目：{projectName}
未关闭缺陷：{noClosed}
不要创建新禅道 Bug。
```

使用 Cursor **Task** 工具，`subagent_type=generalPurpose`，分别传入上述 prompt。

## SDK 执行方式

```bash
node skill/mcp/scripts/qa-pipeline.mjs \
  --project "【磐钴】位置监控平台-国际化" \
  --mode full \
  --screenshots "path1.png,path2.png" \
  --no-closed
```

需环境变量 `CURSOR_API_KEY`。详见脚本 `--help`。

## 失败策略

1. Agent1 部分 Bug 创建失败：仍写 handoff（`bugsFailed` 填原因），询问用户是否继续 Agent2。
2. Agent1 全部失败：不写空 handoff 冒充成功；询问是否重试或仅跑 Agent2。
3. Agent2 拉取禅道失败：**终止**，不推钉钉。
4. Agent2 钉钉推送失败：仍返回文档链接，标注 webhook 需重试。

## 子技能索引

| Agent | Skill 路径 |
|-------|------------|
| Agent1 | `skill/skills/qa-agent-defect-intake/SKILL.md` |
| Agent2 | `skill/skills/qa-agent-report-publish/SKILL.md` |

底层能力仍由 `defect-screenshot-bug-ticket`、`bug-report-and-create`、`zentao-bug-summary`、`test-report`、`dingtalk-test-report` 提供。
