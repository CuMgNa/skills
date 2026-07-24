"""Flush MCP page dumps: reads sources/_mcp_raw/<page_id>.json -> sources/pages/<page_id>.md"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import COVERAGE_PATH, load_json, normalize_page_id  # noqa: E402
from sync_notion_pages import write_page_file  # noqa: E402

RAW = Path(__file__).resolve().parents[1] / "sources" / "_mcp_raw"


def main() -> None:
    titles = {p["id"]: p["title"] for p in load_json(COVERAGE_PATH)["pages"]}
    RAW.mkdir(parents=True, exist_ok=True)
    written = 0
    errors = []
    for path in sorted(p for p in RAW.glob("*.json") if not p.name.startswith("_")):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            pid = normalize_page_id(payload.get("id") or path.stem)
            title = titles.get(pid) or payload.get("title") or pid
            md = payload.get("markdown") or ""
            if payload.get("error"):
                md = f"<!-- sync_error: {payload['error']} -->\n"
            write_page_file(pid, title, md)
            written += 1
        except Exception as exc:  # noqa: BLE001
            errors.append({"file": path.name, "error": str(exc)})
    print(json.dumps({"written": written, "errors": errors}, ensure_ascii=False))


if __name__ == "__main__":
    main()
