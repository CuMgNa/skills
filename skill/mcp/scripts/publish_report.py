# -*- coding: utf-8 -*-
"""统一报告发布入口（替代一堆一次性脚本）

数据来源：bugStats.json（唯一事实源，所有数字从此读取，禁止硬编码）。
能力：
  --mode notion   将报告以强类型 block 写入 Notion（callout/table 不被吞）
  --mode dingtalk 推送钉钉机器人消息（第一节摘要 + @负责人 + 文档链接）
  --mode both     两者都做

用法：
  python publish_report.py --bugstats <path> --mode notion --notion-parent <pageId> --title "xxx 测试报告 2026-06-23"
  python publish_report.py --bugstats <path> --mode dingtalk --title "xxx" --doc-url "https://alidocs..."
  python publish_report.py --bugstats <path> --mode notion --notion-page-id <已建页ID>  # 幂等覆盖已建页

注：钉钉文档（alidocs）创建仍由 Agent 走「钉钉文档」MCP create_document；本脚本通过 --doc-url 接收其链接。
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "lib"))
import qa_config            # noqa: E402
import dingtalk_client as dt  # noqa: E402
import notion_client as nc    # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")

CRITICAL_KEYWORDS = {
    "计费": ["扣费", "扣减", "额度", "余额", "套餐", "计费", "扣"],
    "数据一致性": ["清除", "同步", "统计", "数据", "一致"],
    "安全": ["权限", "登录", "鉴权", "越权", "账号"],
}
LEVEL_RISK = {"一级": 3, "二级": 3, "三级": 2, "四级": 1}


def load_bugstats(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def section1_text(bs, meta):
    """第一节正文：优先用用户提供的详细版（--summary-file），否则回退确定性摘要。"""
    custom = (meta or {}).get("section1_md")
    if custom and custom.strip():
        return custom.strip()
    return section1_summary(bs)


def section1_summary(bs):
    """第一节摘要——数字全取 bugStats，确定性模板，不臆造。"""
    by_status = bs["byStatus"]
    modules = {k: v for k, v in bs["byModule"].items() if v["未解决"] > 0}
    top = sorted(modules.items(), key=lambda kv: -kv[1]["未解决"])
    dist = "、".join(f"{m} {v['未解决']}个" for m, v in top) or "无"
    high = sum(1 for x in bs["未解决列表"] if x["级别"] in ("一级", "二级"))
    return (
        f"本轮覆盖 {len(bs['byModule'])} 个模块，当前未解决 {by_status['未解决']} 个"
        f"（其中回归不通过 {bs['回归不通过']} 个），待回归 {by_status['已修复待回归']} 个，"
        f"已延期 {by_status['已延期']} 个，高优问题（二级及以上）{high} 个。"
        f"未解决分布：{dist}。"
    )


def module_risk(bs):
    """按模块聚合风险等级（确定性矩阵）。"""
    mod_levels = {}
    for x in bs["未解决列表"] + bs["已延期列表"]:
        mod_levels.setdefault(x["模块"], []).append((x["级别"], x["状态"], x["标题"]))
    rows = []
    for mod, vals in bs["byModule"].items():
        if vals["未解决"] == 0 and vals["延期"] == 0:
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
        rows.append([mod, str(vals["未解决"]), str(vals["回归不通过"]), str(vals["延期"]), level, action])
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
    for line in section1_text(bs, meta).splitlines():
        line = line.rstrip()
        if not line:
            continue
        if line.lstrip().startswith(("- ", "* ")):
            B.append(nc.bullet(line.lstrip()[2:].strip()))
        else:
            B.append(nc.paragraph(line))

    B.append(nc.divider())
    B.append(nc.heading2("二、功能测试范围与执行情况"))
    B.append(nc.quote("精简执行表（数字取自 bugStats.byModule）"))
    exec_rows = []
    for mod, v in bs["byModule"].items():
        if v["未解决"] > 0 or v["回归不通过"] > 0:
            status = "⚠️ 有未解决"
        elif v["延期"] > 0:
            status = "⚠️ 延期"
        elif v["已修复"] > 0:
            status = "🟡 待回归"
        else:
            status = "✅ 通过"
        remark = []
        if v["回归不通过"]:
            remark.append(f"回归不通过{v['回归不通过']}")
        if v["延期"]:
            remark.append(f"延期{v['延期']}")
        exec_rows.append([mod, status, str(v["未解决"]), str(v["已修复"]), "、".join(remark) or "—"])
    B.append(nc.table(["测试模块", "结果状态", "未解决", "待回归", "备注"], exec_rows))

    B.append(nc.divider())
    B.append(nc.heading2("三、未解决问题汇总"))
    regfail = [x for x in bs["未解决列表"] if "回归不通过" in x["状态"]]
    active = [x for x in bs["未解决列表"] if x["状态"] == "激活-待确认"]
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
        B.append(nc.table(["风险方向（模块）", "未解决", "回归不通过", "延期", "风险等级", "建议处置"], risk_rows))
    else:
        B.append(nc.paragraph("本轮无未解决/延期缺陷，无高风险遗留。"))

    B.append(nc.callout(
        f"功能测试结论：缺陷总计 {bs['total']} 个，未解决 {bs['byStatus']['未解决']} 个"
        f"（含回归不通过 {bs['回归不通过']} 个），待回归 {bs['byStatus']['已修复待回归']} 个，"
        f"已延期 {bs['byStatus']['已延期']} 个。",
        emoji="✅", color="green_background"))
    return B


def publish_notion(bs, meta, args):
    client = nc.NotionClient()
    if args.notion_page_id:
        page_id = args.notion_page_id
        client.assert_not_template(page_id)
        cleared = client.clear_page(page_id)
        print(f"[notion] 复用页面 {page_id}，已清空旧内容 {cleared} 块")
        url = f"https://www.notion.so/{page_id.replace('-', '')}"
    else:
        parent = args.notion_parent or qa_config.NOTION_DEFAULT_PARENT_PAGE_ID
        page_id, url = client.create_page(parent, args.title)
        print(f"[notion] 新建页面 {page_id}")
    blocks = build_notion_blocks(bs, meta)
    written = client.append_blocks(page_id, blocks)
    count = client.count_blocks(page_id)
    print(f"[notion] 写入 {written} 块，回读顶层 {count} 块")
    if count == 0:
        print("[notion] 回读校验失败：页面为空 ❌", file=sys.stderr)
        return {"ok": False, "url": url, "page_id": page_id}
    print(f"[notion] 写入成功 ✅  {url}")
    return {"ok": True, "url": url, "page_id": page_id}


def publish_dingtalk(bs, args, meta=None):
    summary = section1_text(bs, meta)
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
                    help="一、测试结果 详细版 Markdown 文件（结论段 + 分类 bullet）；不传则回退确定性一句话摘要")
    args = ap.parse_args()

    bs = load_bugstats(args.bugstats)
    section1_md = None
    if args.summary_file:
        with open(args.summary_file, encoding="utf-8") as f:
            section1_md = f.read()
    meta = {"tester": args.tester, "testType": args.test_type,
            "coverage": args.coverage, "section1_md": section1_md}

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
