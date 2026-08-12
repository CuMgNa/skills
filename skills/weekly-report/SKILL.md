---
name: weekly-report
description: 用户要求生成周报/日志时触发（"生成周报""写周报""本周总结""周工作日志"等）。自动从 Teambition 拉取进行中项目的任务，按时间窗口分类（本周已完成/本周进行中/下周计划），读取任务详情（含评论/工时），结合 Notion 模板结构生成周报并写入指定父页面。支持自评周报和团队 lead 批量代生成。执行人 ID 与自定义字段 ID 运行时动态解析，Notion 页面 ID 固定。
allowed-tools: Bash, Glob, Grep, Read, Write, Agent
---

# 周报生成自动化

根据 Teambition 任务数据和 Notion 模板，自动生成软件研发周报并写入 Notion。

## 核心能力

- **时间窗口筛选**：严格区分「本周已完成 / 本周进行中 / 下周计划」，避免历史在办任务混入
- **动态字段解析**：执行人 ID 和项目自定义字段 ID 运行时通过 `listTools` 动态获取，不写死
- **幂等保护**：检测当周是否已存在同名周报，避免重复创建
- **批量代生成**：支持团队 lead 为多名成员各生成一份独立周报
- **自检校验**：写入前检查进展说明、风险来源、截止时间等必填项

## 触发场景

用户说以下任一语句时触发：
- "生成周报"
- "写周报"
- "本周总结"
- "周工作日志"
- "帮我生成本周工作汇报"

## 配置语义锚点

以下为语义锚点配置，运行时动态解析对应 ID：

```yaml
identity:
  mode: current_user        # current_user | byName | byExecutorIds
  byName: ~                 # 如 童美娜（mode=byName 时用）
  byExecutorIds: ~          # 如 [id1, id2]（mode=byExecutorIds，批量代生成）
  overrideExecutorId: ~     # 仅当自动解析失败时手动填

fieldHints:                 # 按名称/类型逐项目解析，不写死字段 ID
  实际工时: { type: worktime, prefer: "worktime:total:worktime" }
  计划工时: { type: worktime, prefer: "worktime:total:plantime" }
  最新评论: { nameContains: 评论 }

riskKeywords:               # 风险/阻塞识别词
  - 阻塞
  - 延期
  - 卡住
  - 风险
  - 受阻
  - 等待
  - 需要支持
  - 依赖未就绪

limits:                     # 批量与性能护栏
  projectPageSize: 50       # 项目翻页，每批数量
  detailBatchSize: 25       # get_task_detail 每批最多 ID 数
  taskWarnThreshold: 500    # 总任务数超过此值则告警
  taskHardCap: 2000         # 超过此硬上限则要求缩小范围

notion:                     # Notion 固定配置（文档不变更）
  templatePageId: "3615667c6d3a80089c1aeceaebf33711"
  targetParentId: "3615667c6d3a80de9cc1fdb63d3424d4"
```

## 执行流程

### 第零步：环境与身份解析

**必须先确认可用工具，再解析身份。严禁凭记忆或模糊描述传参。**

1. **工具发现**：调用 `listTools`，在结果中按能力定位真实工具名：
   - 当前用户工具：名称/描述含 `me`/`current user`/`whoami`/`当前用户`/`账户信息` 的只读工具
   - 项目成员工具：可按项目列成员、支持姓名匹配的工具
   - 项目自定义字段定义工具：可列出项目 customFields 定义（含 `_id/name/type`）的工具
   - **将解析到的真实工具名记录到运行上下文**，后续步骤引用该名

2. **执行人解析**（三种模式）：
   - `current_user`：调用当前用户工具，取返回字段中的用户唯一标识作为 `executorId`
   - `byName`：用项目成员工具按姓名匹配；命中多个时列出候选要求确认
   - `byExecutorIds`：传入多个执行人 ID，对每个执行人各生成一份独立周报

3. **降级策略**：
   - 当前用户工具不存在 → 自动降级到 `byName`
   - `byName` 也不可用 → 要求填 `overrideExecutorId`
   - 仍无 → **fail fast**，明确报错"无法确定执行人"

