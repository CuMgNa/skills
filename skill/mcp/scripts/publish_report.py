# -*- coding: utf-8 -*-
"""统一报告发布入口（替代一堆一次性脚本）

数据来源：bugStats.json（唯一事实源，所有数字从此读取，禁止硬编码）。
能力：
  --mode notion   将报告以强类型 block 写入 Notion（callout/table 不被吞）
  --mode dingtalk 推送钉钉机器人消息（第一节摘要 + @负责人 + 文档链接）
  --mode both     两者都做

用法：
  python publish_report.py --bugstats <path> --mode notion --notion-parent <pageId> --title "xxx 测试报告 2026-06-23"
  python publish_report.py --bugstats <path> --mode dingtalk --title "xxx" --doc-url "https://alidocs..." --summary-file "mcp/output/{项目}-section1-{日期}.md"
  python publish_report.py --bugstats <path> --mode dingtalk --title "xxx" --doc-url "..." --report-file "mcp/output/{项目}-report-{日期}.md"
  python publish_report.py --bugstats <path> --mode notion --notion-page-id <已建页ID>  # 幂等覆盖已建页

钉钉推送必须使用与钉钉文档一致的「一、测试结果」详细版（--summary-file 或 --report-file）；
未传参时自动查找同目录 {项目}-section1-{日期}.md / {项目}-report-{日期}.md，找不到则报错，不再回退一句话模板。

注：钉钉文档（alidocs）创建仍由 Agent 走「钉钉文档」MCP create_document；本脚本通过 --doc-url 接收其链接。
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "lib"))
import qa_config            # noqa: E402
import dingtalk_client as dt  # noqa: E402
import notion_client as nc    # noqa: E402
import test_plan_material as tpm  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")

CRITICAL_KEYWORDS = {
    "计费": ["扣费", "扣减", "额度", "余额", "套餐", "计费", "扣"],
    "数据一致性": ["清除", "同步", "统计", "数据", "一致"],
    "安全": ["权限", "登录", "鉴权", "越权", "账号"],
}
LEVEL_RISK = {"一级": 3, "二级": 3, "三级": 2, "四级": 1}

SECTION1_HEADING = re.compile(r"^#{1,3}\s*一[、.．]测试结果\s*$", re.MULTILINE)
NEXT_SECTION_HEADING = re.compile(r"^#{1,3}\s*[二三四五][、.．]", re.MULTILINE)


def load_bugstats(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def extract_section1(md):
    """从完整报告 Markdown 提取「一、测试结果」正文（不含标题行）。"""
    text = md.strip()
    m1 = SECTION1_HEADING.search(text)
    if not m1:
        return text
    start = m1.end()
    m2 = NEXT_SECTION_HEADING.search(text, start)
    body = text[start:m2.start() if m2 else len(text)].strip()
    return re.sub(r"\n---\s*$", "", body).strip()


def resolve_section1_paths(bugstats_path, summary_file=None, report_file=None):
    """按优先级解析第一节来源：--summary-file > --report-file > 同目录自动发现。"""
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
    # 通用 bugstats.json：同目录 section1.md 或最新的 *-section1-*.md
    parent = base.parent
    generic = parent / "section1.md"
    if generic.is_file():
        return generic, "auto-section1"
    candidates = sorted(parent.glob("*-section1-*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if candidates:
        return candidates[0], "auto-section1"
    return None, None


def load_section1_md(bugstats_path, summary_file=None, report_file=None):
    """加载「一、测试结果」详细版；report 类来源会经 extract_section1 截取。"""
    path, source = resolve_section1_paths(bugstats_path, summary_file, report_file)
    if not path:
        return None, None
    text = path.read_text(encoding="utf-8")
    if source in ("report-file", "auto-report"):
        text = extract_section1(text)
    else:
        text = extract_section1(text) if SECTION1_HEADING.search(text) else text.strip()
    return text.strip() or None, source


def section1_text(bs, meta, *, allow_fallback=False):
    """第一节正文：优先用详细版（--summary-file / --report-file）；钉钉推送禁止回退模板。"""
    custom = (meta or {}).get("section1_md")
    if custom and custom.strip():
        return custom.strip()
    if allow_fallback:
        return section1_summary(bs)
    return None


def section1_summary(bs):
    """第一节摘要——数字全取 bugStats，确定性模板，不臆造。"""
    by_status = bs["byStatus"]
    modules = {k: v for k, v in bs["byModule"].items() if v["未关闭"] > 0}
    top = sorted(modules.items(), key=lambda kv: -kv[1]["未关闭"])
    dist = "、".join(f"{m} {v['未关闭']}个" for m, v in top) or "无"
    high = sum(1 for x in bs["未关闭列表"] if x["级别"] in ("一级", "二级"))
    return (
        f"本轮覆盖 {len(bs['byModule'])} 个模块，当前未关闭 {by_status['未关闭']} 个"
        f"（其中回归不通过 {bs['回归不通过']} 个），待回归 {by_status['已修复待回归']} 个，"
        f"已延期 {by_status['已延期']} 个，高优问题（二级及以上）{high} 个。"
        f"未关闭分布：{dist}。"
    )


def load_test_material(args, notion_client=None):
    """加载辅助测试资料；成功返回 (text, source)，失败返回 (None, None)。"""
    if args.material_file:
        path = Path(args.material_file)
        if not path.is_file():
            print(f"[material] 文件不存在: {path}", file=sys.stderr)
            return None, None
        return tpm.load_material_file(path), f"file:{path}"

    page_id = args.material_page_id
    if args.material_auto and not page_id:
        page_id = qa_config.NOTION_DEFAULT_MATERIAL_PAGE_ID

    if page_id:
        client = notion_client or nc.NotionClient()
        try:
            text = tpm.fetch_material_page(client, page_id)
            return text, f"notion:{page_id}"
        except nc.NotionError as e:
            print(f"[material] Notion 读取失败: {e}", file=sys.stderr)
            return None, None
    return None, None


def build_section2_blocks(bs, material_text, material_title=None):
    """第二节：有资料 → 完整执行表；无资料或解析失败 → 精简表。"""
    blocks = []
    blocks.append(nc.heading2("二、功能测试范围与执行情况"))

    panorama_rows, plan_title = tpm.parse_panorama_table(material_text or "")
    if panorama_rows:
        title = plan_title or "测试方案"
        blocks.append(nc.quote(
            f"本轮依据《{title}》1.4.1 测试范围全景表执行；模块数字经别名归并后取自 bugStats.byModule。"
        ))
        exec_rows = tpm.build_execution_rows(bs, panorama_rows)
        blocks.append(nc.table(
            ["#", "测试模块", "核心测试点", "优先级", "结果状态", "未关闭", "待回归", "备注"],
            exec_rows,
        ))
        return blocks, "full"

    blocks.append(nc.quote("精简执行表（无可用测试方案资料或全景表解析失败；数字取自 bugStats.byModule）"))
    blocks.append(nc.table(
        ["测试模块", "结果状态", "未关闭", "待回归", "备注"],
        tpm.build_simplified_rows(bs),
    ))
    return blocks, "simplified"


def module_risk(bs):
    """按模块聚合风险等级（确定性矩阵）。"""
    mod_levels = {}
    for x in bs["未关闭列表"] + bs["已延期列表"]:
        mod_levels.setdefault(x["模块"], []).append((x["级别"], x["状态"], x["标题"]))
    rows = []
    for mod, vals in bs["byModule"].items():
        if vals["未关闭"] == 0 and vals["延期"] == 0:
            continue
        items = mod_levels.get(mod, [])
        has_regfail = vals["回归不通过"] > 0
        max_level_risk = max([LEVEL_RISK.get(lv, 1) for lv, _, _ in items], default=1)
        text_blob = " ".join(t for _, _, t in items)
        is_critical = any(any(k in text_blob for k in kws) for kws in CRITICAL_KEYWORDS.values())
        if max_level_risk >= 3 or has_regfail:
            level, action = "🔴 高", "阻断上线，优先修复后进入下一轮回归"
        elif max_level_risk == 2 and is_critical:
            level, action = "🟠 中", "下轮回归前修复，不阻断但需跟踪"
        else:
            level, action = "🟡 低", "可下个版本跟进"
        rows.append([mod, str(vals["未关闭"]), str(vals["回归不通过"]), str(vals["延期"]), level, action])
    return rows


def build_notion_blocks(bs, meta):
    B = []
    info = (
        f"报告信息\n项目：{bs['projectName']}\n测试类型：{meta.get('testType') or '功能测试'}\n"
        f"覆盖期：{meta.get('coverage') or '—'}\n测试人：{meta.get('tester') or '—'}\n"
        f"覆盖模块：{('、'.join(bs['byModule'].keys())) or '—'}"
    )
    B.append(nc.callout(info, emoji="📝", color="gray_background"))

    B.append(nc.heading2("一、测试结果"))
    for line in section1_text(bs, meta, allow_fallback=True).splitlines():
        line = line.rstrip()
        if not line:
            continue
        if line.lstrip().startswith(("- ", "* ")):
            B.append(nc.bullet(line.lstrip()[2:].strip()))
        else:
            B.append(nc.paragraph(line))

    B.append(nc.divider())
    section2_blocks, table_mode = build_section2_blocks(bs, meta.get("material_text"))
    B.extend(section2_blocks)
    meta["section2_mode"] = table_mode

    B.append(nc.divider())
    B.append(nc.heading2("三、未解决问题汇总"))
    regfail = [x for x in bs["未关闭列表"] if "回归不通过" in x["状态"]]
    active = [x for x in bs["未关闭列表"] if x["状态"] == "激活-待确认"]
    if regfail:
        B.append(nc.paragraph(f"激活-已确认（回归不通过）（{len(regfail)}）"))
        for x in regfail:
            B.append(nc.numbered(f"[{x['级别']}] {x['标题']}"))
    if active:
        B.append(nc.paragraph(f"激活-待确认（{len(active)}）"))
        for x in active:
            B.append(nc.numbered(f"[{x['级别']}] {x['标题']}"))
    if bs["已延期列表"]:
        B.append(nc.paragraph(f"已延期（{len(bs['已延期列表'])}）"))
        for x in bs["已延期列表"]:
            B.append(nc.numbered(f"[{x['级别']}] {x['标题']}"))

    B.append(nc.divider())
    B.append(nc.heading2("四、待回归"))
    B.append(nc.paragraph(f"{len(bs['待回归列表'])} 个已解决缺陷待 QA 回归验证："))
    for x in bs["待回归列表"]:
        B.append(nc.numbered(f"[{x['级别']}] {x['标题']}"))

    B.append(nc.divider())
    B.append(nc.heading2("五、风险与遗留影响评估"))
    risk_rows = module_risk(bs)
    if risk_rows:
        B.append(nc.table(["风险方向（模块）", "未关闭", "回归不通过", "延期", "风险等级", "建议处置"], risk_rows))
    else:
        B.append(nc.paragraph("本轮无未关闭/延期缺陷，无高风险遗留。"))

    B.append(nc.callout(
        f"功能测试结论：缺陷总计 {bs['total']} 个，未关闭 {bs['byStatus']['未关闭']} 个"
        f"（含回归不通过 {bs['回归不通过']} 个），待回归 {bs['byStatus']['已修复待回归']} 个，"
        f"已延期 {bs['byStatus']['已延期']} 个。",
        emoji="✅", color="green_background"))
    return B


def publish_notion(bs, meta, args):
    client = nc.NotionClient()
    expected_parent = nc.normalize_page_id(
        args.notion_parent or qa_config.NOTION_DEFAULT_PARENT_PAGE_ID
    )
    if args.notion_page_id:
        page_id = nc.normalize_page_id(args.notion_page_id)
        client.assert_not_template(page_id)
        client.assert_page_under_parent(page_id, expected_parent)
        cleared = client.clear_page(page_id)
        print(f"[notion] 复用页面 {page_id}（父页已校验 {expected_parent}），已清空旧内容 {cleared} 块")
        url = f"https://www.notion.so/{page_id.replace('-', '')}"
    else:
        page_id, url = client.create_page(expected_parent, args.title)
        print(f"[notion] 新建页面 {page_id}（父页 {expected_parent}）")
    blocks = build_notion_blocks(bs, meta)
    mode = meta.get("section2_mode", "unknown")
    print(f"[notion] 第二节执行表模式: {mode}")
    written = client.append_blocks(page_id, blocks)
    count = client.count_blocks(page_id)
    print(f"[notion] 写入 {written} 块，回读顶层 {count} 块")
    if count == 0:
        print("[notion] 回读校验失败：页面为空 ❌", file=sys.stderr)
        return {"ok": False, "url": url, "page_id": page_id}
    print(f"[notion] 写入成功 ✅  {url}")
    return {"ok": True, "url": url, "page_id": page_id}


def publish_dingtalk(bs, args, meta=None):
    summary = section1_text(bs, meta, allow_fallback=False)
    if not summary:
        print("[dingtalk] 错误：推送需要「一、测试结果」详细版，请传 --summary-file 或 --report-file，"
              "或将 {项目}-section1-{日期}.md 放在 bugStats 同目录", file=sys.stderr)
        return {"ok": False, "errcode": -1, "errmsg": "missing section1", "at_effective": False, "attempts": 0}
    mention = dt.build_mention_line()
    doc_line = f"\n\n### 附件\n\n完整测试报告：[点击查看]({args.doc_url})" if args.doc_url else ""
    text = f"## {args.title}\n\n### 一、测试结果\n\n{summary}\n\n{mention}{doc_line}"
    result = dt.push_markdown(args.title, text)
    print(f"[dingtalk] errcode={result['errcode']} errmsg={result['errmsg']} "
          f"@生效={result['at_effective']} 重试={result['attempts']}")
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
    ap.add_argument("--notion-page-id", dest="notion_page_id")
    ap.add_argument("--doc-url", dest="doc_url")
    ap.add_argument("--tester")
    ap.add_argument("--test-type", dest="test_type")
    ap.add_argument("--coverage")
    ap.add_argument("--summary-file", dest="summary_file",
                    help="「一、测试结果」详细版 Markdown（与钉钉文档第一节逐字一致）")
    ap.add_argument("--report-file", dest="report_file",
                    help="完整测试报告 Markdown；脚本自动截取「一、测试结果」用于钉钉推送")
    ap.add_argument("--material-file", dest="material_file",
                    help="本地测试方案 Markdown（解析 1.4.1 全景表 → 完整执行表）")
    ap.add_argument("--material-page-id", dest="material_page_id",
                    help="Notion 测试方案页 ID（与 --material-file 二选一）")
    ap.add_argument("--material-auto", dest="material_auto", action="store_true",
                    help="自动读取默认测试方案页（qa_config.NOTION_DEFAULT_MATERIAL_PAGE_ID）")
    args = ap.parse_args()

    bs = load_bugstats(args.bugstats)
    section1_md, section1_source = load_section1_md(
        args.bugstats, args.summary_file, args.report_file)
    if section1_md:
        print(f"[section1] 来源={section1_source}，{len(section1_md)} 字")

    material_text, material_source = load_test_material(args)
    if material_text:
        rows, _ = tpm.parse_panorama_table(material_text)
        print(f"[material] 来源={material_source}，全景表 {len(rows)} 行")
    elif args.material_file or args.material_page_id or args.material_auto:
        print("[material] 未读到可用资料，第二节将降级为精简表", file=sys.stderr)

    meta = {
        "tester": args.tester,
        "testType": args.test_type,
        "coverage": args.coverage,
        "section1_md": section1_md,
        "material_text": material_text,
    }

    rc = 0
    if args.mode in ("notion", "both"):
        r = publish_notion(bs, meta, args)
        rc = rc or (0 if r["ok"] else 1)
    if args.mode in ("dingtalk", "both"):
        r = publish_dingtalk(bs, args, meta)
        rc = rc or (0 if r["ok"] else 1)
    sys.exit(rc)


if __name__ == "__main__":
    main()
