"""
Sync Notion pages into sources/pages/ and refresh coverage.json hashes.

Modes:
  --mode api      Use NOTION_TOKEN / NOTION_API_KEY (block children → markdown)
  --mode import   Read pre-fetched {page_id}.md from --import-dir (MCP agent dump)
  --mode rehash   Only recompute hashes from existing sources/pages

Never writes formal/ or promotes candidates (ADR-001).
"""
from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from common import (
    COVERAGE_PATH,
    LAST_DIFF_PATH,
    PAGES_DIR,
    load_json,
    normalize_page_id,
    now_iso,
    page_path,
    parse_anchors,
    save_json,
    sha256_text,
)


def notion_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }


def rich_text_to_plain(rich: list) -> str:
    parts = []
    for r in rich or []:
        parts.append(r.get("plain_text") or (r.get("text") or {}).get("content") or "")
    return "".join(parts)


def blocks_to_markdown(blocks: list) -> str:
    lines: list[str] = []
    for b in blocks:
        t = b.get("type")
        data = b.get(t) or {}
        if t == "paragraph":
            lines.append(rich_text_to_plain(data.get("rich_text")))
        elif t in ("heading_1", "heading_2", "heading_3"):
            level = int(t[-1])
            lines.append("#" * level + " " + rich_text_to_plain(data.get("rich_text")))
        elif t in ("bulleted_list_item", "numbered_list_item"):
            lines.append("- " + rich_text_to_plain(data.get("rich_text")))
        elif t == "to_do":
            mark = "x" if data.get("checked") else " "
            lines.append(f"- [{mark}] " + rich_text_to_plain(data.get("rich_text")))
        elif t == "quote":
            lines.append("> " + rich_text_to_plain(data.get("rich_text")))
        elif t == "code":
            lang = data.get("language") or ""
            lines.append(f"```{lang}")
            lines.append(rich_text_to_plain(data.get("rich_text")))
            lines.append("```")
        elif t == "divider":
            lines.append("---")
        else:
            # Keep unknown types discoverable without failing sync.
            text = rich_text_to_plain(data.get("rich_text") or [])
            if text:
                lines.append(text)
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def fetch_block_children(token: str, block_id: str) -> list:
    results = []
    cursor = None
    while True:
        url = f"https://api.notion.com/v1/blocks/{block_id}/children?page_size=100"
        if cursor:
            url += f"&start_cursor={cursor}"
        req = urllib.request.Request(url, headers=notion_headers(token))
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        results.extend(payload.get("results") or [])
        if not payload.get("has_more"):
            break
        cursor = payload.get("next_cursor")
        time.sleep(0.35)
    return results


def fetch_page_markdown_api(token: str, page_id: str) -> tuple[str, bool, list]:
    blocks = fetch_block_children(token, page_id)
    md = blocks_to_markdown(blocks)
    return md, False, []


def write_page_file(page_id: str, title: str, markdown: str) -> dict:
    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    body = markdown if markdown.endswith("\n") else markdown + "\n"
    # Front matter keeps machine fields out of content hash body optionally —
    # we hash the whole file including title header for stability.
    content = f"# {title}\n\n<!-- notion_page_id: {page_id} -->\n\n{body}"
    path = page_path(page_id)
    path.write_text(content, encoding="utf-8")
    anchors = parse_anchors(content)
    return {
        "content_sha256": sha256_text(content),
        "anchors": [
            {"anchor": a["anchor"], "content_sha256": a["content_sha256"], "title": a["title"]}
            for a in anchors
        ],
        "path": str(path.relative_to(path.parents[2])),
    }


def sync_from_api(coverage: dict, token: str, limit: int | None) -> dict:
    pages = coverage["pages"]
    if limit:
        pages = pages[:limit]
    changed, unchanged, failed, initialized = [], [], [], []
    for p in pages:
        pid = normalize_page_id(p["id"])
        try:
            md, truncated, unknown = fetch_page_markdown_api(token, pid)
            meta = write_page_file(pid, p.get("title") or pid, md)
            old = p.get("content_sha256")
            p["id"] = pid
            p["truncated"] = truncated
            p["unknown_block_ids"] = unknown
            p["content_sha256"] = meta["content_sha256"]
            p["anchors"] = meta["anchors"]
            p["local_path"] = meta["path"]
            p["last_synced_at"] = now_iso()
            if old and old != meta["content_sha256"]:
                changed.append(pid)
            elif not old:
                initialized.append(pid)
            else:
                unchanged.append(pid)
        except Exception as exc:  # noqa: BLE001 — collect per-page failures
            failed.append({"id": pid, "error": str(exc)})
            time.sleep(0.2)
    return {
        "changed": changed,
        "initialized": initialized,
        "unchanged": unchanged,
        "failed": failed,
        "new": [],
        "deleted": [],
    }


