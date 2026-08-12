"""Shared helpers for ADR-001 controlled-projection pipeline."""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORMAL = ROOT / "formal"
CANDIDATES = ROOT / "candidates"
PAGES_DIR = ROOT / "sources" / "pages"
COVERAGE_PATH = ROOT / "coverage.json"
LAST_DIFF_PATH = ROOT / "graphify-out" / "last_diff.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def page_path(page_id: str) -> Path:
    return PAGES_DIR / f"{page_id}.md"


HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.M)


def parse_anchors(markdown: str) -> list[dict]:
    """Split markdown into heading anchors with content hashes (ADR Q10=B)."""
    matches = list(HEADING_RE.finditer(markdown))
    if not matches:
        body = markdown.strip()
        return [
            {
                "anchor": "page_body",
                "level": 0,
                "title": "(page)",
                "content_sha256": sha256_text(body),
                "text": body,
            }
        ]

    anchors = []
    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(markdown)
        title = m.group(2).strip()
        level = len(m.group(1))
        chunk = markdown[start:end].strip()
        anchors.append(
            {
                "anchor": f"h{level}:{title}",
                "level": level,
                "title": title,
                "content_sha256": sha256_text(chunk),
                "text": chunk,
            }
        )
    return anchors


def normalize_page_id(page_id: str) -> str:
    raw = page_id.replace("-", "").lower()
    if len(raw) != 32:
        return page_id
    return f"{raw[0:8]}-{raw[8:12]}-{raw[12:16]}-{raw[16:20]}-{raw[20:32]}"
