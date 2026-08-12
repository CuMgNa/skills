"""Fetch all coverage pages via Notion page-markdown API (same as MCP tool) into _mcp_raw/."""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import COVERAGE_PATH, load_json, normalize_page_id  # noqa: E402

RAW = ROOT / "sources" / "_mcp_raw"
NOTION_VERSION = "2022-06-28"


def fetch_markdown(token: str, page_id: str) -> dict:
    url = f"https://api.notion.com/v1/pages/{page_id}/markdown"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        return {
            "id": normalize_page_id(payload.get("id") or page_id),
            "markdown": payload.get("markdown") or "",
            "truncated": bool(payload.get("truncated", False)),
        }
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        msg = f"HTTP {e.code}: {body[:500]}"
        return {"id": page_id, "markdown": "", "error": msg}
    except Exception as e:  # noqa: BLE001
        return {"id": page_id, "markdown": "", "error": str(e)}


def main() -> None:
    token = (
        os.environ.get("NOTION_TOKEN")
        or os.environ.get("NOTION_API_KEY")
        or ""
    ).strip()
    if not token:
        # Fallback: OPENAPI_MCP_HEADERS style used by notion-mcp-server
        headers_raw = os.environ.get("OPENAPI_MCP_HEADERS") or ""
        if headers_raw:
            try:
                hdrs = json.loads(headers_raw)
                auth = hdrs.get("Authorization") or ""
                if auth.lower().startswith("bearer "):
                    token = auth.split(" ", 1)[1].strip()
            except json.JSONDecodeError:
                pass
    if not token:
        raise SystemExit("Need NOTION_TOKEN / NOTION_API_KEY / OPENAPI_MCP_HEADERS")

    RAW.mkdir(parents=True, exist_ok=True)
    pages = load_json(COVERAGE_PATH)["pages"]
    results = {"ok": [], "failed": [], "total": len(pages)}
    for i, page in enumerate(pages, 1):
        pid = normalize_page_id(page["id"])
        out = RAW / f"{pid}.json"
        print(f"[{i}/{len(pages)}] fetching {pid} {page.get('title','')}", flush=True)
        payload = fetch_markdown(token, pid)
        out.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        if payload.get("error"):
            results["failed"].append({"id": pid, "error": payload["error"]})
            print(f"  ERROR -> {payload['error'][:120]}", flush=True)
        else:
            results["ok"].append(pid)
            print(f"  wrote {out.name} bytes={out.stat().st_size}", flush=True)
        time.sleep(0.35)
    summary_path = RAW / "_fetch_summary.json"
    summary_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"raw_count": len(list(RAW.glob('*.json'))) - 1, **{k: len(v) if isinstance(v, list) else v for k, v in results.items()}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
