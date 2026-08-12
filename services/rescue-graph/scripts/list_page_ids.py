"""Batch-fetch Notion pages via MCP markdown API and write to sources/pages/."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import COVERAGE_PATH, load_json  # noqa: E402


def main() -> None:
    data = load_json(COVERAGE_PATH)
    pages = data["pages"]
    print(json.dumps({"total": len(pages), "ids": [p["id"] for p in pages]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
