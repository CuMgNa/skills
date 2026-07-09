# -*- coding: utf-8 -*-
"""标准报告模板：结论 / 指标看板 / 重点问题 / 范围聚合 / 模块明细 / 风险 / 清单 / 附录。

同一 ReportContext 渲染两个投影：
  - build_notion_blocks(ctx, locale)  -> list[notion block]
  - build_dingtalk_summary(ctx, locale) -> str（数字与 Notion 完全一致）
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import notion_client as nc          # noqa: E402
from report_templates.strings import get_strings  # noqa: E402


def _conclusion_text(ctx, S):
    return ctx["conclusion"].strip(), True


def build_notion_blocks(ctx, locale="zh-CN"):
    S = get_strings(locale)
    m = ctx["metrics"]
    B = []

    # 0) 报告信息
    info = (
        f"{S['report_info']}\n{S['project']}：{ctx['project']}\n"
        f"{S['report_kind']}：{ctx['reportKind']}\n"
        f"{S['coverage_period']}：{ctx['meta'].get('coverage') or '—'}\n"
        f"{S['tester']}：{ctx['meta'].get('tester') or '—'}\n"
        f"{S['generated_at']}：{ctx['generatedAt']}\n"
        f"{S['covered_modules']}：{('、'.join(ctx['_bs']['byModule'].keys())) or '—'}"
    )
    B.append(nc.callout(info, emoji="📝", color="gray_background"))

    # 1) 测试结论
    B.append(nc.heading2(S["sec_conclusion"]))
    conclusion, _custom = _conclusion_text(ctx, S)
    for line in conclusion.splitlines():
        line = line.rstrip()
        if not line:
            continue
        if line.lstrip().startswith(("- ", "* ")):
            B.append(nc.bullet(line.lstrip()[2:].strip()))
        else:
            B.append(nc.paragraph(line))

    # 2) 指标看板
    B.append(nc.divider())
    B.append(nc.heading2(S["sec_metrics"]))
    B.append(nc.heading3(S["metrics_by_level"]))
    level_rows = [[lv, str(c)] for lv, c in m["byLevel"].items()]
    level_rows.append([S["total"], str(sum(m["byLevel"].values()))])
    B.append(nc.table([S["level"], S["count"]], level_rows))
    B.append(nc.heading3(S["metrics_by_status"]))
    status_rows = [[st, str(c)] for st, c in m["byStatus"].items()]
    status_rows.append([S["total"], str(sum(m["byStatus"].values()))])
    B.append(nc.table([S["status"], S["count"]], status_rows))

    # 3) 重点问题（动态）
    B.append(nc.divider())
    B.append(nc.heading2(S["sec_key_issues"]))
    groups = ctx["keyIssues"]["groups"]
    if not groups:
        B.append(nc.paragraph("—"))
    for g in groups:
        B.append(nc.heading3(f"{S['key_issue_group']}：{g['category']}（{g['count']}）"))
        for it in g["items"]:
            B.append(nc.numbered(
                f"[{it['level']}] {it['title']}（#{it['id']}）\n"
                f"{S['key_issue_impact']}：{it['impact']}"
            ))
        if g["overflow"] > 0:
            B.append(nc.paragraph(S["key_issue_overflow"].format(n=g["overflow"])))

    # 4) 功能测试范围与执行情况
    B.append(nc.divider())
    B.append(nc.heading2(S["sec_coverage"]))
    cov = ctx["coverage"]
    if cov["mode"] == "full":
        title = cov.get("title") or "测试方案"
        B.append(nc.quote(
            f"本轮依据《{title}》测试范围执行；模块数字经别名归并后取自 bugStats.byModule。"
        ))
        B.append(nc.table(
            ["#", S["th_module"], S["th_core"], S["th_priority"], S["th_result"],
             S["th_open"], S["th_pending"], S["th_remark"]],
            cov["execRows"],
        ))
    else:
        notice = cov["notices"][0] if cov.get("notices") else "—"
        B.append(nc.callout(
            f"📋 {S['degrade_title']}\n"
            f"• {S['degrade_result']}：{notice}\n"
            f"• {S['degrade_action']}\n"
            f"• {S['degrade_suggest']}",
            emoji="⚠️", color="yellow_background"
        ))
        B.append(nc.table(
            [S["th_module"], S["th_result"], S["th_open"], S["th_pending"], S["th_remark"]],
            cov["simpleRows"],
        ))

    # 5) 模块明细
    B.append(nc.divider())
    B.append(nc.heading2(S["sec_module_detail"]))
    B.append(nc.table(
        [S["th_module"], S["th_open"], S["th_pending"], S["th_deferred"],
         S["th_regfail"], S["th_result"], S["th_plan_area"]],
        ctx["moduleDetail"],
    ))

    # 6) 风险评估
    B.append(nc.divider())
    B.append(nc.heading2(S["sec_risk"]))
    if ctx["risk"]:
        B.append(nc.table(
            [S["th_risk_dir"], S["th_open"], S["th_regfail"], S["th_deferred"],
             S["th_risk_level"], S["th_action"]],
            ctx["risk"],
        ))
    else:
        B.append(nc.paragraph(S["no_risk"]))

    # 7) 未解决与待回归清单
    B.append(nc.divider())
    B.append(nc.heading2(S["sec_lists"]))
    L = ctx["lists"]
    if L["regfail"]:
        B.append(nc.paragraph(f"{S['list_regfail']}（{len(L['regfail'])}）"))
        for x in L["regfail"]:
            B.append(nc.numbered(f"[{x['级别']}] {x['标题']}"))
    if L["active"]:
        B.append(nc.paragraph(f"{S['list_active']}（{len(L['active'])}）"))
        for x in L["active"]:
            B.append(nc.numbered(f"[{x['级别']}] {x['标题']}"))
    if L["deferred"]:
        B.append(nc.paragraph(f"{S['list_deferred']}（{len(L['deferred'])}）"))
        for x in L["deferred"]:
            B.append(nc.numbered(f"[{x['级别']}] {x['标题']}"))
    B.append(nc.paragraph(f"{S['list_pending']}（{len(L['pending'])}）"))
    for x in L["pending"]:
        B.append(nc.numbered(f"[{x['级别']}] {x['标题']}"))

    # 8) 附录（toggle）
    B.append(nc.divider())
    appendix_children = []
    appendix_children.append(nc.paragraph(f"【{S['appendix_parse']}】"))
    for note in cov.get("notices", []) or ["—"]:
        appendix_children.append(nc.bullet(note))
    appendix_children.append(nc.paragraph(f"【{S['appendix_source']}】"))
    src = ctx["bugContext"].get("sourceSummary", {})
    appendix_children.append(nc.bullet(
        f"semantic(持久化)={src.get('semantic', 0)}、zentao_steps={src.get('zentao_steps', 0)}、title={src.get('title', 0)}"
    ))
    appendix_children.append(nc.paragraph(f"【{S['appendix_conflict']}】"))
    if ctx["conflicts"]:
        for c in ctx["conflicts"][:20]:
            appendix_children.append(nc.bullet(
                f"#{c.get('bugId', '?')} {c.get('field')}: {c.get('note') or c.get('candidates')}"
            ))
    else:
        appendix_children.append(nc.bullet("—"))
    appendix_children.append(nc.paragraph(f"【{S['appendix_threshold']}】"))
    th = ctx["config"]["thresholds"]
    appendix_children.append(nc.bullet(
        f"coverage_ratio={cov.get('ratio')}；min_support={th['dynamic_label_min_support']}；"
        f"coverage_min_ratio={th['coverage_min_ratio']}；docType={cov.get('docType')}；confidence={cov.get('confidence')}"
    ))
    B.append(nc.toggle(S["sec_appendix"], appendix_children))

    # 结论 callout
    B.append(nc.callout(
        S["final_conclusion"].format(
            total=m["total"], open=m["open"], regfail=m["regfail"],
            pending=m["pending"], deferred=m["deferred"],
        ),
        emoji="✅", color="green_background"))
    return B


def build_dingtalk_summary(ctx, locale="zh-CN", doc_url=None, mention_line=None, title=None):
    """钉钉 markdown 投影（精简版）：标题 / 测试结论 / @ / 文档链接。

    精简原则：钉钉只做"群里轻提醒 + 详情入口"，指标看板/重点问题留给
    Notion 全量报告。数字仍与 Notion 同源（同一 ctx），仅裁剪展示段，
    不影响校验闸门（闸门查 Notion 全量 + bugStats，不查钉钉简版）。
    """
    S = get_strings(locale)
    conclusion, _custom = _conclusion_text(ctx, S)

    parts = []
    if title:
        parts.append(f"## {title}")
    parts.append(f"### {S['dt_conclusion']}\n\n{conclusion}")

    if mention_line:
        parts.append(mention_line)
    if doc_url:
        parts.append(f"### {S['dt_doc']}\n\n[{S['dt_view']}]({doc_url})")

    return "\n\n".join(parts)
