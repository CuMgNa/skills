# -*- coding: utf-8 -*-
"""统一报告发布入口（v2 标准管线）。

管线：load bugStats → BugSemanticContext → MaterialContext → ReportContext
      → validate（校验闸门）→ 模板渲染（Notion blocks + 钉钉投影）→ 发布。

数据来源：bugStats.json（唯一事实源，所有数字从此读取，禁止硬编码）。
缺陷语义：mcp/output/bug-semantic/*.jsonl（bug-report-and-create 持久化产物，只读消费）。

能力：
  --mode notion / dingtalk / both
  --material-file（可多次） / --material-page-id（可多次） / --material-auto
  --material-engine legacy|context|shadow
  --report-kind smoke|functional|regression|auto
  --locale zh-CN|en-US   --template standard
  --project-config <json>   --dry（只构建不发布）

用法示例：
  python publish_report.py --bugstats <path> --mode notion --notion-parent <pageId> --title "xxx 测试报告"
  python publish_report.py --bugstats <path> --dry --material-file plan.md   # 本地构建，不发布
"""
import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "lib"))
import qa_config              # noqa: E402
import dingtalk_client as dt  # noqa: E402
import notion_client as nc    # noqa: E402
import report_config          # noqa: E402
import material_context as mc  # noqa: E402
import bug_semantic_context as bsc  # noqa: E402
import key_issues as ki       # noqa: E402
import report_context as rc    # noqa: E402
import report_templates        # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

SECTION1_HEADING = re.compile(r"^#{1,3}\s*一[、.．]测试结果\s*$", re.MULTILINE)
NEXT_SECTION_HEADING = re.compile(r"^#{1,3}\s*[二三四五][、.．]", re.MULTILINE)