4. **时间窗口**：未指定则按 Asia/Shanghai 时区计算本周一~本周日及下周一~下周日

> 多执行人时，第一~第八步对每个 executorId 各跑一遍，分别产出独立周报页面。

---

### 第一步：拉取进行中项目

```javascript
get_user_projects({ pageSize: 50, nextToken: <上一页token> })
// 循环翻页直到无 nextToken；过滤 isArchived=false 且 isSuspended=false
```

---

### 第二步：逐项目解析自定义字段映射

> Teambition 自定义字段 ID 按项目定义，不同项目不同，不能用一个 ID 套所有项目。

对每个进行中项目，调用「字段定义工具」读取字段定义，按 `fieldHints` 的名称/类型匹配出真实字段 ID，构建并缓存 `fieldMap[projectId]`：

```
fieldMap[projectId] = {
  实际工时: <type=worktime 且名含"实际工时"；优先系统键 worktime:total:worktime>,
  计划工时: <同上，优先 worktime:total:plantime>,
  最新评论: <名称含"评论"的文本字段 ID>
}
```

**解析规则**：
- 工时优先用跨项目稳定的系统键 `worktime:total:worktime` / `worktime:total:plantime`
- 某项目某字段解析不到 → 该字段在该项目**留空并记入告警**，**绝不跨项目套用别的 ID**

---

### 第三步：按时间窗口分类查任务

对每个进行中项目执行三组带时间条件的 TQL 查询：

```
# A. 本周已完成
projectId = <项目ID> AND executorId = <executorId> AND isArchived = false
  AND isDone = true AND accomplishTime >= <weekStart> AND accomplishTime <= <weekEnd>

# B. 本周进行中（本周有进展/更新）
projectId = <项目ID> AND executorId = <executorId> AND isArchived = false
  AND isDone = false AND progress > 0 AND updated >= <weekStart> AND updated <= <weekEnd>

# C. 下周计划（截止落在下周）
projectId = <项目ID> AND executorId = <executorId> AND isArchived = false
  AND isDone = false AND dueDate >= <nextWeekStart> AND dueDate <= <nextWeekEnd>
```

> 字段可查询性以 schema 为准；不可查询时降级到 detail 阶段按时间过滤。

---

### 第四步：批量读取详情（含数量护栏）

1. **去重汇总**：合并 A/B/C 三组并去重，得到总任务数 `N`
2. **数量护栏**：
   - `N > 500` → 输出性能告警，提示用户可缩小时间范围或项目集；继续执行
   - `N > 2000` → 要求缩小范围，避免超时
3. **分批串行拉取**：`get_task_detail` 每批 ≤25 个 ID，按批串行；批间短暂退避，失败批次重试一次
4. **字段取值**：通过 `fieldMap` 动态定位，不引用硬编码 ID

| 字段 | 用途 |
|------|------|
| `content` | 任务名称 |
| `priority` | 优先级（2=非常紧急, 1=紧急, 0=普通, -10=较低）→ 排序/紧急标记 |
| `progress` | 进展百分比 |
| `isDone` | 完成状态 |
| `dueDate` | 截止日期（UTC +8h 转北京时间） |
| `accomplishTime` | 完成时间（UTC +8h） |
| `tags` | 小任务按标签合并 |
| `customFields[ fieldMap[pid].最新评论 ]` | 最新评论（说明/风险来源） |
| `worktime:total:worktime`（首选）/ 兜底字段 | 实际工时 |
| `worktime:total:plantime`（首选）/ 兜底字段 | 计划工时 |

> 工时取数优先级：系统键 worktime:total:worktime（毫秒换算）> 项目字段兜底 > 留空。

---

### 第五步：读取并提炼 Notion 模板结构

```
API-retrieve-page-markdown({ page_id: notion.templatePageId })
```

- **只提取结构骨架与填写原则**，剥离模板中所有"模板："/"示例："占位正文
- 保留三大板块：本周工作进展 / 风险与问题 / 下周工作计划

---

### 第六步：内容组织规则

