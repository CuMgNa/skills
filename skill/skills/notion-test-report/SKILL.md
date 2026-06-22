---
name: notion-test-report
description: 将测试报告写入 Notion 页面的写入层技能（仅报告发布阶段，qa-agent-report-publish）。主路径使用 API-update-page-markdown replace_content，fallback 到段落追加模式。用户明确要求"同时写入 Notion"时触发。
---

# Notion 测试报告发布（v3 升级版）

## 定位

- 本技能是 `dingtalk-test-report` 的并行渠道，不替代钉钉。
- 默认不执行；仅当 Agent2 已判定 `publishNotion=true` 或用户明确要求时执行。
- **报告内容以"数据正确 + 格式保真"为优先**，版式降级必须显式标注。

---

## 输入

| 输入 | 来源 | 说明 |
|------|------|------|
| `notionReportMD` | `test-report-notion` 产出 | Notion 增强 Markdown 全文 |
| `bugStats` | `bug-stats` 产出 | 单一统计事实源（用于校验） |
| `notionParentPageId` | `qa-agent-report-publish` 配置 | 写入父页面 ID |
| `reportMode` | handoff 配置 | `create-new`（默认）/ `overwrite` / `fail-on-duplicate` |
| `reportKey` | 计算得出 | `项目名 + 测试类型 + 覆盖期` |

---

## 核心工具

优先使用：
- `API-post-page`：创建空页面（仅 title）
- `API-update-page-markdown` + `type: replace_content`：一次性写入增强 Markdown

Fallback：
- `API-patch-block-children`：分批追加纯段落（仅在 replace_content 失败时降级使用）

---

## 完整流程

### 第一步：安全断言（必须先执行）

**目标页安全断言**：写入目标页 ID 必须 ≠ `templatePageId`（`c1b23699-3b3b-4b06-b2ac-0ec9ede194b6`），防止误覆盖样板页。

若相等 → 终止并返回错误："禁止写入样板页"。

### 第二步：幂等检查（根据 reportMode）

| 模式 | 行为 |
|------|------|
| `create-new`（默认） | 每次新建页，标题带日期时间戳 |
| `overwrite` | 命中相同 reportKey 且为草稿才覆盖；覆盖前先存快照 |
| `fail-on-duplicate` | 命中重复直接报错退出 |

**幂等键**：`reportKey = 项目名 + 测试类型 + 覆盖期/报告日期`

**留痕（覆盖前必做）**：覆盖前用 `API-retrieve-page-markdown` 读出旧内容，存 `skill/mcp/output/snapshots/{reportKey}-{timestamp}.md`。

### 第三步：校验闸门（写入前强制校验）

**全部以 `bugStats` 为基准**，任一不过 → **硬阻断**，钉钉与 Notion 均不外发。

| 编号 | 校验项 | 判定规则 |
|------|--------|---------|
| C1 | 「一、测试结果」未解决数 | 必须 == `bugStats.byStatus.未解决` |
| C2 | 「三、未解决问题汇总」条目总数 | 必须 == `bugStats.byStatus.未解决` |
| C3 | 各级别数量 | 必须 == `bugStats.byLevel`（一级/二级/三级/四级分别相等） |
| C4 | 统计行数字 | 必须 == `bugStats.total` / `bugStats.byStatus.未解决` / `bugStats.byStatus.已修复待回归` / `bugStats.byStatus.已延期` |
| C5 | 「四、待回归」条目数 | 必须 == `bugStats.待回归列表.length` |
| C6 | 执行表各模块未解决之和（仅当第二部分存在） | 必须 == `bugStats.byStatus.未解决`；每模块数字 == `bugStats.byModule` |
| C7 | 报告缺陷标题 | 必须与 `bugStats.未解决列表` / `bugStats.待回归列表` 原文逐条一致 |

**失败处置**：

| 类别 | 处置 |
|------|------|
| **数据类**（C1-C7 任何不过） | **硬阻断**：不写 Notion、不推钉钉；保留草稿（标 `validation_failed`）；告警「哪条校验、期望值 vs 实际值」 |
| **版式类**（调用 `API-update-page-markdown` 时格式渲染异常） | **降级放行**：仍发布，但报告顶部加 `<callout icon="⚠️" color="yellow_bg">版式降级通知：完整版式写入失败，内容以纯文本呈现</callout>` |
| **资料缺失**（第二部分辅助资料缺失） | 不算失败，跳过 C6，按 `test-report-notion` 规则隐藏第二部分 |

### 第四步：写入 Notion

#### 主路径（replace_content）

1. `API-post-page` 在 `notionParentPageId` 下创建空页（仅 title = `{项目} 测试报告 {YYYY-MM-DD}`）
2. `API-update-page-markdown` + `type: replace_content` 一次性写入 `notionReportMD`
3. 写入后 **回读** `API-retrieve-page-markdown` 做二次一致性目视检查（双保险）

#### Fallback（patch-block-children）

当 `replace_content` 失败时：

1. 降级为 `patch-block-children` 纯段落追加模式
2. 在报告顶部显式标注版式降级：
   ```markdown
   <callout icon="⚠️" color="yellow_bg">版式降级通知：由于技术限制，报告以纯文本形式写入，部分格式可能与预期不符。</callout>
   ```
3. 逐段追加 `paragraph` 和 `bulleted_list_item` 块

### 第五步：回读校验（双保险）

写入后执行 `API-retrieve-page-markdown` 读取刚写入的页面内容，**目视确认**关键信息存在（报告信息 callout、第一节数字、缺陷标题列表）。

若回读内容与预期严重不符（如 callout 完全丢失）→ 记录告警，**不阻断**（已完成写入优先）。

---

## 输出

成功时返回：

```json
{
  "notionPageId": "<新建页面ID>",
  "notionUrl": "https://www.notion.so/……",
  "notionWriteStatus": "success",
  "reportMode": "create-new",
  "sectionTwoRendered": true  // 或 false（无资料时）
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
2. **校验闸门先于写入**：C1-C7 全部通过才进入写入步骤
3. **降级必须显式标注**：任何版式降级都必须在报告顶部加 `<callout icon="⚠️">` 说明
4. **回读校验双保险**：写入后必须回读确认，不强制阻断但必须记录
5. **Notion 失败不阻断钉钉**：钉钉已通过同一份 bugStats 与校验，Notion 写入失败时钉钉推送不受影响
