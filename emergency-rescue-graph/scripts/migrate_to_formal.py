"""One-shot: export legacy snapshot into formal/*.jsonl (ADR-001 Q13=A)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _legacy_snapshot import CONCEPTS, RELATIONS  # noqa: E402

FORMAL = ROOT / "formal"
FORMAL.mkdir(exist_ok=True)


def main() -> None:
    coverage = json.loads((ROOT / "coverage.json").read_text(encoding="utf-8"))
    pages = {p["id"]: p for p in coverage["pages"]}

    with (FORMAL / "nodes.jsonl").open("w", encoding="utf-8") as f:
        for node_id, label, domain, description, page_id in CONCEPTS:
            f.write(
                json.dumps(
                    {
                        "id": node_id,
                        "label": label,
                        "domain": domain,
                        "description": description,
                        "kind": "concept",
                        "source_page_id": page_id,
                        "source_anchor": None,
                        "legacy": True,
                        "stale": False,
                        "orphan": False,
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )

    with (FORMAL / "edges.jsonl").open("w", encoding="utf-8") as f:
        for i, r in enumerate(RELATIONS, 1):
            source, target, relation, evidence, page_id, section = r[:6]
            confidence = r[6] if len(r) > 6 else "EXTRACTED"
            score = r[7] if len(r) > 7 else 0.95
            f.write(
                json.dumps(
                    {
                        "id": f"edge:{i:04d}",
                        "source": source,
                        "target": target,
                        "relation": relation,
                        "evidence": evidence,
                        "confidence": confidence,
                        "confidence_score": score,
                        "source_page_id": page_id,
                        "source_page_title": pages.get(page_id, {}).get("title"),
                        "source_section": section,
                        "source_anchor": None,
                        "legacy": True,
                        "stale": False,
                        "orphan": False,
                        "status": "formal",
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )

    print(
        json.dumps(
            {"concepts": len(CONCEPTS), "relations": len(RELATIONS), "out": str(FORMAL)},
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
