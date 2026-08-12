"""
ADR-001 pipeline entrypoint.

  sync → apply stale/orphan → extract candidates → build_graph

Never auto-promotes pending into formal.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent


def run(cmd: list[str]) -> dict:
    print("+", " ".join(cmd), flush=True)
    proc = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True, encoding="utf-8")
    if proc.stdout.strip():
        print(proc.stdout.strip(), flush=True)
    if proc.returncode != 0:
        print(proc.stderr, file=sys.stderr)
        raise SystemExit(proc.returncode)
    try:
        return json.loads(proc.stdout.strip().splitlines()[-1])
    except Exception:
        return {"raw": proc.stdout}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run ADR-001 Notion→graph pipeline")
    parser.add_argument("--sync-mode", choices=["api", "import", "rehash"], default="rehash")
    parser.add_argument("--import-dir", default=str(ROOT / "sources" / "pages"))
    parser.add_argument("--skip-sync", action="store_true")
    parser.add_argument("--skip-extract", action="store_true")
    parser.add_argument("--skip-build", action="store_true")
    parser.add_argument("--extract-all", action="store_true", help="Scan all local pages")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    py = sys.executable
    summary: dict = {"auto_promote": False, "steps": []}

    if not args.skip_sync:
        cmd = [py, str(SCRIPTS / "sync_notion_pages.py"), "--mode", args.sync_mode, "--import-dir", args.import_dir]
        if args.limit:
            cmd += ["--limit", str(args.limit)]
        summary["steps"].append({"sync": run(cmd)})

    summary["steps"].append({"stale": run([py, str(SCRIPTS / "apply_stale_orphan.py")])})

    if not args.skip_extract:
        cmd = [py, str(SCRIPTS / "extract_candidates.py")]
        if args.extract_all:
            cmd.append("--all-pages")
        summary["steps"].append({"extract": run(cmd)})

    if not args.skip_build:
        summary["steps"].append({"build": run([py, str(ROOT / "build_graph.py")])})

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
