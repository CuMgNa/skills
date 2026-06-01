# QA Pipeline（双 Agent + 编排）

## IDE 用法

| 场景 | 触发 |
|------|------|
| 全流程 | `@qa-orchestrator 全流程` + 截图 |
| 只提 Bug | `@qa-agent-defect-intake` + 截图 |
| 只出报告 | `@qa-agent-report-publish --no-closed` |
| 出报告并同步 Notion | `@qa-agent-report-publish` + 说明 Notion 目标（父页面/数据库） |

Handoff：`skill/mcp/output/handoff/latest.json`（已 gitignore）

## SDK 用法

```bash
# 安装（一次性）
cd skill/mcp && npm i @cursor/sdk

# 环境
set CURSOR_API_KEY=你的密钥

# 全流程
node skill/mcp/scripts/qa-pipeline.mjs --mode full ^
  --project "【磐钴】位置监控平台-国际化" ^
  --screenshots "C:\path\screenshot.png" ^
  --no-closed

# Agent2 同时写入 Notion（子页面模式，推荐）
node skill/mcp/scripts/qa-pipeline.mjs --mode agent2 ^
  --project "【磐钴】位置监控平台-国际化" ^
  --no-closed ^
  --notion ^
  --notion-parent-page-id "<uuid>"

# 仅 Agent2（无 API Key 时仅拉禅道）
node skill/mcp/scripts/qa-pipeline.mjs --mode agent2 --agent2-script --no-closed
```

## 技能索引

- `skill/skills/qa-orchestrator/SKILL.md`
- `skill/skills/qa-agent-defect-intake/SKILL.md`
- `skill/skills/qa-agent-report-publish/SKILL.md`
- `skill/skills/notion-test-report/SKILL.md`
