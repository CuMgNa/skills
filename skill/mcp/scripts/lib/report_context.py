# -*- coding: utf-8 -*-
"""ReportContext：把 bugStats + MaterialContext + BugSemanticContext + 重点问题
汇总成模板可直接消费的单一上下文，并提供发布前校验闸门。

不变量：
  - 所有展示数字来自 bugStats（唯一事实源）。
  - coverageAssignment 唯一（一个缺陷一个测试方向）；impactSignals 可多值（风险）。
  - 不可溯源的业务影响降级，不以确定性结论输出。
"""
from datetime import datetime

try:
    import report_config
    import material_context as mc
    import bug_semantic_context as bsc
    import key_issues as ki
except ImportError:
    from . import report_config, material_context as mc  # type: ignore
    from . import bug_semantic_context as bsc, key_issues as ki  # type: ignore


# ── bugStats 取数小工具 ────────────
def s_open(bs):
    return (bs.get("byStatusCode") or {}).get("open", bs["byStatus"]["未关闭"])


def s_pending(bs):
    return (bs.get("byStatusCode") or {}).get("pendingRegression", bs["byStatus"]["已修复待回归"])


def s_deferred(bs):
    return (bs.get("byStatusCode") or {}).get("deferred", bs["byStatus"]["已延期"])


def s_closed(bs):
    return (bs.get("byStatusCode") or {}).get("closed", bs["byStatus"]["已关闭"])


def s_regfail(bs):
    return bs.get("regressionFailed", bs["回归不通过"])


def list_open(bs):
    return (bs.get("lists") or {}).get("open", bs["未关闭列表"])


def list_pending(bs):
    return (bs.get("lists") or {}).get("pendingRegression", bs["待回归列表"])


def list_deferred(bs):
    return (bs.get("lists") or {}).get("deferred", bs["已延期列表"])


def _module_status(v):
    if v["未关闭"] > 0 or v["回归不通过"] > 0:
        return "⚠️ 有未关闭"
    if v["延期"] > 0:
        return "⚠️ 延期"
    if v["已修复"] > 0:
        return "🟡 待回归"
    return "✅ 通过"


def build_module_detail(bs, mapping):
    rows = []
    for mod, v in bs.get("byModule", {}).items():
        if not any(v.get(k, 0) for k in ("未关闭", "已修复", "延期", "回归不通过")):
            continue
        plan_area = mapping.get(mod, "—")
        rows.append([
            mod,
            str(v["未关闭"]), str(v["已修复"]), str(v["延期"]), str(v["回归不通过"]),
            _module_status(v), plan_area,
        ])
    return rows


def build_risk(bs, bug_context, config):
    """按模块聚合风险（确定性矩阵 + impactSignals 增强）。"""
    rank = config["levelRank"]
    by_module = {}
    for b in bug_context["bugs"]:
        if (b.get("status") or "") == "已解决":
            continue
        by_module.setdefault(b["module"], []).append(b)

    rows = []
    for mod, v in bs.get("byModule", {}).items():
        if v["未关闭"] == 0 and v["延期"] == 0:
            continue
        items = by_module.get(mod, [])
        has_regfail = v["回归不通过"] > 0
        max_rank = max((rank.get(b.get("level"), 0) for b in items), default=0)
        max_weight = 0
        for b in items:
            sigs = b.get("impactSignals") or []
            if sigs:
                max_weight = max(max_weight, sigs[0]["weight"])
        if max_rank >= rank["二级"] or has_regfail:
            level, action = "🔴 高", "阻断上线，优先修复后进入下一轮回归"
        elif max_weight >= 80:
            level, action = "🟠 中", "下轮回归前修复，不阻断但需跟踪"
        else:
            level, action = "🟡 低", "可下个版本跟进"
        rows.append([mod, str(v["未关闭"]), str(v["回归不通过"]), str(v["延期"]), level, action])
    return rows


