# -*- coding: utf-8 -*-
"""BugSemanticContext：缺陷语义整合层。

两来源（按 report_config.FIELD_SOURCE_PRIORITY 的语义字段优先级 reconcile）：
  1. semantic —— bug-report-and-create 持久化产物 mcp/output/bug-semantic/*.jsonl（最权威）
  2. title    —— bugStats 标题（兜底）

强不变量：
  - 展示级别 / 状态 / 模块 **只来自 bugStats**，severity 仅作语义参考，绝不反写展示数字。
  - 不可整合的字段冲突记录到 conflicts，但展示口径以 bugStats 为准。

性能与成本：规则解析优先；预留 enrich_with_llm（默认关闭）+ 文件缓存接口。
"""
import json
from pathlib import Path

try:
    import report_config
except ImportError:
    from . import report_config  # type: ignore


# ── 持久化产物加载 ────────────
def load_persisted_semantics(semantic_dir, project_key=None):
    """读取 mcp/output/bug-semantic/ 下所有 jsonl，返回 {bugId(str): record}。

    project_key 给定时只取文件名包含该 key 的文件；后写覆盖先写（同 id 取最新）。
    """
    d = Path(semantic_dir)
    if not d.is_dir():
        return {}
    out = {}
    files = sorted(d.glob("*.jsonl"), key=lambda p: p.stat().st_mtime)
    for f in files:
        if project_key and project_key not in f.name:
            continue
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            bug_id = str(rec.get("bugId") or rec.get("id") or "").strip()
            if bug_id:
                out[bug_id] = rec
    return out


# ── impactSignals（启发式多标签，用于重点问题/风险，不参与范围合计） ────────────
def compute_impact_signals(text, config):
    signals = []
    for sig in config["impactSignals"]:
        matched = [kw for kw in sig["keywords"] if kw in (text or "")]
        if matched:
            signals.append({
                "label": sig["label"],
                "phrase": sig["phrase"],
                "weight": sig["weight"],
                "matched": matched,
            })
    signals.sort(key=lambda s: -s["weight"])
    return signals


# ── 字段级 reconcile ────────────
def _reconcile_field(field, candidates, priority):
    """candidates: {source: value}。按 priority 取第一个非空值；冲突记录。"""
    chosen = None
    chosen_source = None
    for src in priority:
        v = candidates.get(src)
        if v:
            chosen = v
            chosen_source = src
            break
    conflict = None
    nonempty = {s: v for s, v in candidates.items() if v}
    if len(nonempty) > 1 and len({str(v) for v in nonempty.values()}) > 1:
        conflict = {"field": field, "chosen": chosen, "chosenSource": chosen_source,
                    "candidates": nonempty}
    return chosen, conflict


def _bug_iter(bs):
    """合并未关闭 + 待回归 + 延期，去重（同 id 取首个）。"""
    lists = bs.get("lists") or {}
    open_l = lists.get("open", bs.get("未关闭列表", []))
    pend_l = lists.get("pendingRegression", bs.get("待回归列表", []))
    defer_l = lists.get("deferred", bs.get("已延期列表", []))
    seen = set()
    for item in list(open_l) + list(pend_l) + list(defer_l):
        bid = str(item.get("id"))
        if bid in seen:
            continue
        seen.add(bid)
        yield item