**本周工作进展**
- 项目类：按项目分组，`【模块/阶段/任务】 具体任务；说明：…；状态：已完成/进度N%`
- 非项目/零散小任务：按标签【日常运维】【需求支持】【质量保障】【协同支撑】【效率改进】**合并汇总**，写"总量 + 1~2 个典型案例"
- "说明"优先取最新评论；无评论时用任务描述提炼

**风险与问题**
- 来源：阻塞状态任务，或评论/描述中命中 `riskKeywords` 任意关键词的任务
- 格式：`【模块/任务】 现象：…；影响：…；需要：…；期望解决时间：…`
- 无命中：保留板块并写"（本周无重大风险，或待人工补充）"，不整段省略

**下周工作计划**
- 来源：第三步 C 组（dueDate 落在下周）
- 格式：`【模块/任务】 具体任务；截止时间：<dueDate 北京时间>；完成标志：…`
- "完成标志"优先从描述/评论提炼，无法提炼时留"待补充"

---

### 第七步：写入前自检

- [ ] 每条进展是否写了"说明"而非仅"做了什么"？
- [ ] 风险项是否写清"需要谁支持 + 时间点"？
- [ ] 下周计划是否写清"截止时间 + 完成标志"？
- [ ] 是否已剥离模板示例正文？
- [ ] 小任务是否已按标签合并、无流水账？
- [ ] 是否有项目字段解析失败而留空？（有则列出告警）
- [ ] 任务总数是否触发告警阈值？（触发则在输出中提示）

---

### 第八步：幂等检查 + 写入固定父页

1. **幂等检查**：在 `notion.targetParentId` 下查是否已存在 `软件研发周报 <weekStart> · <执行人姓名>`
   - 已存在 → 提示选择"更新现有页面"或"另建副本"，默认不重复创建
2. **创建页面**：
   ```javascript
   API-post-page({
     parent: { page_id: notion.targetParentId },
     properties: { title: [{ text: { content: "软件研发周报 <weekStart> · <执行人姓名>" } }] },
     children: [...]
   })
   ```
3. **分批写入**：每批 ≤100 个 block
4. **空结果跳过**：某项目本周对该执行人无任务则跳过，不生成空标题段

---

## 输出格式

**成功**（每个执行人各一条）：
- `notionPageId` / `notionUrl`
- `executorId` / `executorName`
- `weekStart` / `weekEnd`
- `projectCount`（纳入的项目数）
- `taskStats`（已完成 / 进行中 / 下周计划 各计数）
- `taskTotal`（总任务数）
- `fieldResolveWarnings`（字段解析告警列表）
- `volumeWarning`（是否触发数量告警）
- `reportStatus = success`

**失败**：
- `reportStatus = failed`
- `error`（原始错误摘要）
- `writtenPartial`（已写入的 block 数，供续写/重试）

---

## 工时换算

- 毫秒 → 分钟：`÷ 60000`
- 毫秒 → 小时：`÷ 3600000`

---

## 失败策略

| 场景 | 处理方式 |
|------|---------|
| 缺少当前用户工具且无 byName/override | fail fast，明确报因 |
| Teambition 项目/任务查询失败 | 终止，不写 Notion |
| 某项目某自定义字段解析失败 | 留空 + 告警，不跨项目套 ID，不中断整体 |
| 任务数超硬上限(2000) | 要求缩小时间范围或排除部分项目 |
| Notion 读取模板失败 | 使用默认结构（本周工作进展 / 风险与问题 / 下周工作计划）继续 |
| Notion 写入失败 | 返回已写入部分与原因，供续写重试 |

---

## 注意事项

1. **调用任何 MCP 工具前，必须先读取该工具的 schema 确认参数结构**，不凭记忆传参
2. **执行人 ID 必须运行时动态解析**，不能写死在配置中
3. **自定义字段 ID 按项目独立映射**，不同项目的同一字段 ID 可能不同，绝不跨项目套用
4. **时间字段统一 UTC +8h 转北京时间**后再比较和展示
5. **工时单位需明确**：系统键 `worktime:total:worktime` 是毫秒，需除以 60000 转换为分钟