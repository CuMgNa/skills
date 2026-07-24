"""
Extract candidate edges from changed pages.

Two-phase (ADR Q12=C):
  1) raw co-occurrence / keyword relations from markdown anchors
  2) project endpoints onto formal ontology (+ aliases)
     - mapped → candidates/pending.jsonl (never formal)
     - unmapped → candidates/unmapped.jsonl

Conflict with decisions → pending with conflicts_decision_id (ADR Q14=B).
Never auto-promotes.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from common import (
    CANDIDATES,
    COVERAGE_PATH,
    FORMAL,
    LAST_DIFF_PATH,
    load_json,
    load_jsonl,
    now_iso,
    page_path,
    parse_anchors,
    write_jsonl,
)

RELATION_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("transitions_to", re.compile(r"(转为|变为|进入|切换到|transitions?\s+to)")),
    ("blocks", re.compile(r"(禁止|不可|不能|阻止|封禁|停发)")),
    ("requires", re.compile(r"(必须|需要|依赖|先.*后)")),
    ("refunds", re.compile(r"(退还|退款|原路退)")),
    ("consumes", re.compile(r"(消耗|扣减|扣费|计费)")),
    ("notifies", re.compile(r"(通知|短信|邮件|电话)")),
    ("conflicts_around", re.compile(r"(冲突|不一致|矛盾|另一)")),
]


def build_ontology() -> tuple[dict[str, str], dict[str, dict]]:
    """label/alias(lower) -> node_id ; id -> node"""
    nodes = {n["id"]: n for n in load_jsonl(FORMAL / "nodes.jsonl") if n.get("status") != "archived"}
    label_to_id: dict[str, str] = {}
    for n in nodes.values():
        label_to_id[n["label"].strip().lower()] = n["id"]
        label_to_id[n["id"].lower()] = n["id"]
    for row in load_jsonl(FORMAL / "aliases.jsonl"):
        nid = row.get("id")
        if nid in nodes:
            for a in row.get("aliases") or []:
                label_to_id[str(a).strip().lower()] = nid
    # longer labels first for scanning
    return label_to_id, nodes


def find_labels_in_text(text: str, label_to_id: dict[str, str]) -> list[str]:
    found = []
    lower = text.lower()
    # Sort by label length desc to prefer longer matches
    for label, nid in sorted(label_to_id.items(), key=lambda x: -len(x[0])):
        if len(label) < 2:
            continue
        if label in lower and nid not in found:
            found.append(nid)
    return found


def detect_relation(text: str) -> str:
    for name, pat in RELATION_PATTERNS:
        if pat.search(text):
            return name
    return "related_to"


def formal_edge_keys() -> set[tuple[str, str, str]]:
    return {
        (e["source"], e["target"], e["relation"])
        for e in load_jsonl(FORMAL / "edges.jsonl")
        if e.get("status") != "archived"
    }


def rejected_keys() -> set[tuple[str, str, str]]:
    return {
        (e["source"], e["target"], e.get("relation", "related_to"))
        for e in load_jsonl(CANDIDATES / "rejected.jsonl")
    }


def pending_keys(rows: list[dict]) -> set[tuple[str, str, str]]:
    return {(e["source"], e["target"], e.get("relation", "related_to")) for e in rows}


def decision_conflicts(source: str, target: str, relation: str, evidence: str) -> list[str]:
    hits = []
    evidence_l = evidence.lower()
    for d in load_jsonl(FORMAL / "decisions.jsonl"):
        if not d.get("adopted"):
            continue
        rejects = [str(x).lower() for x in (d.get("rejects") or [])]
        adopts = [str(x).lower() for x in (d.get("adopts") or [])]
        # If evidence echoes a rejected policy while an adopt exists → conflict signal
        if rejects and any(r and r in evidence_l for r in rejects):
            if not adopts or not any(a and a in evidence_l for a in adopts):
                hits.append(d["id"])
        # invite refund special-case: relation refunds contradicts rejects
        if d["id"] == "dec:invite-reject-refund" and relation == "refunds":
            if any("不退" in r for r in rejects) and "退还" in evidence:
                pass  # consistent with adopt
            elif any("不退" in evidence_l for _ in [0]):
                hits.append(d["id"])
        # clear-debt open conflict stays informational when conflicts_around
        if d["id"] == "dec:clear-debt-triad" and relation == "conflicts_around":
            if source == "risk_clear_debt" or "清欠" in evidence:
                hits.append(d["id"])
    return sorted(set(hits))


def extract_from_page(page_id: str, title: str, label_to_id: dict[str, str]) -> tuple[list[dict], list[dict]]:
    path = page_path(page_id)
    if not path.exists():
        return [], []
    content = path.read_text(encoding="utf-8")
    pending: list[dict] = []
    unmapped: list[dict] = []
    for anchor in parse_anchors(content):
        text = anchor["text"]
        if len(text) < 8:
            continue
        # Scan paragraphs
        for para in re.split(r"\n+", text):
            para = para.strip()
            if len(para) < 8:
                continue
            ids = find_labels_in_text(para, label_to_id)
            # Also capture unknown CJK terms of interest? skip — go unmapped via raw pair of strings
            if len(ids) >= 2:
                rel = detect_relation(para)
                for i in range(len(ids) - 1):
                    src, tgt = ids[i], ids[i + 1]
                    if src == tgt:
                        continue
                    cand = {
                        "id": f"cand:{page_id[:8]}:{anchor['anchor']}:{src}:{tgt}:{rel}",
                        "source": src,
                        "target": tgt,
                        "relation": rel,
                        "evidence": para[:300],
                        "confidence": "INFERRED",
                        "confidence_score": 0.55,
                        "source_page_id": page_id,
                        "source_page_title": title,
                        "source_section": anchor["title"],
                        "source_anchor": anchor["anchor"],
                        "source_anchor_sha256": anchor["content_sha256"],
                        "status": "pending",
                        "needs_new_nodes": [],
                        "extracted_at": now_iso(),
                        "phase": "projected",
                    }
                    pending.append(cand)
            else:
                # Phase-1 raw: if relation keyword but <2 ontology hits → unmapped
                if detect_relation(para) != "related_to" or len(ids) == 1:
                    # keep only denser signals
                    if detect_relation(para) == "related_to" and len(ids) < 1:
                        continue
                    unmapped.append(
                        {
                            "id": f"raw:{page_id[:8]}:{sha_short(para)}",
                            "raw_text": para[:300],
                            "matched_node_ids": ids,
                            "source_page_id": page_id,
                            "source_anchor": anchor["anchor"],
                            "reason": "endpoint_projection_failed",
                            "extracted_at": now_iso(),
                            "phase": "raw",
                        }
                    )
    return pending, unmapped


def sha_short(text: str) -> str:
    import hashlib

    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:10]


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract candidates from changed pages")
    parser.add_argument("--diff", type=Path, default=LAST_DIFF_PATH)
    parser.add_argument(
        "--pages",
        nargs="*",
        default=None,
        help="Explicit page ids; default = last_diff.changed_page_ids",
    )
    parser.add_argument("--all-pages", action="store_true", help="Scan all local pages (bootstrap)")
    args = parser.parse_args()

    coverage = load_json(COVERAGE_PATH)
    titles = {p["id"]: p.get("title") for p in coverage["pages"]}
    label_to_id, _nodes = build_ontology()

    if args.all_pages:
        page_ids = [p["id"] for p in coverage["pages"] if page_path(p["id"]).exists()]
    elif args.pages:
        page_ids = args.pages
    elif args.diff.exists():
        page_ids = load_json(args.diff).get("changed_page_ids") or []
    else:
        page_ids = []

    if not page_ids:
        print(json.dumps({"ok": True, "pending_added": 0, "unmapped_added": 0, "note": "no changed pages"}, ensure_ascii=False))
        return

    existing_pending = load_jsonl(CANDIDATES / "pending.jsonl")
    existing_unmapped = load_jsonl(CANDIDATES / "unmapped.jsonl")
    keys = formal_edge_keys() | rejected_keys() | pending_keys(existing_pending)
    pending_ids = {r["id"] for r in existing_pending}
    unmapped_ids = {r["id"] for r in existing_unmapped}

    added_p = added_u = 0
    for pid in page_ids:
        pend, unmap = extract_from_page(pid, titles.get(pid) or pid, label_to_id)
        for c in pend:
            key = (c["source"], c["target"], c["relation"])
            if key in keys or c["id"] in pending_ids:
                continue
            conflicts = decision_conflicts(c["source"], c["target"], c["relation"], c["evidence"])
            if conflicts:
                c["conflicts_decision_id"] = conflicts
                c["review_priority"] = 0  # top
            else:
                c["review_priority"] = 10
            existing_pending.append(c)
            pending_ids.add(c["id"])
            keys.add(key)
            added_p += 1
        for u in unmap:
            if u["id"] in unmapped_ids:
                continue
            existing_unmapped.append(u)
            unmapped_ids.add(u["id"])
            added_u += 1

    # Conflict candidates first
    existing_pending.sort(key=lambda r: (r.get("review_priority", 10), r.get("id", "")))
    write_jsonl(CANDIDATES / "pending.jsonl", existing_pending)
    write_jsonl(CANDIDATES / "unmapped.jsonl", existing_unmapped)
    # Ensure rejected exists
    if not (CANDIDATES / "rejected.jsonl").exists():
        write_jsonl(CANDIDATES / "rejected.jsonl", [])

    print(
        json.dumps(
            {
                "ok": True,
                "scanned_pages": len(page_ids),
                "pending_added": added_p,
                "unmapped_added": added_u,
                "pending_total": len(existing_pending),
                "unmapped_total": len(existing_unmapped),
                "auto_promote": False,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
