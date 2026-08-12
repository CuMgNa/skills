"""
Build graphify-out from formal/*.jsonl + coverage.json only.

ADR-001: never read candidates/pending into the published graph.
Promotion is only via scripts/review_promote.py approve.
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "graphify-out"
FORMAL = ROOT / "formal"
CANDIDATES = ROOT / "candidates"
OUT.mkdir(exist_ok=True)
CANDIDATES.mkdir(exist_ok=True)

# Hard guard: published graph must not ingest pending.
FORBIDDEN_INPUTS = (
    CANDIDATES / "pending.jsonl",
    CANDIDATES / "unmapped.jsonl",
    CANDIDATES / "raw.jsonl",
)


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))
    return rows


def assert_no_auto_promotion() -> None:
    for path in FORBIDDEN_INPUTS:
        # File may exist for the review queue; build must ignore it.
        if path.exists() and path.stat().st_size and "AUTO_PROMOTE" in path.read_text(encoding="utf-8"):
            raise SystemExit(f"检测到禁止的自动晋升标记: {path}")


def main() -> None:
    assert_no_auto_promotion()
    coverage = json.loads((ROOT / "coverage.json").read_text(encoding="utf-8"))
    pages = {p["id"]: p for p in coverage["pages"]}
    formal_nodes = load_jsonl(FORMAL / "nodes.jsonl")
    formal_edges = load_jsonl(FORMAL / "edges.jsonl")
    decisions = load_jsonl(FORMAL / "decisions.jsonl")
    pending_count = len(load_jsonl(CANDIDATES / "pending.jsonl"))
    unmapped_count = len(load_jsonl(CANDIDATES / "unmapped.jsonl"))

    if not formal_nodes or not formal_edges:
        raise SystemExit("formal/nodes.jsonl 或 edges.jsonl 为空；请先运行 scripts/migrate_to_formal.py")

    nodes: list[dict] = []
    links: list[dict] = []
    seen: set[str] = set()

    def add_node(rec: dict) -> None:
        nid = rec["id"]
        if nid in seen:
            return
        seen.add(nid)
        label = rec.get("label") or nid
        nodes.append(
            {
                "id": nid,
                "label": label,
                "norm_label": label,
                "file_type": rec.get("kind", "concept"),
                "domain": rec.get("domain", "未分类"),
                "description": rec.get("description", ""),
                "source_file": "formal/nodes.jsonl",
                "source_location": (
                    f"Notion:{rec['source_page_id']}"
                    if rec.get("source_page_id")
                    else "formal"
                ),
                "source_page_id": rec.get("source_page_id"),
                "legacy": rec.get("legacy", False),
                "stale": rec.get("stale", False),
                "orphan": rec.get("orphan", False),
                "source_anchor": rec.get("source_anchor"),
            }
        )

    for p in coverage["pages"]:
        add_node(
            {
                "id": f"page:{p['id']}",
                "label": p["title"],
                "domain": "来源文档",
                "description": (
                    f"Notion 来源页；truncated={str(p['truncated']).lower()}；"
                    f"unknown_block_ids={p['unknown_block_ids']}"
                ),
                "kind": "document",
                "source_page_id": p["id"],
                "legacy": False,
                "stale": False,
                "orphan": False,
            }
        )

    for n in formal_nodes:
        if n.get("status") == "archived":
            continue
        add_node(n)

    def add_edge(rec: dict, *, from_coverage: bool = False) -> None:
        if rec.get("status") == "archived":
            return
        src, tgt = rec["source"], rec["target"]
        if src not in seen or tgt not in seen:
            raise ValueError(f"missing endpoint: {src} -> {tgt} ({rec.get('id')})")
        score = float(rec.get("confidence_score", 0.95))
        page_id = rec.get("source_page_id")
        stale = bool(rec.get("stale"))
        orphan = bool(rec.get("orphan"))
        weight = score
        if stale or orphan:
            weight = min(weight, 0.4)
        evidence = rec["evidence"]
        if stale:
            evidence = f"【待确认·来源页已变更】{evidence}"
        if orphan:
            evidence = f"【待确认·来源页已不存在】{evidence}"
        section = rec.get("source_section") or ""
        anchor = rec.get("source_anchor")
        location = rec.get("source_location")
        if not location:
            if from_coverage:
                location = f"Notion:{page_id}；coverage"
            elif anchor:
                location = f"Notion:{page_id}；anchor:{anchor}"
            else:
                location = f"Notion:{page_id}；汇总#{section}" if page_id else "formal"
        links.append(
            {
                "id": rec.get("id"),
                "source": src,
                "target": tgt,
                "relation": rec["relation"],
                "evidence": evidence,
                "confidence": rec.get("confidence", "EXTRACTED"),
                "confidence_score": score,
                "weight": weight,
                "query_note": (
                    "来源页已变更，边待确认"
                    if stale
                    else ("来源页已不存在，边待确认" if orphan else None)
                ),
                "source_file": "formal/edges.jsonl" if not from_coverage else "coverage.json",
                "source_page_id": page_id,
                "source_page_title": rec.get("source_page_title")
                or pages.get(page_id or "", {}).get("title"),
                "source_location": location,
                "source_anchor": anchor,
                "legacy": rec.get("legacy", False),
                "stale": stale,
                "orphan": orphan,
            }
        )

    for p in coverage["pages"]:
        add_edge(
            {
                "id": f"cov:{p['id']}",
                "source": f"page:{p['id']}",
                "target": "platform",
                "relation": "documents",
                "evidence": f"来源页《{p['title']}》属于本次应急救援平台页面树并已完整读取。",
                "confidence": "EXTRACTED",
                "confidence_score": 1.0,
                "source_page_id": p["id"],
                "legacy": False,
                "stale": False,
                "orphan": False,
            },
            from_coverage=True,
        )

    for e in formal_edges:
        add_edge(e)

    domain_ids = {d: i for i, d in enumerate(sorted({n["domain"] for n in nodes}))}
    for n in nodes:
        n["community"] = domain_ids[n["domain"]]

    stale_n = sum(1 for e in links if e.get("stale"))
    orphan_n = sum(1 for e in links if e.get("orphan"))
    legacy_n = sum(1 for e in links if e.get("legacy"))

    graph = {
        "directed": True,
        "multigraph": False,
        "graph": {
            "title": "应急救援平台知识图谱",
            "generated_at": coverage["generated_at"],
            "source_pages": coverage["audit"]["source_pages"],
            "coverage_file": "../coverage.json",
            "formal_dir": "../formal",
            "summary_file": "../sources/应急救援平台完整知识汇总.md",
            "summary_role": "human_read_only",
            "adr": "../ADR-001-controlled-projection.md",
            "community_labels": {str(v): k for k, v in domain_ids.items()},
            "hyperedges": [],
            "pending_candidates": pending_count,
            "unmapped_candidates": unmapped_count,
            "decisions": len(decisions),
            "stale_edges": stale_n,
            "orphan_edges": orphan_n,
            "legacy_edges": legacy_n,
            "auto_promote": False,
        },
        "nodes": nodes,
        "links": links,
    }
    (OUT / "graph.json").write_text(
        json.dumps(graph, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    degree: Counter[str] = Counter()
    for e in links:
        degree[e["source"]] += 1
        degree[e["target"]] += 1
    labels = {n["id"]: n["label"] for n in nodes}
    gods = degree.most_common(10)
    domain_counts = Counter(n["domain"] for n in nodes)
    confidence_counts = Counter(e["confidence"] for e in links)

    report = f"""# 应急救援平台知识图谱报告

