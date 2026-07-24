"""Explicit promote/reject/confirm/archive only. Never auto-merge candidates into formal."""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORMAL_EDGES = ROOT / "formal" / "edges.jsonl"
FORMAL_NODES = ROOT / "formal" / "nodes.jsonl"
FORMAL_DECISIONS = ROOT / "formal" / "decisions.jsonl"
PENDING = ROOT / "candidates" / "pending.jsonl"
REJECTED = ROOT / "candidates" / "rejected.jsonl"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows),
        encoding="utf-8",
    )


def find_pending(cand_id: str) -> tuple[dict, list[dict]]:
    rows = load_jsonl(PENDING)
    for i, row in enumerate(rows):
        if row.get("id") == cand_id:
            return row, rows[:i] + rows[i + 1 :]
    raise SystemExit(f"pending 中未找到候选: {cand_id}")


def cmd_approve(cand_id: str) -> None:
    cand, rest = find_pending(cand_id)
    if cand.get("needs_new_nodes"):
        raise SystemExit("候选含未批准新节点，请先批准节点或改映射后再 approve")
    if not cand.get("source_page_id"):
        raise SystemExit("缺少 source_page_id，拒绝晋升")
    if not cand.get("source_anchor"):
        raise SystemExit("新边必须带 source_anchor（ADR-001）；拒绝无锚点晋升")

    formal = load_jsonl(FORMAL_EDGES)
    edge = {
        "id": cand.get("formal_id") or f"edge:{len(formal) + 1:04d}",
        "source": cand["source"],
        "target": cand["target"],
        "relation": cand["relation"],
        "evidence": cand["evidence"],
        "confidence": cand.get("confidence", "EXTRACTED"),
        "confidence_score": cand.get("confidence_score", 0.9),
        "source_page_id": cand["source_page_id"],
        "source_page_title": cand.get("source_page_title"),
        "source_section": cand.get("source_section"),
        "source_anchor": cand["source_anchor"],
        "source_anchor_sha256": cand.get("source_anchor_sha256"),
        "legacy": False,
        "stale": False,
        "orphan": False,
        "status": "formal",
        "promoted_from": cand["id"],
        "promoted_at": now(),
    }
    formal.append(edge)
    write_jsonl(FORMAL_EDGES, formal)
    write_jsonl(PENDING, rest)
    print(json.dumps({"approved": edge["id"], "from": cand_id}, ensure_ascii=False))
    print("请运行: python build_graph.py", file=sys.stderr)


def cmd_reject(cand_id: str, reason: str) -> None:
    cand, rest = find_pending(cand_id)
    cand["status"] = "rejected"
    cand["reject_reason"] = reason
    cand["rejected_at"] = now()
    rejected = load_jsonl(REJECTED)
    rejected.append(cand)
    write_jsonl(REJECTED, rejected)
    write_jsonl(PENDING, rest)
    print(json.dumps({"rejected": cand_id, "reason": reason}, ensure_ascii=False))


def _touch_formal(kind: str, record_id: str, mutator) -> None:
    path = {"edge": FORMAL_EDGES, "node": FORMAL_NODES, "decision": FORMAL_DECISIONS}[kind]
    rows = load_jsonl(path)
    key = "id"
    for row in rows:
        if row.get(key) == record_id:
            mutator(row)
            write_jsonl(path, rows)
            print(json.dumps({"ok": True, "kind": kind, "id": record_id}, ensure_ascii=False))
            return
    raise SystemExit(f"未找到 {kind}: {record_id}")


def cmd_confirm(kind: str, record_id: str) -> None:
    """Clear stale after human verifies edge still valid post Notion change."""

    def mut(row: dict) -> None:
        row["stale"] = False
        row.pop("stale_reason", None)
        row["confirmed_at"] = now()

    _touch_formal(kind, record_id, mut)


def cmd_archive(kind: str, record_id: str, reason: str) -> None:
    def mut(row: dict) -> None:
        row["status"] = "archived"
        row["archived_at"] = now()
        row["archive_reason"] = reason

    _touch_formal(kind, record_id, mut)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="人工晋升/拒绝/确认/归档。禁止自动合并（ADR-001）。"
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    ap = sub.add_parser("approve", help="pending → formal/edges.jsonl")
    ap.add_argument("cand_id")

    rj = sub.add_parser("reject", help="pending → rejected")
    rj.add_argument("cand_id")
    rj.add_argument("--reason", required=True)

    cf = sub.add_parser("confirm", help="清除 formal 记录的 stale 标记")
    cf.add_argument("kind", choices=["edge", "node", "decision"])
    cf.add_argument("record_id")

    ar = sub.add_parser("archive", help="归档 orphan/废止 formal 记录（不自动删除）")
    ar.add_argument("kind", choices=["edge", "node", "decision"])
    ar.add_argument("record_id")
    ar.add_argument("--reason", required=True)

    args = parser.parse_args()
    if args.cmd == "approve":
        cmd_approve(args.cand_id)
    elif args.cmd == "reject":
        cmd_reject(args.cand_id, args.reason)
    elif args.cmd == "confirm":
        cmd_confirm(args.kind, args.record_id)
    else:
        cmd_archive(args.kind, args.record_id, args.reason)


if __name__ == "__main__":
    main()
