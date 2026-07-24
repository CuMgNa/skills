"""
Write one Notion MCP dump into sources/pages/.

Usage:
  python scripts/write_mcp_page.py --page-id UUID --title "标题" --markdown-file path.json
  # or stdin JSON: {"id","title","markdown"}
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import normalize_page_id  # noqa: E402
from sync_notion_pages import write_page_file  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--page-id")
    parser.add_argument("--title")
    parser.add_argument("--markdown-file", type=Path)
    parser.add_argument("--json-file", type=Path, help="Full MCP-like JSON with id/markdown/title")
    args = parser.parse_args()

    if args.json_file:
        payload = json.loads(args.json_file.read_text(encoding="utf-8"))
        pid = normalize_page_id(payload.get("id") or payload.get("page_id"))
        title = payload.get("title") or pid
        md = payload.get("markdown") or ""
    else:
        if not args.page_id:
            raise SystemExit("need --page-id or --json-file")
        pid = normalize_page_id(args.page_id)
        title = args.title or pid
        if args.markdown_file:
            raw = args.markdown_file.read_text(encoding="utf-8")
            try:
                obj = json.loads(raw)
                md = obj.get("markdown") if isinstance(obj, dict) else raw
                title = (obj.get("title") if isinstance(obj, dict) else None) or title
            except json.JSONDecodeError:
                md = raw
        else:
            md = sys.stdin.read()

    meta = write_page_file(pid, title, md or "")
    print(json.dumps({"ok": True, "page_id": pid, **meta}, ensure_ascii=False))


if __name__ == "__main__":
    main()