def sync_from_import(coverage: dict, import_dir: Path) -> dict:
    """Import MCP/agent dumps: each file named <page_id>.md or dump.jsonl lines."""
    changed, unchanged, new_ids, initialized = [], [], [], []
    seen = set()
    by_id = {normalize_page_id(p["id"]): p for p in coverage["pages"]}

    md_files = list(import_dir.glob("*.md"))
    for path in md_files:
        pid = normalize_page_id(path.stem)
        text = path.read_text(encoding="utf-8")
        title = by_id.get(pid, {}).get("title") or pid
        # If dump already has H1, use as-is; else wrap.
        if text.lstrip().startswith("#"):
            content = text if text.endswith("\n") else text + "\n"
            page_path(pid).parent.mkdir(parents=True, exist_ok=True)
            page_path(pid).write_text(content, encoding="utf-8")
            anchors = parse_anchors(content)
            meta = {
                "content_sha256": sha256_text(content),
                "anchors": [
                    {
                        "anchor": a["anchor"],
                        "content_sha256": a["content_sha256"],
                        "title": a["title"],
                    }
                    for a in anchors
                ],
                "path": f"sources/pages/{pid}.md",
            }
        else:
            meta = write_page_file(pid, title, text)

        seen.add(pid)
        if pid not in by_id:
            rec = {
                "id": pid,
                "title": title,
                "truncated": False,
                "unknown_block_ids": [],
                "included_in_graph": True,
            }
            coverage["pages"].append(rec)
            by_id[pid] = rec
            new_ids.append(pid)

        p = by_id[pid]
        old = p.get("content_sha256")
        p["content_sha256"] = meta["content_sha256"]
        p["anchors"] = meta["anchors"]
        p["local_path"] = meta["path"]
        p["last_synced_at"] = now_iso()
        if old and old != meta["content_sha256"]:
            changed.append(pid)
        elif not old:
            initialized.append(pid)
        else:
            unchanged.append(pid)

    deleted = []
    missing_local = []
    for pid, rec in by_id.items():
        if pid in seen:
            continue
        had = bool(rec.get("content_sha256") or rec.get("local_path"))
        exists = page_path(pid).exists()
        if had and not exists:
            missing_local.append(pid)
            deleted.append(pid)
        # never-synced pages are not orphaned on partial import
    return {
        "changed": changed,
        "initialized": initialized,
        "unchanged": unchanged,
        "new": new_ids,
        "deleted": deleted,
        "missing_local": missing_local,
        "failed": [],
    }


def sync_rehash(coverage: dict) -> dict:
    changed, unchanged, missing, initialized = [], [], [], []
    for p in coverage["pages"]:
        pid = normalize_page_id(p["id"])
        p["id"] = pid
        path = page_path(pid)
        if not path.exists():
            # Only treat as missing if we previously synced this page.
            if p.get("content_sha256") or p.get("local_path"):
                missing.append(pid)
            continue
        content = path.read_text(encoding="utf-8")
        digest = sha256_text(content)
        anchors = parse_anchors(content)
        old = p.get("content_sha256")
        p["content_sha256"] = digest
        p["anchors"] = [
            {"anchor": a["anchor"], "content_sha256": a["content_sha256"], "title": a["title"]}
            for a in anchors
        ]
        p["local_path"] = f"sources/pages/{pid}.md"
        if old and old != digest:
            changed.append(pid)
        elif not old:
            initialized.append(pid)
        else:
            unchanged.append(pid)
    return {
        "changed": changed,
        "initialized": initialized,
        "unchanged": unchanged,
        "new": [],
        "deleted": [],
        "missing_local": missing,
        "failed": [],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync Notion pages (ADR-001)")
    parser.add_argument("--mode", choices=["api", "import", "rehash"], default="rehash")
    parser.add_argument("--import-dir", type=Path, default=PAGES_DIR)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--token", default=os.environ.get("NOTION_TOKEN") or os.environ.get("NOTION_API_KEY"))
    args = parser.parse_args()

    coverage = load_json(COVERAGE_PATH)
    if args.mode == "api":
        if not args.token:
            raise SystemExit("api 模式需要 NOTION_TOKEN / NOTION_API_KEY，或改用 --mode import / rehash")
        diff = sync_from_api(coverage, args.token, args.limit)
    elif args.mode == "import":
        diff = sync_from_import(coverage, args.import_dir)
    else:
        diff = sync_rehash(coverage)

    coverage["generated_at"] = now_iso()[:10]
    coverage["audit"]["source_pages"] = len(coverage["pages"])
    coverage["audit"]["truncated_pages"] = sum(1 for p in coverage["pages"] if p.get("truncated"))
    coverage["audit"]["pages_with_unknown_blocks"] = sum(
        1 for p in coverage["pages"] if p.get("unknown_block_ids")
    )
    coverage["last_sync"] = {"at": now_iso(), "mode": args.mode, **{k: v for k, v in diff.items() if k != "failed"}}
    if diff.get("failed"):
        coverage["last_sync"]["failed_count"] = len(diff["failed"])

    save_json(COVERAGE_PATH, coverage)
    save_json(
        LAST_DIFF_PATH,
        {
            "at": now_iso(),
            "mode": args.mode,
            "changed_page_ids": diff.get("changed", []),
            "initialized_page_ids": diff.get("initialized", []),
            "new_page_ids": diff.get("new", []),
            "deleted_page_ids": diff.get("deleted", []),
            "missing_local": diff.get("missing_local", []),
            "failed": diff.get("failed", []),
            "unchanged_count": len(diff.get("unchanged", [])),
        },
    )
    print(json.dumps({"ok": True, **{k: (len(v) if isinstance(v, list) else v) for k, v in diff.items()}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