def build_report_context(bs, *, material=None, bug_context=None, key_issues=None,
                         meta=None, report_kind="functional", config=None):
    config = config or report_config.get_config()
    meta = meta or {}
    material = material or mc.build_material_context([], config)
    bug_context = bug_context or bsc.build_bug_semantic_context(bs, config=config)
    key_issues = key_issues or ki.extract_key_issues(bug_context, config=config)

    coverage_areas = material.get("coverageAreas", [])
    mapping = mc.assign_modules(bs, coverage_areas, config) if coverage_areas else {}

    # 把 coverageAssignment 唯一归并写回每个 bug（用于第三节合计与追溯）
    for b in bug_context["bugs"]:
        area = mapping.get(b["module"])
        b["coverageAssignment"] = {
            "area": area or "未归类",
            "matchRule": "mapped" if area else "unmatched",
        }

    ratio = mc.coverage_ratio(bs, coverage_areas, config) if coverage_areas else 0.0
    has_full = material.get("hasFullTable")

    if has_full:
        coverage = {
            "mode": "full",
            "docType": material.get("docType"),
            "confidence": material.get("confidence"),
            "title": material.get("title"),
            "notices": material.get("parseNotices", []),
            "execRows": mc.build_execution_rows(bs, coverage_areas, config),
            "ratio": ratio,
            "belowThreshold": ratio < config["thresholds"]["coverage_min_ratio"],
        }
    else:
        coverage = {
            "mode": "simplified",
            "docType": material.get("docType"),
            "confidence": material.get("confidence"),
            "title": material.get("title"),
            "notices": material.get("parseNotices", []),
            "simpleRows": mc.build_simplified_rows(bs),
            "ratio": ratio,
            "belowThreshold": True,
        }

    high_count = sum(1 for x in list_open(bs) if x["级别"] in ("一级", "二级"))
    regfail_items = [x for x in list_open(bs) if "回归不通过" in x["状态"]]
    active_items = [x for x in list_open(bs) if x["状态"] == "激活-待确认"]

    metrics = {
        "total": bs["total"],
        "open": s_open(bs),
        "pending": s_pending(bs),
        "deferred": s_deferred(bs),
        "closed": s_closed(bs),
        "regfail": s_regfail(bs),
        "highCount": high_count,
        "byLevel": dict(bs["byLevel"]),
        "byStatus": dict(bs["byStatus"]),
        "moduleCount": len(bs["byModule"]),
    }

    ctx = {
        "project": bs.get("projectName", "未知项目"),
        "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "reportKind": report_kind,
        "meta": meta,
        "metrics": metrics,
        "conclusion": meta.get("section1_md"),
        "keyIssues": key_issues,
        "coverage": coverage,
        "coverageMapping": mapping,
        "moduleDetail": build_module_detail(bs, mapping),
        "risk": build_risk(bs, bug_context, config),
        "lists": {
            "open": list_open(bs),
            "pending": list_pending(bs),
            "deferred": list_deferred(bs),
            "regfail": regfail_items,
            "active": active_items,
        },
        "bugContext": bug_context,
        "material": material,
        "conflicts": bug_context.get("conflicts", []),
        "config": {
            "thresholds": config["thresholds"],
            "applied": config.get("applied"),
        },
        "_bs": bs,
    }
    return ctx


# ── 校验闸门 ────────────
def validate_report_context(ctx):
    """返回 (errors, warnings)。errors 非空则阻断发布。"""
    errors = []
    warnings = []
    bs = ctx["_bs"]
    m = ctx["metrics"]

    # C1 合计一致
    if sum(m["byLevel"].values()) != m["total"]:
        errors.append(f"C1 级别分布合计({sum(m['byLevel'].values())}) != 总数({m['total']})")
    if sum(m["byStatus"].values()) != m["total"]:
        errors.append(f"C1 状态分布合计({sum(m['byStatus'].values())}) != 总数({m['total']})")

    # C2 唯一归并 + 执行表合计
    cov = ctx["coverage"]
    if cov["mode"] == "full":
        open_sum = sum(int(r[5]) for r in cov["execRows"])
        pend_sum = sum(int(r[6]) for r in cov["execRows"])
        if open_sum != m["open"]:
            errors.append(f"C2 执行表未关闭合计({open_sum}) != bugStats未关闭({m['open']})（疑似重复或漏计）")
        if pend_sum != m["pending"]:
            errors.append(f"C2 执行表待回归合计({pend_sum}) != bugStats待回归({m['pending']})")

    # C3 重点问题可溯源（id 必须在 bugStats 中）
    valid_ids = {str(x["id"]) for x in (ctx["lists"]["open"] + ctx["lists"]["pending"] + ctx["lists"]["deferred"])}
    for g in ctx["keyIssues"]["groups"]:
        for it in g["items"]:
            if str(it["id"]) not in valid_ids:
                errors.append(f"C3 重点问题引用了不存在的缺陷 #{it['id']}（{g['category']}）")

    # C4 级别分布一致（展示级别只来自 bugStats，severity 不得反向污染）
    if m["byLevel"] != bs["byLevel"]:
        errors.append("C4 报告级别分布与 bugStats 不一致（疑似 severity 污染）")

    # 告警级
    for note in cov.get("notices", []):
        warnings.append(f"资料解析：{note}")
    if cov.get("belowThreshold"):
        warnings.append(f"资料覆盖率 {cov.get('ratio')} 低于阈值 {ctx['config']['thresholds']['coverage_min_ratio']}，已并行展示模块明细")
    src = ctx["bugContext"].get("sourceSummary", {})
    if src.get("semantic", 0) == 0:
        warnings.append("缺陷语义持久化产物缺失（bug-semantic/*.jsonl），已降级为禅道 steps / 标题级语义分析")
    tr = ctx["keyIssues"].get("traceableRatio", 0)
    if tr < 1.0:
        warnings.append(f"重点问题业务影响可溯源率 {tr}，不可溯源项已标注「（影响待复核）」")
    if ctx["conflicts"]:
        warnings.append(f"字段冲突 {len(ctx['conflicts'])} 处（展示口径以 bugStats 为准，详见附录）")

    return errors, warnings
