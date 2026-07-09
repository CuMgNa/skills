# -*- coding: utf-8 -*-
"""符合 test-report 技能规范的结论格式化器（唯一结论来源）。

方向聚类复用 ctx['keyIssues']（key_issues.extract_key_issues 产出），本模块只做 Markdown 格式化。
"""
import re

LEVEL_HIGH = {"一级", "二级"}


def _strip_prefix(title):
    return re.sub(r"^(【[^】]+】)+", "", title or "").strip()


def format_conclusion(ctx):
    """从 ReportContext 生成 test-report 第一节 Markdown。"""
    m = ctx["metrics"]
    groups = (ctx.get("keyIssues") or {}).get("groups") or []

    focus = " / ".join(g["category"] for g in groups[:3]) or "待归纳"
    intro = (
        f"本轮测试已完成 {m['moduleCount']} 个模块的功能验证，"
        f"当前仍有 **{m['open']} 个未解决缺陷**"
        f"（其中回归不通过 **{m['regfail']}** 个），"
        f"主要集中在 **{focus}** 等方向，"
        f"其中 **{m['highCount']} 个高优问题（二级及以上）需优先修复**，"
        f"**{m['deferred']} 个已延期问题建议下个版本跟进**。"
    )

    bullets = []
    for g in groups:
        highs = [it for it in g["items"] if it.get("level") in LEVEL_HIGH]
        high_note = ""
        if highs:
            ids = "、".join(f"#{it['id']}" for it in highs)
            high_note = f"（含二级高优 {ids}）"
        examples = "、".join(_strip_prefix(it["title"]) for it in g["items"][:4])
        if g.get("overflow", 0) > 0 or g["count"] > 4:
            examples += " 等"
        impact = g["items"][0]["impact"] if g["items"] else "需结合业务场景优先修复"
        bullets.append(
            f"- **【{g['category']}】：{g['count']} 个未关闭**{high_note} 涉及{examples}；{impact}。"
        )
    if m["pending"]:
        bullets.append(f"- **【回归验证】**：另有 **{m['pending']} 个** 已修复缺陷待回归验证。")

    return intro + "\n\n" + "\n".join(bullets)
