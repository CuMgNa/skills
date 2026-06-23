# -*- coding: utf-8 -*-
"""测试方案辅助资料：解析 1.4.1 全景表 + 禅道模块别名归并（与 bug-stats SKILL 一致）。"""
import re
from html import unescape

# 禅道【模块】前缀 → 测试方案 1.4.1 模块名（一对一）
MODULE_ALIAS = [
    (["账号登录", "账号密码登录"], "🔐 登录与认证"),
    (["账号管理", "一级账号", "用户管理", "用户列表"], "👥 用户与账号体系"),
    (["设备管理", "设备列表", "设备详情", "设备入库"], "📦 设备与分组管理"),
    (["普通通信", "消息管理"], "💬 消息通信"),
    (["救援棒报警"], "🚨 SOS 报警与报平安"),
    (["求救群聊", "iOS求救群聊", "普通群聊"], "🆘 求救群聊"),
    (["套餐商城"], "💰 套餐与扣费"),
    (["电子围栏", "围栏报警记录"], "🗺️ 电子围栏"),
    (["停港逻辑", "WebSocket", "实时推送"], "📡 WebSocket 实时推送"),
    (["消息通知", "公众号通知", "设备订阅", "通知记录"], "🔔 订阅与通知推送"),
    (["控制台", "大屏监控", "关注监控平台"], "监控平台"),
]

_PANORAMA_MARKERS = ("1.4.1", "测试范围全景表", "全景表")


def zentao_module_to_plan(zentao_mod):
    """禅道模块前缀 → 测试方案规范模块名；未命中返回 None。"""
    if not zentao_mod:
        return None
    for prefixes, plan_name in MODULE_ALIAS:
        if zentao_mod in prefixes:
            return plan_name
    best = None
    best_len = 0
    for prefixes, plan_name in MODULE_ALIAS:
        for p in prefixes:
            if zentao_mod.startswith(p) or p.startswith(zentao_mod):
                if len(p) > best_len:
                    best_len = len(p)
                    best = plan_name
    return best


def _clean_cell(text):
    t = unescape(re.sub(r"<[^>]+>", "", text or ""))
    t = re.sub(r"\*\*([^*]+)\*\*", r"\1", t)
    return t.strip()


def _parse_html_table_rows(html):
    rows = []
    for tr in re.finditer(r"<tr[^>]*>(.*?)</tr>", html, re.DOTALL | re.IGNORECASE):
        cells = [_clean_cell(td) for td in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr.group(1), re.DOTALL | re.IGNORECASE)]
        if cells:
            rows.append(cells)
    return rows


def _parse_md_table_rows(text):
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        if re.match(r"^\|[-:\s|]+\|$", line):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if cells:
            rows.append(cells)
    return rows


def parse_panorama_table(text):
    """从测试方案 Markdown/HTML 解析 1.4.1 全景表行。"""
    if not text:
        return [], None

    title = None
    m_title = re.search(r"《([^》]+)》", text)
    if m_title:
        title = m_title.group(1)

    # 定位 1.4.1 区间
    start = 0
    for marker in _PANORAMA_MARKERS:
        idx = text.find(marker)
        if idx >= 0:
            start = idx
            break

    chunk = text[start:]
    table_html = re.search(r"<table[^>]*>(.*?)</table>", chunk, re.DOTALL | re.IGNORECASE)
    if table_html:
        rows = _parse_html_table_rows(table_html.group(0))
    else:
        tr_blocks = re.findall(r"<tr[^>]*>.*?</tr>", chunk, re.DOTALL | re.IGNORECASE)
        if tr_blocks:
            rows = _parse_html_table_rows("<table>" + "".join(tr_blocks) + "</table>")
        else:
            rows = _parse_md_table_rows(chunk)

    header_idx = None
    for i, row in enumerate(rows):
        joined = "".join(row)
        if "测试模块" in joined and ("核心测试" in joined or "优先级" in joined):
            header_idx = i
            break

    if header_idx is None:
        return [], title

    header = rows[header_idx]
    col = {name: idx for idx, name in enumerate(header)}

    def col_idx(*names):
        for n in names:
            for k, idx in col.items():
                if n in k:
                    return idx
        return None

    idx_num = col_idx("#", "序号")
    idx_mod = col_idx("测试模块", "模块")
    idx_core = col_idx("核心测试", "测试方向")
    idx_pri = col_idx("优先级")

    out = []
    for row in rows[header_idx + 1:]:
        if len(row) < 2:
            continue
        mod = row[idx_mod] if idx_mod is not None and idx_mod < len(row) else row[1]
        if not mod or mod in ("测试模块", "模块"):
            continue
        num = row[idx_num] if idx_num is not None and idx_num < len(row) else str(len(out) + 1)
        core = row[idx_core] if idx_core is not None and idx_core < len(row) else ""
        pri = row[idx_pri] if idx_pri is not None and idx_pri < len(row) else ""
        out.append({
            "num": _clean_cell(num),
            "module": _clean_cell(mod),
            "core": _clean_cell(core),
            "priority": _clean_cell(pri),
        })
    return out, title


