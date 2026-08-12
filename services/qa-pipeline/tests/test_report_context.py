# -*- coding: utf-8 -*-
"""闸门权威定义锁：把 qa-agent-report-publish「校验闸门（C1-C10 / C1'-C_conclusion）」的
判定规则逐条写成断言。修改 SKILL.md 闸门表必须同步改代码并跑本测试，杜绝文档与代码漂移。

运行：
    cd services/qa-pipeline
    python -m pytest tests/test_report_context.py -v
或直接：
    python tests/test_report_context.py
"""
import os
import sys
from pathlib import Path

# 让测试可独立运行：把 reporting/lib 加到 sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "reporting" / "lib"))

import report_context as rc  # noqa: E402


# ── 最小 bugStats 工厂 ─────────────────────────────────────────────
def _bs(level_counts=None, open_count=None, pending_count=None,
        deferred_count=0, closed_count=0, regfail=0):
    """构造一份自洽的 bugStats。默认 5 条：2 未关闭（1 个二级高优、1 个三级）+ 2 待回归 + 1 已延期。
    byLevel/byStatus 合计 == total，满足 C1（非 bugStats 自校验，而是回读一致性）。
    """
    level_counts = level_counts or {"一级": 0, "二级": 1, "三级": 2, "四级": 1}
    open_count = 2 if open_count is None else open_count
    pending_count = 2 if pending_count is None else pending_count
    total = open_count + pending_count + deferred_count + closed_count
    return {
        "projectName": "测试项目",
        "total": total,
        "byLevel": level_counts,
        "byStatus": {
            "未关闭": open_count,
            "已修复待回归": pending_count,
            "已延期": deferred_count,
            "已关闭": closed_count,
        },
        "回归不通过": regfail,
        "未关闭列表": [
            {"id": str(1000 + i), "级别": lvl, "模块": "电子围栏",
             "标题": f"【电子围栏】测试缺陷{i}", "状态": "激活-待确认"}
            for i, lvl in enumerate(
                ["二级"] * (level_counts.get("二级", 0)) +
                ["三级"] * max(open_count - level_counts.get("二级", 0), 0)
            )
        ][:open_count],
        "待回归列表": [
            {"id": str(2000 + i), "级别": "三级", "模块": "电子围栏",
             "标题": f"【电子围栏】已解决缺陷{i}", "状态": "已解决"}
            for i in range(pending_count)
        ],
        "已延期列表": [
            {"id": str(3000 + i), "级别": "四级", "模块": "电子围栏",
             "标题": f"【电子围栏】延期缺陷{i}", "状态": "已延期"}
            for i in range(deferred_count)
        ],
        "byModule": {
            "电子围栏": {
                "未关闭": open_count, "已修复": pending_count,
                "延期": deferred_count, "回归不通过": regfail,
            },
        },
    }


def _build_ctx(bs, config=None):
    """用默认空资料 + 默认语义上下文构建 ReportContext（走精简执行表路径）。"""
    return rc.build_report_context(bs, config=config)


# ── C3 重点问题引用缺陷 ID 必须存在于 bugStats ───────────────────
def test_C3_key_issue_unknown_id_errors():
    """C3：重点问题引用的缺陷 ID 不在 bugStats 列表中必须 error。"""
    bs = _bs()
    ctx = _build_ctx(bs)
    # 注入一个不存在的 ID 到 keyIssues
    ctx["keyIssues"]["groups"][0]["items"].append({
        "id": 999999, "title": "【幻影】不存在的缺陷", "level": "二级",
    })
    errors, _ = rc.validate_report_context(ctx)
    assert any("C3" in e and "999999" in e for e in errors), \
        f"C3 未知缺陷 ID 应报错，实际 errors={errors}"


