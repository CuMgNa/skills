"""Save one MCP page dump into sources/_mcp_raw/<page_id>.json."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

RAW = Path(__file__).resolve().parents[1] / "sources" / "_mcp_raw"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", required=True)
    ap.add_argument("--markdown-file", type=Path)
    ap.add_argument("--error")
    ap.add_argument("--truncated", action="store_true")
    args = ap.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    if args.error:
        payload = {"id": args.id, "markdown": "", "error": args.error}
    else:
        md = ""
        if args.markdown_file:
            md = args.markdown_file.read_text(encoding="utf-8")
        payload = {"id": args.id, "markdown": md, "truncated": bool(args.truncated)}
    out = RAW / f"{args.id}.json"
    out.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out), "bytes": out.stat().st_size}, ensure_ascii=False))


if __name__ == "__main__":
    main()