> 生成日期：{coverage['generated_at']}  
> 图谱规模：{len(nodes)} 个节点、{len(links)} 条有向边、{coverage['audit']['source_pages']} 个来源页  
> 构图源：`formal/*.jsonl` + `coverage.json`（ADR-001 受控投影；**禁止**自动晋升候选边）  
> 证据原则：边均含 `evidence`、`confidence`、`source_page_id` 与 `source_location`；冲突规则标为 `AMBIGUOUS`。

## 覆盖审计

- 页面读取：{coverage['audit']['source_pages']}；截断：{coverage['audit']['truncated_pages']}；含未知块：{coverage['audit']['pages_with_unknown_blocks']}。
- 纳入图谱：{coverage['audit']['included_pages']} 页；未覆盖：{len(coverage['uncovered'])} 页。
- 节点域：{len(domain_counts)} 个；EXTRACTED 边：{confidence_counts.get('EXTRACTED', 0)}；AMBIGUOUS 边：{confidence_counts.get('AMBIGUOUS', 0)}。
- formal 决议：{len(decisions)}；pending 候选：{pending_count}（未并入正式图）；unmapped：{unmapped_count}。
- 边状态：legacy={legacy_n}；stale={stale_n}；orphan={orphan_n}（stale/orphan 查询应降权并标注待确认）。
- 完整页面审计见 `../coverage.json`；人类可读汇总见 `../sources/应急救援平台完整知识汇总.md`（**不参与构图**）。
- 设计决策见 `../ADR-001-controlled-projection.md`。