# ── C_conclusion 结论结构闸门 ────────────────────────────────────
def test_C_conclusion_missing_high_priority_errors():
    """C_conclusion：有未关闭缺陷时结论必须含「高优问题（二级及以上）」。"""
    bs = _bs(open_count=3, level_counts={"一级": 0, "二级": 1, "三级": 2, "四级": 0})
    ctx = _build_ctx(bs)
    ctx["conclusion"] = "本轮测试完成，仍有 3 个未解决缺陷。"  # 缺关键短语
    errors, _ = rc.validate_report_context(ctx)
    assert any("C_conclusion" in e and "高优问题" in e for e in errors), \
        f"C_conclusion 缺高优问题点名应报错，实际 errors={errors}"


def test_C_conclusion_missing_direction_errors():
    """C_conclusion：有未关闭缺陷时结论必须含业务方向分组（【...】）。"""
    bs = _bs(open_count=2)
    ctx = _build_ctx(bs)
    ctx["conclusion"] = "本轮测试完成，其中 1 个高优问题（二级及以上）需优先修复。"  # 缺【方向】
    errors, _ = rc.validate_report_context(ctx)
    assert any("C_conclusion" in e and "业务方向分组" in e for e in errors), \
        f"C_conclusion 缺业务方向分组应报错，实际 errors={errors}"


def test_C_conclusion_zero_open_skipped():
    """C_conclusion：无未关闭缺陷时不强制结论结构（m['open']==0 跳过）。"""
    bs = _bs(open_count=0, pending_count=2,
             level_counts={"一级": 0, "二级": 0, "三级": 2, "四级": 0})
    ctx = _build_ctx(bs)
    ctx["conclusion"] = "本轮无遗留未解决缺陷。"
    errors, _ = rc.validate_report_context(ctx)
    assert not any("C_conclusion" in e for e in errors), \
        f"无未关闭缺陷不应触发 C_conclusion，实际 errors={errors}"


# ── C2 精简表合计校验（扩展覆盖，堵住无资料模式的漏洞）────────
def test_C2_simplified_open_mismatch_errors():
    """C2：精简表模式下，simpleRows 未关闭合计 != bugStats 未关闭数必须 error。
    这是无测试资料场景的关键防线——之前 C2 只在 full 模式跑，精简表完全不校验。"""
    bs = _bs(open_count=2, pending_count=2,
             level_counts={"一级": 0, "二级": 1, "三级": 2, "四级": 1})
    ctx = _build_ctx(bs)
    # 确认是精简表模式
    assert ctx["coverage"]["mode"] == "simplified", "默认无资料应为精简表模式"
    # 篡改 simpleRows：把第一行的未关闭数从 2 改成 9（制造合计虚高）
    rows = ctx["coverage"]["simpleRows"]
    assert len(rows) >= 1, "精简表应至少 1 行"
    rows[0][2] = "9"  # 第 3 列 = 未关闭
    errors, _ = rc.validate_report_context(ctx)
    assert any("C2" in e and "未关闭" in e for e in errors), \
        f"精简表未关闭合计不一致应报 C2 错误，实际 errors={errors}"


def test_C2_simplified_pending_mismatch_errors():
    """C2：精简表模式下，simpleRows 待回归合计 != bugStats 待回归数必须 error。"""
    bs = _bs(open_count=2, pending_count=2,
             level_counts={"一级": 0, "二级": 1, "三级": 2, "四级": 1})
    ctx = _build_ctx(bs)
    rows = ctx["coverage"]["simpleRows"]
    rows[0][3] = "99"  # 第 4 列 = 已修复（待回归）
    errors, _ = rc.validate_report_context(ctx)
    assert any("C2" in e and "待回归" in e for e in errors), \
        f"精简表待回归合计不一致应报 C2 错误，实际 errors={errors}"


