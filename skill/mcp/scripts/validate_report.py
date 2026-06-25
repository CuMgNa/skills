# -*- coding: utf-8 -*-
"""发布前校验闸门（可单独执行）。

用法：
  python mcp/scripts/validate_report.py --bugstats "...bugstats.json" --summary-file "...section1.md"
  python mcp/scripts/validate_report.py --bugstats "...bugstats.json" --summary-file "...section1.md" --report-file "...report.md"
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from publish_report import (  # noqa: E402
    load_bugstats,
    load_section1_md,
    validate_section1_gate,
    validate_report_gate,
)

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bugstats", required=True)
    ap.add_argument("--summary-file")
    ap.add_argument("--report-file")
    args = ap.parse_args()

    bs = load_bugstats(args.bugstats)
    section1_md, src = load_section1_md(args.bugstats, args.summary_file, args.report_file)
    errors = []
    errors.extend(validate_section1_gate(bs, section1_md))
    if args.report_file:
        errors.extend(validate_report_gate(bs, args.report_file))

    if errors:
        print("[validate] 失败 ❌")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    print(f"[validate] 通过 ✅ section1来源={src or 'N/A'}")


if __name__ == "__main__":
    main()
