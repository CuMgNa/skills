---
name: notion-test-report
description: 测试报告可选写入 Notion 页面（仅报告发布阶段，qa-agent-report-publish）。用户明确要求同时写入 Notion 时触发。勿在截图提缺陷、新建禅道Bug流程中触发。
---

# Notion 测试报告发布

## 目标定位

- 本技能是 `dingtalk-test-report` 的并行补充渠道，不替代钉钉。
- 默认不执行；仅当 Agent2 已判定 `publishNotion=true` 或用户明确要求“同时写 Notion”时执行。
- 报告内容以“完整保真”为先，格式可保守降级。

## 输入

1. 测试报告 Markdown 正文（由 `test-report` 产出）。
2. Notion 目标（至少一种）：
   - `notionParentPageId`：将报告作为某页面子页面创建（首选）。
   - `notionDatabaseId`：写入数据库为新条目（需可写标题属性）。
3. 可选：`notionTitleProperty`（默认 `Name`，仅数据库模式使用）。

## 正文预处理规则（与钉钉保持一致）

- 过滤文档主标题（第一行 `# 标题`）。
- 过滤报告生成时间（`> 报告生成时间`）。
- 正文从“一、测试结果”开始，包含一、二、三全部内容。
- 不得删减原始报告语义；格式不兼容时转为普通段落文本。

## MCP 调用前置

调用任何 Notion MCP 工具前，先读取对应工具 schema 描述文件，确认参数结构。

核心工具：

- `API-post-page`：创建页面。
- `API-patch-block-children`：分批追加正文块。
- 可选辅助：`API-retrieve-a-page`、`API-retrieve-a-database`、`API-post-search`。

## 写入流程

### 1) 解析标题与父级

- 标题建议：`{项目名} 测试报告 YYYY-MM-DD`。
- 优先使用 `notionParentPageId`；若无则使用 `notionDatabaseId`。
- 两者都缺失则终止并返回“缺少 Notion 目标配置”。

### 2) 创建页面（API-post-page）

- parent:
  - 父页面模式：`{ "page_id": "<uuid>" }`
  - 数据库模式：`{ "type": "database_id", "database_id": "<uuid>" }`
- properties:
  - 父页面模式：只需 `title` 类型属性（按 Notion 返回要求构造）。
  - 数据库模式：标题属性键默认 `Name`，可由 `notionTitleProperty` 覆盖。

### 3) Markdown 到 Notion 块（首版保守映射）

- 普通行/段落 → `paragraph`
- 无序列表项（`- ` / `* `）→ `bulleted_list_item`
- 标题、引用、表格、分隔线等不支持语义 → 降级为 `paragraph` 文本

说明：当前 MCP schema 对块类型支持较窄，首版不做富文本强还原，优先保证完整入库。

### 4) 分批追加正文（API-patch-block-children）

- `block_id` 使用新建页面 ID。
- 分批追加 `children`，避免单次请求过大导致失败。
- 出错时返回已写入部分和失败原因，供重试。

## 输出

成功时返回：

- `notionPageId`
- `notionUrl`
- `notionWriteStatus=success`

失败时返回：

- `notionWriteStatus=failed`
- `error`（原始错误摘要）

## 失败策略

- Notion 写入失败不应覆盖钉钉已完成结果。
- 将失败作为附加渠道失败回报给用户，并提示可重试 Notion 发布。
