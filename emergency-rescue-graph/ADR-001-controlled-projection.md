# ADR-001：Notion 受控投影图谱

- 状态：Accepted（执行链已落地）
- 日期：2026-07-24
- 来源：grill-me 会话（Q3–Q15）

## 上下文

应急救援平台图谱原料来自 Notion PRD/协议。若边长期手写在 `build_graph.py`，Notion 变更后会出现第二份事实源，维护冗余且易漂移。

## 决策

采用 **受控投影（Controlled Projection）**：

| 层 | 路径 | 职责 |
|---|---|---|
| 原料 | Notion → `sources/pages/<page_id>.md` + `coverage.json` | 页级差分与 provenance |
| 人类阅读 | `sources/应急救援平台完整知识汇总.md` | **只读**，不参与构图 |
| 正式图 | `formal/nodes.jsonl`、`formal/edges.jsonl`、`formal/decisions.jsonl` | 唯一可查询正式源 |
| 候选 | `candidates/pending.jsonl` 等 | 语义抽取产物；默认待审 |
| 导出 | `build_graph.py` → `graphify-out/` | 只读 formal + coverage，禁止吞并 pending |

### 锁定细则

1. **禁止自动晋升**：候选边不得写入 `formal/` 或 `graph.json`；仅 `scripts/review_promote.py approve` 可晋升。
2. **页变更**：锚点级标 `stale`（无锚点的 legacy 边对该页变更整页兜底）；查询可见但降权并强制标注待确认。
3. **页删除/移出树**：标 `orphan` + 降权；人工 `archive` 才移除。
4. **抽取**：先开放 raw → 投影到本体；失败进 `candidates/unmapped/`。
5. **与 decision 冲突的候选**：进 pending，带 `conflicts_decision_id`，置顶审，不静默丢弃。
6. **存量迁移**：一次导出 formal；缺 `source_anchor` 标 `legacy=true`；新批准边强制带锚点。
7. **同步**：定时/手动拉取 Notion；自动只做发现，不做晋升。

## 执行链（已实现）

```text
python scripts/run_pipeline.py --sync-mode import|api|rehash
```

等价分步：

1. `scripts/sync_notion_pages.py` — 拉页/导入/重哈希 → 更新 `coverage.json` + `graphify-out/last_diff.json`
2. `scripts/apply_stale_orphan.py` — 按差分写回 formal 的 `stale`/`orphan`
3. `scripts/extract_candidates.py` — 变更页抽候选 → `pending` / `unmapped`（**不**进 formal）
4. `build_graph.py` — 只读 formal 导出；stale/orphan 降权并加「待确认」标注

人工闸门：

```text
python scripts/review_promote.py approve <cand_id>
python scripts/review_promote.py reject <cand_id> --reason "..."
python scripts/review_promote.py confirm edge <edge_id>    # 清除 stale
python scripts/review_promote.py archive edge <edge_id> --reason "..."
```

同步模式：

| mode | 何时用 |
|---|---|
| `api` | 设置 `NOTION_TOKEN`，脚本直拉 Notion |
| `import` | Agent/MCP 已写入 `sources/pages/*.md` 后重算哈希 |
| `rehash` | 仅根据本地 pages 刷新 coverage 哈希 |

Windows 定时：任务计划程序每日调用 `python scripts/run_pipeline.py --sync-mode api`（需 Token）。

## 后果

- 正面：Notion 变更时冗余落在复核队列，而非手写第二份 PRD；冲突/风险决议可进 `decisions.jsonl` 持久化。
- 负面：需维护 formal 与 promote 流程；legacy 锚点债需逐步还清；抽取目前为规则/共现启发式，精度低于 LLM deep 模式。

## 非目标

- `graphify .` AST 全量重建（本语料非代码库）
- 汇总 md 自动再生
- Notion webhook 近实时推送（可用定时 api 替代）