def test_C2_simplified_consistent_no_error():
    """C2：精简表模式下，未篡改的 simpleRows 合计正确时不报 C2。"""
    bs = _bs(open_count=2, pending_count=2,
             level_counts={"一级": 0, "二级": 1, "三级": 2, "四级": 1})
    ctx = _build_ctx(bs)
    errors, _ = rc.validate_report_context(ctx)
    assert not any("C2" in e for e in errors), \
        f"精简表合计一致不应报 C2，实际 errors={errors}"


# ── 模块归并失效告警（堵别名表/资料模块名不一致的静默失败）──────
def _ctx_with_material(bs, coverage_areas, has_full=True):
    """构造一个带自定义 coverageAreas 的 ReportContext，让 assign_modules 真正跑起来。"""
    material = {
        "coverageAreas": coverage_areas,
        "hasFullTable": has_full,
        "docType": "test_plan",
        "confidence": 0.8,
        "title": "测试方案",
        "parseNotices": [],
    }
    return rc.build_report_context(bs, material=material)


def test_module_merge_partial_miss_warns():
    """部分禅道模块未命中资料模块时，应产生归并失效告警。"""
    bs = _bs()
    # 资料里只有"电子围栏"，禅道里的"电子围栏"能命中，但再加一个"幽灵模块"命中不了
    bs["byModule"]["幽灵模块"] = {"未关闭": 1, "已修复": 0, "延期": 0, "回归不通过": 0}
    ctx = _ctx_with_material(bs, coverage_areas=[
        {"num": "1", "module": "电子围栏", "core": "围栏", "priority": "P1"},
    ])
    errors, warnings = rc.validate_report_context(ctx)
    assert not any("归并失效" in e for e in errors), "未命中应只告警不阻断"
    assert any("归并失效" in w and "幽灵模块" in w for w in warnings), \
        f"未命中的「幽灵模块」应出现在归并失效告警里，实际 warnings={warnings}"


def test_module_merge_all_hit_no_warn():
    """全部禅道模块命中资料模块时，不应有归并失效告警。"""
    bs = _bs()
    ctx = _ctx_with_material(bs, coverage_areas=[
        {"num": "1", "module": "电子围栏", "core": "围栏", "priority": "P1"},
    ])
    _, warnings = rc.validate_report_context(ctx)
    assert not any("归并失效" in w for w in warnings), \
        f"全部命中不应有归并失效告警，实际 warnings={warnings}"


def test_module_merge_all_miss_warns():
    """全部禅道模块都未命中时，告警应包含百分比和模块名。"""
    bs = _bs()
    ctx = _ctx_with_material(bs, coverage_areas=[
        {"num": "1", "module": "完全不相关的模块", "core": "x", "priority": "P1"},
    ])
    _, warnings = rc.validate_report_context(ctx)
    hit = [w for w in warnings if "归并失效" in w]
    assert hit, f"全未命中应产生归并失效告警，实际 warnings={warnings}"
    assert "100.0%" in hit[0], f"告警应含 100.0% 百分比，实际={hit[0]}"
    assert "电子围栏" in hit[0], f"告警应含未命中模块名，实际={hit[0]}"


# ── 自洽基线：不篡改的 bugStats 不应产生 errors ─────────────────
def test_clean_baseline_no_errors():
    """自洽的默认 bugStats 通过全部闸门（0 errors）。这是回归基线。"""
    bs = _bs()
    ctx = _build_ctx(bs)
    errors, _ = rc.validate_report_context(ctx)
    assert errors == [], f"自洽基线不应有阻断级错误，实际 errors={errors}"


if __name__ == "__main__":
    # 无 pytest 时也能跑：手动执行所有 test_ 函数
    mod = sys.modules[__name__]
    fns = [getattr(mod, n) for n in dir(mod) if n.startswith("test_")]
    failed = 0
    for fn in fns:
        try:
            fn()
            print(f"[PASS] {fn.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"[FAIL] {fn.__name__}: {e}")
    print(f"\n{len(fns) - failed}/{len(fns)} passed")
    sys.exit(1 if failed else 0)
