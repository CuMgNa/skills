# -*- coding: utf-8 -*-
"""bugStats 单一统计事实源（通用版）

输入：zentao-bugs-summary.mjs 输出的 JSON（{meta, total, bugs:[...]}）
输出：{项目}-bugstats-{日期}.json
特性：
  1. 通用化——不再硬编码项目名/路径，从 --input 推导
  2. 口径统一——「未解决」严格 = active+confirmed（延期单列，绝不混入）
  3. 数字自校验——C3/C4/C5/C6 内部一致性，任一不过即非零退出（硬阻断）

用法：
  python bugstats.py --input "mcp/output/xxx-bugs-20260623-....json"
  python bugstats.py --input xxx.json --out mcp/output/xxx-bugstats.json
"""
import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PRI_LABEL = {1: "一级", 2: "二级", 3: "三级", 4: "四级"}


def pri_label(pri):
    return PRI_LABEL.get(int(pri) if str(pri).isdigit() else pri, f"未知({pri})")


def extract_module(title):
    m = re.match(r"【(.+?)】", title or "")
    return m.group(1) if m else "未分类"


def build_stats(data):
    bugs = data.get("bugs", [])
    project_name = (data.get("meta") or {}).get("projectName", "未知项目")

    stats = {
        "projectName": project_name,
        "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total": len(bugs),
        "byLevel": {"一级": 0, "二级": 0, "三级": 0, "四级": 0},
        "byStatus": {"未解决": 0, "已修复待回归": 0, "已延期": 0, "已关闭": 0},
        "回归不通过": 0,
        "未解决列表": [],   # active + confirmed
        "待回归列表": [],   # resolved
        "已延期列表": [],   # postponed
        "byModule": {},
    }

    def ensure_module(mod):
        if mod not in stats["byModule"]:
            stats["byModule"][mod] = {"未解决": 0, "已修复": 0, "延期": 0, "回归不通过": 0}

    for b in bugs:
        status = b.get("status", "")
        level = pri_label(b.get("pri", 3))
        title = b.get("title", "")
        module = extract_module(title)
        ensure_module(module)

        if level in stats["byLevel"]:
            stats["byLevel"][level] += 1

        if status in ("active", "confirmed"):
            stats["byStatus"]["未解决"] += 1
            stats["byModule"][module]["未解决"] += 1
            is_reg_fail = status == "confirmed"
            if is_reg_fail:
                stats["回归不通过"] += 1
                stats["byModule"][module]["回归不通过"] += 1
            stats["未解决列表"].append({
                "id": str(b.get("id")),
                "级别": level,
                "模块": module,
                "标题": title,
                "状态": "激活-已确认（回归不通过）" if is_reg_fail else "激活-待确认",
            })
        elif status == "resolved":
            stats["byStatus"]["已修复待回归"] += 1
            stats["byModule"][module]["已修复"] += 1
            stats["待回归列表"].append({
                "id": str(b.get("id")), "级别": level, "模块": module,
                "标题": title, "状态": "已解决",
            })
        elif status == "postponed":
            stats["byStatus"]["已延期"] += 1
            stats["byModule"][module]["延期"] += 1
            stats["已延期列表"].append({
                "id": str(b.get("id")), "级别": level, "模块": module,
                "标题": title, "状态": "已延期",
            })
        elif status == "closed":
            stats["byStatus"]["已关闭"] += 1

    # 便于第一节叙述：遗留合计 = 未解决 + 已延期（不改变「未解决」口径）
    stats["遗留合计"] = stats["byStatus"]["未解决"] + stats["byStatus"]["已延期"]
    return stats


def self_validate(s):
    """数字内部一致性自校验（C3/C4/C5/C6 数字部分）。返回 (ok, errors)。"""
    errors = []
    # C3: byLevel 合计 == total
    if sum(s["byLevel"].values()) != s["total"]:
        errors.append(f"C3 byLevel合计({sum(s['byLevel'].values())}) != total({s['total']})")
    # C4: byStatus 各项之和 == total
    status_sum = sum(s["byStatus"].values())
    if status_sum != s["total"]:
        errors.append(f"C4 byStatus合计({status_sum}) != total({s['total']})")
    # C2/C5: 列表长度 == 对应状态计数
    if len(s["未解决列表"]) != s["byStatus"]["未解决"]:
        errors.append(f"未解决列表({len(s['未解决列表'])}) != byStatus.未解决({s['byStatus']['未解决']})")
    if len(s["待回归列表"]) != s["byStatus"]["已修复待回归"]:
        errors.append(f"待回归列表({len(s['待回归列表'])}) != byStatus.已修复待回归({s['byStatus']['已修复待回归']})")
    if len(s["已延期列表"]) != s["byStatus"]["已延期"]:
        errors.append(f"已延期列表({len(s['已延期列表'])}) != byStatus.已延期({s['byStatus']['已延期']})")
    # C6: byModule 未解决之和 == byStatus.未解决
    module_unresolved = sum(m["未解决"] for m in s["byModule"].values())
    if module_unresolved != s["byStatus"]["未解决"]:
        errors.append(f"C6 byModule未解决合计({module_unresolved}) != byStatus.未解决({s['byStatus']['未解决']})")
    # 回归不通过一致性
    module_regfail = sum(m["回归不通过"] for m in s["byModule"].values())
    if module_regfail != s["回归不通过"]:
        errors.append(f"byModule回归不通过合计({module_regfail}) != 回归不通过({s['回归不通过']})")
    return (len(errors) == 0, errors)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="zentao-bugs-summary 输出的 JSON 路径")
    ap.add_argument("--out", help="bugstats 输出路径，默认与输入同目录、bugs→bugstats")
    args = ap.parse_args()

    in_path = Path(args.input)
    if not in_path.exists():
        print(f"[ERROR] 输入文件不存在: {in_path}", file=sys.stderr)
        sys.exit(2)

    with open(in_path, encoding="utf-8") as f:
        data = json.load(f)

    stats = build_stats(data)

    if args.out:
        out_path = Path(args.out)
    else:
        # xxx-bugs-20260623-....json → xxx-bugstats-20260623.json
        ymd = datetime.now().strftime("%Y%m%d")
        base = stats["projectName"].replace("/", " ").replace("\\", " ")
        out_path = in_path.parent / f"{base}-bugstats-{ymd}.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    ok, errors = self_validate(stats)
    print(f"项目: {stats['projectName']}")
    print(f"总数: {stats['total']} | 未解决: {stats['byStatus']['未解决']}（回归不通过 {stats['回归不通过']}）"
          f" | 待回归: {stats['byStatus']['已修复待回归']} | 已延期: {stats['byStatus']['已延期']} | 已关闭: {stats['byStatus']['已关闭']}")
    print(f"按级别: {stats['byLevel']}")
    print(f"输出: {out_path}")

    if ok:
        print("[VALIDATE] 数字自校验通过 ✅")
        sys.exit(0)
    else:
        print("[VALIDATE] 数字自校验失败 ❌（硬阻断，请勿据此发布）:", file=sys.stderr)
        for e in errors:
            print("  - " + e, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