## God Nodes

连接度最高的桥接节点：
""" + "\n".join(
        f"{i+1}. **{labels[node_id]}** — 度数 {count}" for i, (node_id, count) in enumerate(gods)
    ) + """

这些节点并不等同于“最重要需求”，而是跨来源、跨域连接最多的结构枢纽。

## Surprising Connections

1. **SOS 安全与计费归属直接耦合**：无“我的”扣费主体且套餐耗尽时，规则会让包括 SOS 在内的上行停止；这不是普通计费失败，而是生命安全边界。
2. **设备归属变更会搬运历史负账**：套餐资源和负账随设备走，星豆却随账号走；跨企业/个人绑定同时影响后续计费主体和历史责任。
3. **一个“已读”横跨协议与 UI**：服务端“已读”来自终端 ACK，并非人类查看，技术状态直接制造产品文案风险。
4. **清欠不是一条路径**：对应套餐回填设备子池、星豆冲抵欠费、后台线下核销聚合账单并存，必须在数据模型中分层。
5. **SOS 与常驻对讲群并行但只计一次上行**：同一条 SOS 报位可进入两个群，展示被复制，发送设备的报位消耗不应重复。
6. **激活状态受外部异步推送支配**：天通推送缺失时默认“正常”会把集成故障伪装成健康状态。

## Suggested Questions

1. 无“我的”设备在 SOS 场景耗尽资源时，消息会经过哪些路由、计费和封禁节点？
2. 设备从企业转为个人后，短音/报位负账与星豆责任如何变化？
3. 一条 PTT 语音从上行到 N 台终端 ACK，分别在哪些节点扣费和失败？
4. 三种清欠路径分别修改哪一类余额或账单，怎样避免重复核销？
5. 为什么 UI 的“已读”不能解释为用户已查看，应该改成什么状态文案？
6. ICCID 漏填、激活 API 超时、异步推送丢失分别会影响哪个状态维度？
7. v2.1 与 v2.2 的邀请拒绝退款冲突如何被版本优先级解决？

## 版本与冲突说明

- 决议源：`formal/decisions.jsonl`（不再以汇总 md 驱动构图）。
- 清欠三语义尚不能完全合并，相关边保持 `AMBIGUOUS`，不可据此直接生成财务实现。
- 协议划除码不得重新启用；TCP/UDP 的实际部署选择仍需以终端联调和抓包为准。
- 候选晋升：`python scripts/review_promote.py approve <cand_id>`（仅此路径）。
"""
    (OUT / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")

    # Ensure candidate queue files exist but stay empty of auto content.
    for name in ("pending.jsonl", "rejected.jsonl", "unmapped.jsonl"):
        path = CANDIDATES / name
        if not path.exists():
            path.write_text("", encoding="utf-8")

    html_status = export_official_html(graph, OUT / "graph.html")
    print(
        json.dumps(
            {
                "nodes": len(nodes),
                "edges": len(links),
                "formal_nodes": len(formal_nodes),
                "formal_edges": len(formal_edges),
                "decisions": len(decisions),
                "pending": pending_count,
                "legacy_edges": legacy_n,
                "auto_promote": False,
                "html": html_status,
            },
            ensure_ascii=False,
        )
    )


def export_official_html(graph_data: dict, output_path: Path) -> str:
    from collections import defaultdict

    try:
        from networkx.readwrite import json_graph
        from graphify.export import to_html
    except ImportError:
        return "skipped (install graphifyy for official HTML)"

    try:
        G = json_graph.node_link_graph(graph_data, edges="links")
    except TypeError:
        G = json_graph.node_link_graph(graph_data)

    communities: dict[int, list] = defaultdict(list)
    for nid, attrs in G.nodes(data=True):
        cid = attrs.get("community")
        if cid is not None:
            communities[int(cid)].append(nid)

    raw_labels = (graph_data.get("graph") or {}).get("community_labels") or {}
    community_labels = {int(k): v for k, v in raw_labels.items()}
    if "hyperedges" not in G.graph:
        G.graph["hyperedges"] = (
            (graph_data.get("graph") or {}).get("hyperedges")
            or graph_data.get("hyperedges")
            or []
        )

    to_html(G, dict(communities), str(output_path), community_labels=community_labels)
    return "graphify official template"


if __name__ == "__main__":
    main()
