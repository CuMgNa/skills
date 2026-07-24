"""
Apply coverage diff onto formal edges/nodes/decisions.

ADR-001:
  - page content change → anchor-level stale; legacy (no anchor) → page-level stale
  - page missing/removed → orphan (do not auto-delete)
  - never auto-promote
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from common import (
    COVERAGE_PATH,
    FORMAL,
    LAST_DIFF_PATH,
    load_json,
    load_jsonl,
    now_iso,
    page_path,
    save_json,
    write_jsonl,
)


def index_page_anchors(coverage: dict) -> dict[str, dict[str, str]]:
    """page_id -> {anchor -> content_sha256}"""
    out: dict[str, dict[str, str]] = {}
    for p in coverage["pages"]:
        out[p["id"]] = {
            a["anchor"]: a["content_sha256"] for a in (p.get("anchors") or [])
        }
    return out


def apply_to_rows(
    rows: list[dict],
    *,
    changed: set[str],
    missing: set[str],
    deleted: set[str],
    anchor_map: dict[str, dict[str, str]],
    page_field: str = "source_page_id",
) -> dict:
    stale_n = orphan_n = 0
    for row in rows:
        if row.get("status") == "archived":
            continue
        pid = row.get(page_field)
        pages = row.get("source_pages") if page_field == "source_pages" else None

        # decisions may cite multiple pages
        if isinstance(pages, list):
            page_ids = pages
        elif pid:
            page_ids = [pid]
        else:
            continue

        if any(p in deleted or p in missing for p in page_ids):
            if not row.get("orphan"):
                row["orphan"] = True
                row["orphan_at"] = now_iso()
                row["orphan_reason"] = "source page missing or removed from sync"
                orphan_n += 1
            continue

        if not any(p in changed for p in page_ids):
            continue

        anchor = row.get("source_anchor")
        legacy = bool(row.get("legacy")) or not anchor

        if legacy:
            row["stale"] = True
            row["stale_at"] = now_iso()
            row["stale_reason"] = "legacy/no-anchor; page content changed"
            stale_n += 1
            continue

        # Anchor-level: stale only if that anchor hash changed or anchor disappeared
        touched = False
        for p in page_ids:
            if p not in changed:
                continue
            current = anchor_map.get(p, {})
            prev_hash = row.get("source_anchor_sha256")
            cur_hash = current.get(anchor)
            if cur_hash is None:
                row["stale"] = True
                row["stale_at"] = now_iso()
                row["stale_reason"] = f"anchor missing after page change: {anchor}"
                stale_n += 1
                touched = True
                break
            if prev_hash and prev_hash != cur_hash:
                row["stale"] = True
                row["stale_at"] = now_iso()
                row["stale_reason"] = f"anchor content changed: {anchor}"
                stale_n += 1
                touched = True
                break
            if not prev_hash:
                # First time seeing anchor hash after change — treat as needing confirm
                row["stale"] = True
                row["stale_at"] = now_iso()
                row["stale_reason"] = f"anchor present but no baseline hash; page changed: {anchor}"
                stale_n += 1
                touched = True
                break
        if not touched:
            # Page changed but this edge's anchor section unchanged → keep formal
            row.setdefault("last_checked_at", now_iso())

    return {"stale_marked": stale_n, "orphan_marked": orphan_n}


def main() -> None:
    parser = argparse.ArgumentParser(description="Mark stale/orphan on formal records")
    parser.add_argument("--diff", type=Path, default=LAST_DIFF_PATH)
    args = parser.parse_args()

    coverage = load_json(COVERAGE_PATH)
    if args.diff.exists():
        diff = load_json(args.diff)
    else:
        # Fallback: any page without local file is missing; no changed set
        diff = {
            "changed_page_ids": [],
            "deleted_page_ids": [],
            "missing_local": [
                p["id"] for p in coverage["pages"] if not page_path(p["id"]).exists()
            ],
        }

    changed = set(diff.get("changed_page_ids") or [])
    deleted = set(diff.get("deleted_page_ids") or [])
    missing = set(diff.get("missing_local") or [])
    anchor_map = index_page_anchors(coverage)

    edges = load_jsonl(FORMAL / "edges.jsonl")
    nodes = load_jsonl(FORMAL / "nodes.jsonl")
    decisions = load_jsonl(FORMAL / "decisions.jsonl")

    stats = {
        "edges": apply_to_rows(edges, changed=changed, missing=missing, deleted=deleted, anchor_map=anchor_map),
        "nodes": apply_to_rows(nodes, changed=changed, missing=missing, deleted=deleted, anchor_map=anchor_map),
        "decisions": apply_to_rows(
            decisions,
            changed=changed,
            missing=missing,
            deleted=deleted,
            anchor_map=anchor_map,
            page_field="source_pages",
        ),
    }

    write_jsonl(FORMAL / "edges.jsonl", edges)
    write_jsonl(FORMAL / "nodes.jsonl", nodes)
    write_jsonl(FORMAL / "decisions.jsonl", decisions)

    report = {
        "at": now_iso(),
        "changed_pages": len(changed),
        "missing_or_deleted": len(missing | deleted),
        **stats,
    }
    save_json(Path(args.diff).parent / "last_stale_report.json", report)
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
