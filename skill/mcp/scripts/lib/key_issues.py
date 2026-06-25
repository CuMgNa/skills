# -*- coding: utf-8 -*-
"""动态重点问题提取器。

输入：BugSemanticContext（含 impactSignals / level / status / userImpact / evidenceRef）。
输出：按 impactSignals 动态聚类的「重点问题方向」，而非写死分类。

规则（阈值来自 report_config）：
  - 候选 = 未解决缺陷（status != 已解决）。
  - 每个缺陷主方向 = 权重最高的 impactSignal 标签；无信号 → 「其他功能问题」。
  - 方向成立条件：支撑缺陷数 >= dynamic_label_min_support 或 含二级及以上缺陷；
    不成立的方向并入「其他功能问题」。
  - 影响短语：可溯源（userImpact 来自持久化）→ 直接用；不可溯源 → 用模板短语并标注「（影响待复核）」。
  - 排序：方向按 (最高级别, 缺陷数, 权重) 降序；方向内按级别降序。
"""
try:
    import report_config
except ImportError:
    from . import report_config  # type: ignore


OTHER_LABEL = "其他功能问题"


def _is_unresolved(bug):
    return (bug.get("status") or "") != "已解决"


def _primary_label(bug):
    sigs = bug.get("impactSignals") or []
    return sigs[0]["label"] if sigs else OTHER_LABEL


def _primary_phrase(bug):
    sigs = bug.get("impactSignals") or []
    return sigs[0]["phrase"] if sigs else "功能行为与预期不符"


def _impact_text(bug):
    """返回 (影响短语, 是否可溯源)。"""
    if bug.get("userImpact") and bug.get("impactTraceable"):
        return bug["userImpact"], True
    return _primary_phrase(bug) + "（影响待复核）", False


def extract_key_issues(bug_context, config=None):
    config = config or report_config.get_config()
    th = config["thresholds"]
    rank = config["levelRank"]
    force_rank = th["key_issue_force_level_rank"]
    min_support = th["dynamic_label_min_support"]
    max_groups = th["key_issue_max_groups"]
    max_items = th["key_issue_max_items_per_group"]

    candidates = [b for b in bug_context.get("bugs", []) if _is_unresolved(b)]

    # 1) 初步按主方向分组
    groups = {}
    for bug in candidates:
        label = _primary_label(bug)
        groups.setdefault(label, []).append(bug)

    # 2) 不成立的方向并入「其他」
    other = groups.pop(OTHER_LABEL, [])
    qualified = {}
    for label, items in groups.items():
        has_high = any(rank.get(b.get("level"), 0) >= force_rank for b in items)
        if len(items) >= min_support or has_high:
            qualified[label] = items
        else:
            other.extend(items)
    if other:
        qualified[OTHER_LABEL] = other

    # 3) 组装 + 排序
    out_groups = []
    for label, items in qualified.items():
        items_sorted = sorted(items, key=lambda b: -rank.get(b.get("level"), 0))
        max_level_rank = max((rank.get(b.get("level"), 0) for b in items), default=0)
        weight = 0
        for b in items:
            sigs = b.get("impactSignals") or []
            if sigs:
                weight = max(weight, sigs[0]["weight"])
        rendered = []
        for b in items_sorted[:max_items]:
            impact, traceable = _impact_text(b)
            rendered.append({
                "id": b["id"],
                "level": b.get("level"),
                "module": b.get("module"),
                "title": b.get("title"),
                "impact": impact,
                "traceable": traceable,
                "evidenceRef": b.get("evidenceRef"),
            })
        out_groups.append({
            "category": label,
            "count": len(items),
            "maxLevelRank": max_level_rank,
            "weight": weight,
            "items": rendered,
            "overflow": max(0, len(items) - max_items),
        })

    out_groups.sort(key=lambda g: (-g["maxLevelRank"], -g["count"], -g["weight"]))
    out_groups = out_groups[:max_groups]

    return {
        "groups": out_groups,
        "totalConsidered": len(candidates),
        "traceableRatio": _traceable_ratio(candidates),
    }


def _traceable_ratio(candidates):
    if not candidates:
        return 1.0
    n = sum(1 for b in candidates if b.get("userImpact") and b.get("impactTraceable"))
    return round(n / len(candidates), 3)
