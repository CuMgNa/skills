# ADR-001 执行手册

## 日常（Notion 有变更）

```bash
cd emergency-rescue-graph

# 有 NOTION_TOKEN 时：
python scripts/run_pipeline.py --sync-mode api

# 或由 Agent/MCP 写入 sources/pages/*.md 后：
python scripts/run_pipeline.py --sync-mode import

# 仅本地文件变了：
python scripts/run_pipeline.py --sync-mode rehash
```

流水线会：同步哈希 → 标 stale/orphan → 抽 pending → 重建 graph（**不**自动晋升）。

## 人工复核

```bash
# 看候选
type candidates\pending.jsonl

python scripts/review_promote.py approve cand:...
python scripts/review_promote.py reject cand:... --reason "误报"
python scripts/review_promote.py confirm edge edge:0033
python scripts/review_promote.py archive edge edge:0092 --reason "页已废止"
python build_graph.py
```

## 定时（Windows）

任务计划程序每日：

`python c:\Users\33606\Desktop\skills\emergency-rescue-graph\scripts\run_pipeline.py --sync-mode api`

需环境变量 `NOTION_TOKEN`。