def load_bugstats(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ── 第一节（测试结论）来源解析（沿用旧逻辑，保证钉钉与文档一致） ──────
def extract_section1(md):
    text = md.strip()
    m1 = SECTION1_HEADING.search(text)
    if not m1:
        return text
    start = m1.end()
    m2 = NEXT_SECTION_HEADING.search(text, start)
    body = text[start:m2.start() if m2 else len(text)].strip()
    return re.sub(r"\n---\s*$", "", body).strip()


def resolve_section1_paths(bugstats_path, summary_file=None, report_file=None):
    if summary_file:
        return Path(summary_file), "summary-file"
    if report_file:
        return Path(report_file), "report-file"
    base = Path(bugstats_path)
    auto_section1 = base.with_name(base.name.replace("-bugstats-", "-section1-").replace(".json", ".md"))
    if auto_section1.is_file():
        return auto_section1, "auto-section1"
    auto_report = base.with_name(base.name.replace("-bugstats-", "-report-").replace(".json", ".md"))
    if auto_report.is_file():
        return auto_report, "auto-report"
    parent = base.parent
    generic = parent / "section1.md"
    if generic.is_file():
        return generic, "auto-section1"
    candidates = sorted(parent.glob("*-section1-*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if candidates:
        return candidates[0], "auto-section1"
    return None, None


def load_section1_md(bugstats_path, summary_file=None, report_file=None):
    path, source = resolve_section1_paths(bugstats_path, summary_file, report_file)
    if not path:
        return None, None
    text = path.read_text(encoding="utf-8")
    if source in ("report-file", "auto-report"):
        text = extract_section1(text)
    else:
        text = extract_section1(text) if SECTION1_HEADING.search(text) else text.strip()
    return text.strip() or None, source


# ── 资料加载（多文件 / 多页） ────────────
def load_materials(args, notion_client=None):
    """返回 [{"text":..., "source":...}]。"""
    sources = []
    for f in (args.material_file or []):
        p = Path(f)
        if not p.is_file():
            print(f"[material] 文件不存在，跳过: {p}", file=sys.stderr)
            continue
        sources.append({"text": mc.load_material_file(p), "source": f"file:{p.name}"})

    page_ids = list(args.material_page_id or [])
    if args.material_auto and not page_ids:
        print("[material] 警告：--material-auto 需配合 --material-page-id 才有效，"
              "未指定资料页将降级为精简执行表", file=sys.stderr)
    if page_ids:
        client = notion_client or nc.NotionClient()
        for pid in page_ids:
            try:
                sources.append({"text": mc.fetch_material_page(client, pid), "source": f"notion:{pid}"})
            except nc.NotionError as e:
                print(f"[material] Notion 读取失败 {pid}: {e}", file=sys.stderr)
    return sources


def legacy_material_context(sources, config):
    """legacy 引擎：只用第一份资料、单表解析（对照旧行为）。"""
    if not sources:
        return mc.build_material_context([], config)
    first = sources[0]
    rows, title, kind, reason = mc.parse_panorama_table(first["text"])
    conf = {"ok": 0.95, "weak_marker": 0.7}.get(reason, 0.3)
    return {
        "sources": [{"source": first["source"], "kind": kind, "title": title,
                     "reason": reason, "rowCount": len(rows), "confidence": conf}],
        "docType": kind,
        "confidence": conf,
        "coverageAreas": rows,
        "parseNotices": [f"[{first['source']}] {mc.render_parse_notice(reason)}"],
        "hasFullTable": bool(rows),
        "title": title,
    }


def build_material(args, sources, config):
    engine = args.material_engine
    if engine == "legacy":
        return legacy_material_context(sources, config), "legacy"
    if engine == "shadow":
        legacy = legacy_material_context(sources, config)
        ctxm = mc.build_material_context(sources, config)
        print("[shadow] legacy vs context 对照：")
        print(f"[shadow]   coverageAreas: legacy={len(legacy['coverageAreas'])} context={len(ctxm['coverageAreas'])}")
        print(f"[shadow]   docType: legacy={legacy['docType']} context={ctxm['docType']}")
        print(f"[shadow]   confidence: legacy={legacy['confidence']} context={ctxm['confidence']}")
        print("[shadow] 采用 context 结果发布（legacy 仅对照）")
        return ctxm, "shadow"
    return mc.build_material_context(sources, config), "context"


# ── 调试产物 ────────────
def write_debug(ctx, validation, engine):
    try:
        out_dir = Path(__file__).parent.parent / "output" / "report-debug"
        out_dir.mkdir(parents=True, exist_ok=True)
        ymd = datetime.now().strftime("%Y%m%d")
        base = ctx["project"].replace("/", " ").replace("\\", " ")
        path = out_dir / f"{base}-report-debug-{ymd}.json"
        debug = {
            "project": ctx["project"],
            "generatedAt": ctx["generatedAt"],
            "reportKind": ctx["reportKind"],
            "materialEngine": engine,
            "metrics": ctx["metrics"],
            "coverage": {k: v for k, v in ctx["coverage"].items() if k not in ("execRows", "simpleRows")},
            "keyIssueGroups": [{"category": g["category"], "count": g["count"]} for g in ctx["keyIssues"]["groups"]],
            "sourceSummary": ctx["bugContext"].get("sourceSummary"),
            "conflicts": ctx["conflicts"],
            "thresholds": ctx["config"]["thresholds"],
            "appliedConfig": ctx["config"]["applied"],
            "validation": {"errors": validation[0], "warnings": validation[1]},
        }
        path.write_text(json.dumps(debug, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[debug] 调试产物：{path}")
    except Exception as e:  # noqa: BLE001
        print(f"[debug] 写调试产物失败（忽略）: {e}", file=sys.stderr)


# ── 发布 ────────────
def publish_notion(ctx, args, locale, template):
    client = nc.NotionClient()
    expected_parent = nc.normalize_page_id(
        args.notion_parent or qa_config.NOTION_DEFAULT_PARENT_PAGE_ID
    )
    if args.notion_page_id_target:
        page_id = nc.normalize_page_id(args.notion_page_id_target)
        client.assert_not_template(page_id)
        client.assert_page_under_parent(page_id, expected_parent)
        cleared = client.clear_page(page_id)
        print(f"[notion] 复用页面 {page_id}（父页已校验 {expected_parent}），已清空旧内容 {cleared} 块")
        url = f"https://www.notion.so/{page_id.replace('-', '')}"
    else:
        page_id, url = client.create_page(expected_parent, args.title)
        print(f"[notion] 新建页面 {page_id}（父页 {expected_parent}）")
    blocks = template.build_notion_blocks(ctx, locale)
    print(f"[notion] 第二节执行表模式: {ctx['coverage']['mode']}")
    written = client.append_blocks(page_id, blocks)
    count = client.count_blocks(page_id)
    print(f"[notion] 写入 {written} 块，回读顶层 {count} 块")
    if count == 0:
        print("[notion] 回读校验失败：页面为空 ❌", file=sys.stderr)
        return {"ok": False, "url": url, "page_id": page_id}
    print(f"[notion] 写入成功 ✅  {url}")
    return {"ok": True, "url": url, "page_id": page_id}


def publish_dingtalk(ctx, args, locale, template):
    mention = dt.build_mention_line()
    text = template.build_dingtalk_summary(
        ctx, locale, doc_url=args.doc_url, mention_line=mention, title=args.title)
    result = dt.push_markdown(args.title, text)
    print(f"[dingtalk] errcode={result['errcode']} errmsg={result['errmsg']} "
          f"@生效={result.get('at_effective')} 重试={result.get('attempts')}")
    if result["ok"]:
        print("[dingtalk] 推送成功 ✅")
    else:
        print("[dingtalk] 推送失败 ❌", file=sys.stderr)
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bugstats", required=True)
    ap.add_argument("--mode", choices=["notion", "dingtalk", "both"], default="both")
    ap.add_argument("--title", default="测试报告")
    ap.add_argument("--notion-parent", dest="notion_parent")
    ap.add_argument("--notion-page-id", dest="notion_page_id_target")
    ap.add_argument("--doc-url", dest="doc_url")
    ap.add_argument("--tester")
    ap.add_argument("--test-type", dest="test_type")
    ap.add_argument("--coverage")
    ap.add_argument("--summary-file", dest="summary_file",
                    help="[deprecated] 仅写入 meta 供审计对比，不参与结论生成")
    ap.add_argument("--report-file", dest="report_file",
                    help="[deprecated] 仅写入 meta 供审计对比，不参与结论生成")
    ap.add_argument("--material-file", dest="material_file", action="append",
                    help="本地测试方案/计划/大纲 Markdown，可多次")
    ap.add_argument("--material-page-id", dest="material_page_id", action="append",
                    help="Notion 资料页 ID，可多次")
    ap.add_argument("--material-auto", dest="material_auto", action="store_true")
    ap.add_argument("--material-engine", choices=["legacy", "context", "shadow"], default="context")
    ap.add_argument("--report-kind", choices=["smoke", "functional", "regression", "auto"], default="functional")
    ap.add_argument("--locale", choices=report_templates.SUPPORTED_LOCALES, default="zh-CN")
    ap.add_argument("--template", default="standard")
    ap.add_argument("--project-config", dest="project_config")
    ap.add_argument("--semantic-dir", dest="semantic_dir",
                    help="缺陷语义持久化目录，默认 mcp/output/bug-semantic")
    ap.add_argument("--semantic-key", dest="semantic_key",
                    help="只读取文件名含该 key 的语义产物（如 projectId）")
    ap.add_argument("--dry", action="store_true", help="只构建上下文与 blocks，不发布")
    ap.add_argument("--no-validate", dest="no_validate", action="store_true")
    args = ap.parse_args()

    config = report_config.get_config(project_config_path=args.project_config)

    bs = load_bugstats(args.bugstats)
    section1_md, section1_source = load_section1_md(args.bugstats, args.summary_file, args.report_file)
    if section1_md:
        print(f"[section1] 来源={section1_source}，{len(section1_md)} 字（仅审计，不参与结论）")

    # 缺陷语义持久化产物（只读消费）
    semantic_dir = args.semantic_dir or str(Path(__file__).parent.parent / "output" / "bug-semantic")
    persisted = bsc.load_persisted_semantics(semantic_dir, args.semantic_key)
    print(f"[semantic] 持久化产物目录={semantic_dir}，命中 {len(persisted)} 条")

    bug_context = bsc.build_bug_semantic_context(bs, persisted=persisted, config=config)
    print(f"[semantic] 来源分布={bug_context['sourceSummary']}")

    # 资料 → MaterialContext
    notion_client = None
    if (args.material_page_id or args.material_auto) and not args.dry:
        notion_client = nc.NotionClient()
    elif args.material_page_id or args.material_auto:
        try:
            notion_client = nc.NotionClient()
        except nc.NotionError:
            print("[material] 无 Notion token，跳过资料页读取（dry）", file=sys.stderr)
    sources = load_materials(args, notion_client)
    material, engine = build_material(args, sources, config)
    print(f"[material] engine={engine} docType={material['docType']} "
          f"confidence={material['confidence']} coverageAreas={len(material['coverageAreas'])}")

    key_iss = ki.extract_key_issues(bug_context, config=config)
    print(f"[keyIssues] 方向数={len(key_iss['groups'])} 候选={key_iss['totalConsidered']} "
          f"可溯源率={key_iss['traceableRatio']}")

    meta = {
        "tester": args.tester,
        "testType": args.test_type,
        "coverage": args.coverage,
        "section1_md": section1_md,
    }
    ctx = rc.build_report_context(
        bs, material=material, bug_context=bug_context, key_issues=key_iss,
        meta=meta, report_kind=args.report_kind, config=config,
    )

    validation = rc.validate_report_context(ctx)
    errors, warnings = validation
    for w in warnings:
        print(f"[validate][warn] {w}")
    write_debug(ctx, validation, engine)

    if not args.no_validate and errors:
        print("[validate] 校验闸门失败 ❌（已阻断发布）", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(1)
    if not errors:
        print("[validate] 校验闸门通过 ✅")

    template = report_templates.get_template(args.template)

    if args.dry:
        blocks = template.build_notion_blocks(ctx, args.locale)
        print(f"[dry] 构建 Notion blocks={len(blocks)} 个，coverage.mode={ctx['coverage']['mode']}（未发布）")
        dt_text = template.build_dingtalk_summary(ctx, args.locale, doc_url=args.doc_url, title=args.title)
        print(f"[dry] 钉钉投影 {len(dt_text)} 字（未发布）")
        sys.exit(0)

    rc_code = 0
    if args.mode in ("notion", "both"):
        r = publish_notion(ctx, args, args.locale, template)
        rc_code = rc_code or (0 if r["ok"] else 1)
    if args.mode in ("dingtalk", "both"):
        r = publish_dingtalk(ctx, args, args.locale, template)
        rc_code = rc_code or (0 if r["ok"] else 1)
    sys.exit(rc_code)


if __name__ == "__main__":
    main()