def aggregate_plan_stats(bs, plan_module):
    """将 byModule 中映射到同一测试方案模块的计数合并。"""
    agg = {"未关闭": 0, "已修复": 0, "延期": 0, "回归不通过": 0}
    for zentao_mod, v in bs.get("byModule", {}).items():
        mapped = zentao_module_to_plan(zentao_mod)
        if mapped == plan_module or (mapped is None and zentao_mod == plan_module):
            for k in agg:
                agg[k] += v.get(k, 0)
    return agg


def module_result_status(v):
    if v["未关闭"] > 0 or v["回归不通过"] > 0:
        return "⚠️ 有未关闭"
    if v["延期"] > 0:
        return "⚠️ 延期"
    if v["已修复"] > 0:
        return "🟡 待回归"
    return "✅ 通过"


def module_remark(v):
    parts = []
    if v["回归不通过"]:
        parts.append(f"回归不通过{v['回归不通过']}")
    if v["延期"]:
        parts.append(f"延期{v['延期']}")
    return "、".join(parts) or "—"


def build_execution_rows(bs, panorama_rows):
    """完整执行表行（8 列）。"""
    plan_modules = {r["module"] for r in panorama_rows}
    rows = []
    used_zentao = set()

    for r in panorama_rows:
        stats = aggregate_plan_stats(bs, r["module"])
        for zentao_mod in bs.get("byModule", {}):
            if zentao_module_to_plan(zentao_mod) == r["module"]:
                used_zentao.add(zentao_mod)
        rows.append([
            r["num"],
            r["module"],
            r["core"],
            r["priority"],
            module_result_status(stats),
            str(stats["未关闭"]),
            str(stats["已修复"]),
            module_remark(stats),
        ])

    # 资料外模块：byModule 有活动但未映射到全景表行
    for zentao_mod, v in bs.get("byModule", {}).items():
        if zentao_mod in used_zentao:
            continue
        mapped = zentao_module_to_plan(zentao_mod)
        if mapped and mapped in plan_modules:
            continue
        if not any(v.get(k, 0) for k in ("未关闭", "已修复", "延期", "回归不通过")):
            continue
        remark = module_remark(v)
        if remark == "—":
            remark = "资料外模块"
        else:
            remark = remark + "、资料外模块"
        rows.append([
            "—",
            zentao_mod,
            "—",
            "—",
            module_result_status(v),
            str(v["未关闭"]),
            str(v["已修复"]),
            remark,
        ])
    return rows


def build_simplified_rows(bs):
    """精简执行表行（5 列）。"""
    rows = []
    for mod, v in bs.get("byModule", {}).items():
        if not any(v.get(k, 0) for k in ("未关闭", "已修复", "延期", "回归不通过")):
            continue
        rows.append([
            mod,
            module_result_status(v),
            str(v["未关闭"]),
            str(v["已修复"]),
            module_remark(v),
        ])
    return rows


def load_material_file(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def fetch_material_page(notion_client, page_id):
    """拉取 Notion 页文本（段落 + 表格单元），供全景表解析。"""
    parts = []

    def rich_text(block):
        key = block.get("type", "")
        data = block.get(key, {})
        texts = data.get("rich_text", []) or data.get("text", [])
        return "".join(t.get("plain_text", "") for t in texts)

    def walk(block_id, depth=0):
        cursor = None
        while True:
            path = f"blocks/{block_id}/children?page_size=100"
            if cursor:
                path += f"&start_cursor={cursor}"
            data = notion_client._request("GET", path)
            for blk in data.get("results", []):
                btype = blk.get("type", "")
                if btype in ("paragraph", "heading_1", "heading_2", "heading_3", "quote"):
                    t = rich_text(blk)
                    if t:
                        parts.append(t)
                elif btype == "table":
                    parts.append("<table>")
                    row_cursor = None
                    while True:
                        rpath = f"blocks/{blk['id']}/children?page_size=100"
                        if row_cursor:
                            rpath += f"&start_cursor={row_cursor}"
                        rdata = notion_client._request("GET", rpath)
                        for row_blk in rdata.get("results", []):
                            if row_blk.get("type") == "table_row":
                                cells = row_blk.get("table_row", {}).get("cells", [])
                                cell_texts = []
                                for cell in cells:
                                    cell_texts.append(
                                        "".join(t.get("plain_text", "") for t in cell)
                                    )
                                parts.append("<tr>" + "".join(f"<td>{c}</td>" for c in cell_texts) + "</tr>")
                        if not rdata.get("has_more"):
                            break
                        row_cursor = rdata.get("next_cursor")
                    parts.append("</table>")
                elif blk.get("has_children"):
                    walk(blk["id"], depth + 1)
            if not data.get("has_more"):
                break
            cursor = data.get("next_cursor")

    walk(page_id)
    return "\n".join(parts)