def build_bug_semantic_context(bs, persisted=None, config=None):
    """构建 BugSemanticContext。

    persisted: {bugId: record}（结构化语义持久化产物）
    返回：
      {"bugs": [bugSemantic...], "conflicts": [...], "sourceSummary": {...}}
    """
    config = config or report_config.get_config()
    persisted = persisted or {}
    priority = config["fieldSourcePriority"]
    sev_map = config["severityToLevel"]

    bugs = []
    all_conflicts = []
    source_summary = {"semantic": 0, "title": 0}

    for item in _bug_iter(bs):
        bid = str(item.get("id"))
        # 展示口径：只认 bugStats
        level = item.get("级别")
        status = item.get("状态")
        module = item.get("模块")
        title = item.get("标题", "")

        rec = persisted.get(bid, {})

        # 来源标签
        if rec:
            source = "semantic"
        else:
            source = "title"
        source_summary[source] += 1

        # 语义字段 reconcile（semantic > title）
        sem_fields = {}
        bug_conflicts = []
        for field in ("preconditions", "steps", "actual", "expected", "rootProblem", "userImpact"):
            candidates = {
                "semantic": rec.get(field),
                "title": None,  # 标题不直接填这些结构字段
            }
            chosen, conflict = _reconcile_field(field, candidates, priority.get(field, ["semantic", "title"]))
            if chosen:
                sem_fields[field] = chosen
            if conflict:
                conflict["bugId"] = bid
                bug_conflicts.append(conflict)

        # severity（仅参考，记录与 bugStats 级别是否冲突，但不改展示级别）
        severity = rec.get("severity")
        severity_level = sev_map.get(severity) if severity in sev_map else None
        if severity_level and level and severity_level != level:
            all_conflicts.append({
                "bugId": bid, "field": "level",
                "display": level, "severityImplies": severity_level,
                "note": "展示级别以 bugStats 为准，severity 仅参考",
            })

        # impactSignals：标题 + 语义字段全文
        blob = " ".join([title] + [v for v in sem_fields.values() if isinstance(v, str)])
        signals = compute_impact_signals(blob, config)

        # 业务影响可溯源判定
        user_impact = sem_fields.get("userImpact")
        impact_traceable = bool(rec.get("userImpact") or rec.get("evidenceRef"))

        bugs.append({
            "id": bid,
            "level": level,
            "status": status,
            "module": module,
            "title": title,
            "severity": severity,
            "severityLevel": severity_level,
            "preconditions": sem_fields.get("preconditions"),
            "steps": sem_fields.get("steps"),
            "actual": sem_fields.get("actual"),
            "expected": sem_fields.get("expected"),
            "rootProblem": sem_fields.get("rootProblem"),
            "userImpact": user_impact,
            "impactTraceable": impact_traceable,
            "impactSignals": signals,
            "evidenceRef": rec.get("evidenceRef") or f"zentao#{bid}",
            "source": source,
            "sourceConfidence": {"semantic": "high", "title": "low"}[source],
            "conflicts": bug_conflicts,
        })
        all_conflicts.extend(bug_conflicts)

    return {
        "bugs": bugs,
        "conflicts": all_conflicts,
        "sourceSummary": source_summary,
    }


# ── LLM 回退 hook（默认关闭）+ 缓存 ────────────
def _cache_load(cache_path):
    p = Path(cache_path)
    if p.is_file():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def _cache_save(cache_path, data):
    p = Path(cache_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def enrich_with_llm(bug_context, enabled=False, cache_path=None, llm_fn=None):
    """可插拔 LLM 语义增强（默认关闭）。

    设计：当本地规则解析（steps/title）不足以给出 rootProblem/userImpact 时，
    可调用 llm_fn(bug) 补全；结果按 bugId 缓存到 cache_path，避免重复花费 token。
    本环境未接线 LLM，enabled=False 时原样返回（仅保证接口稳定、可被未来接入）。
    """
    if not enabled or llm_fn is None:
        return bug_context
    cache = _cache_load(cache_path) if cache_path else {}
    for bug in bug_context["bugs"]:
        if bug.get("rootProblem") and bug.get("userImpact"):
            continue
        bid = bug["id"]
        if bid in cache:
            enriched = cache[bid]
        else:
            enriched = llm_fn(bug) or {}
            cache[bid] = enriched
        for k in ("rootProblem", "userImpact"):
            if not bug.get(k) and enriched.get(k):
                bug[k] = enriched[k]
                bug["impactTraceable"] = bug["impactTraceable"] or bool(enriched.get("userImpact"))
    if cache_path:
        _cache_save(cache_path, cache)
    return bug_context
