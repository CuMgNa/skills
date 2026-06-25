# -*- coding: utf-8 -*-
"""辅助资料解析层 → MaterialContext（健壮化、可多资料合并）。

替代旧 test_plan_material 的"写死 1.4.1 全景表"实现。用户上传的辅助资料可能是：
  - 标准《测试方案》→ 1.4.1 / 2.1 测试范围全景表
  - 《二期逻辑大纲》/《PRD》→ 范围表 / 模块清单 / 功能清单 / 用例矩阵
  - 《测试计划》→ 范围全景表 / 测试范围表 / 阶段任务表
  - 任意含「测试模块 / 核心测试点 / 优先级」列的表格
  - 完全没有表格的自由文本（降级，不崩）

解析策略：
  1. 资料类型识别（material_kind）：按标题/正文关键词判定
  2. 多级锚点扫描：强锚点（章节号 1.4.1 / 2.1）+ 弱锚点（"全景表"/"范围表"/"清单"/"矩阵"）
  3. 表头同义词匹配：核心测试点 ↔ 测试方向 ↔ 测试范围 ↔ 测试点
  4. 失败软降级：返回 reason，让上层明确告知用户

对外主入口：
  build_material_context(sources, config) -> MaterialContext(dict)
    sources: [{"text": str, "source": str}]
  parse_panorama_table(text) -> (rows, title, kind, reason)   # 兼容旧签名
"""
import re
from html import unescape

try:
    import report_config
except ImportError:  # 允许被包内/包外两种方式 import
    from . import report_config  # type: ignore


# 锚点分级：strong 优先匹配，weak 兜底
_STRONG_MARKERS = [
    re.compile(r"1\.4\.1"),
    re.compile(r"2[、.．]\s*1[.]?\s*范围"),
    re.compile(r"范围全景表"),
    re.compile(r"测试范围全景表"),
    re.compile(r"测试范围\s*表"),
    re.compile(r"全景\s*表"),
]

_WEAK_MARKERS = [
    re.compile(r"测试方案"),
    re.compile(r"测试计划"),
    re.compile(r"测试大纲"),
    re.compile(r"逻辑大纲"),
    re.compile(r"功能清单"),
    re.compile(r"模块清单"),
    re.compile(r"用例矩阵"),
    re.compile(r"测试矩阵"),
]

# 表头同义词（列名包含以下任一即视为匹配）
_HEADER_ALIAS = {
    "num":      ["#", "序号", "num"],
    "module":   ["测试模块", "模块", "功能模块", "测试项", "功能项", "场景"],
    "core":     ["核心测试点", "测试点", "测试方向", "测试范围", "核心功能", "测试内容", "关注点", "覆盖范围"],
    "priority": ["优先级", "P0", "P 级", "P级"],
}

PARSE_REASON_HINT = {
    "ok":              "完整执行表（已匹配测试方案 1.4.1 / 范围全景表）",
    "weak_marker":     "完整执行表（弱锚点匹配：未命中标准章节号，已就近解析含「测试模块/核心测试点」的表格）",
    "no_text":         "精简执行表（辅助资料为空）",
    "no_marker":       "精简执行表（辅助资料未识别为测试方案/计划/大纲，无可解析表格）",
    "no_table":        "精简执行表（辅助资料已识别类型，但未找到任何表格）",
    "no_header":       "精简执行表（已找到表格，但表头缺少「测试模块」等必备列）",
    "no_header_or_empty": "精简执行表（锚点附近表格无有效数据行）",
}


def detect_material_kind(text):
    if not text:
        return "unknown"
    head = text[:400]
    if re.search(r"测试计划", head):
        return "test_plan"
    if re.search(r"测试方案", head):
        return "test_plan"
    if re.search(r"测试大纲|逻辑大纲|二期.*大纲", head):
        return "logic_outline"
    if re.search(r"PRD|需求文档|产品需求", head):
        return "prd"
    return "unknown"


def _module_alias(config=None):
    if config and config.get("moduleAlias"):
        return config["moduleAlias"]
    return report_config.DEFAULT_MODULE_ALIAS


def zentao_module_to_plan(zentao_mod, config=None):
    """禅道模块前缀 → 测试方案规范模块名；未命中返回 None。"""
    if not zentao_mod:
        return None
    alias = _module_alias(config)
    for prefixes, plan_name in alias:
        if zentao_mod in prefixes:
            return plan_name
    best = None
    best_len = 0
    for prefixes, plan_name in alias:
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
        cells = [_clean_cell(td) for td in re.findall(
            r"<t[dh][^>]*>(.*?)</t[dh]>", tr.group(1), re.DOTALL | re.IGNORECASE)]
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


def _extract_all_tables(text):
    """从全文抽取所有 HTML / Markdown 表格，按出现顺序返回。"""
    tables = []
    for m in re.finditer(r"<table[^>]*>(.*?)</table>", text, re.DOTALL | re.IGNORECASE):
        tables.append(("html", m.start(), m.group(0)))
    for m in re.finditer(r"(?:^|\n)(\|[^\n]+\|(?:\n\|[^\n]+\|)+)", text):
        tables.append(("md", m.start(), m.group(1)))
    tables.sort(key=lambda t: t[1])
    return tables


def _match_header(header_row):
    col = {}
    for key, aliases in _HEADER_ALIAS.items():
        for alias in aliases:
            for idx, cell in enumerate(header_row):
                if alias in cell:
                    col[key] = idx
                    break
            if key in col:
                break
    if "module" not in col:
        return None
    return col


def _looks_like_data_row(row, module_col_idx):
    if module_col_idx >= len(row):
        return False
    mod = row[module_col_idx].strip()
    if not mod or mod in ("测试模块", "模块", "—", "-"):
        return False
    if mod in ("P0", "P1", "P2", "P3", "通过", "缺陷遗留", "不通过"):
        return False
    return True


def _try_parse_table_rows(table_body, is_html):
    rows = _parse_html_table_rows(table_body) if is_html else _parse_md_table_rows(table_body)
    header_idx = None
    header = None
    for i, row in enumerate(rows):
        if _match_header(row):
            header_idx = i
            header = _match_header(row)
            break
    if header_idx is None:
        return None

    idx_num = header.get("num")
    idx_mod = header["module"]
    idx_core = header.get("core")
    idx_pri = header.get("priority")

    out = []
    for row in rows[header_idx + 1:]:
        if not _looks_like_data_row(row, idx_mod):
            continue
        mod = row[idx_mod]
        num = row[idx_num] if idx_num is not None and idx_num < len(row) else str(len(out) + 1)
        core = row[idx_core] if idx_core is not None and idx_core < len(row) else "—"
        pri = row[idx_pri] if idx_pri is not None and idx_pri < len(row) else "—"
        out.append({
            "num": _clean_cell(num) or str(len(out) + 1),
            "module": _clean_cell(mod),
            "core": _clean_cell(core) or "—",
            "priority": _clean_cell(pri) or "—",
        })
    return out


def parse_panorama_table(text):
    """解析单份资料的测试范围表 → (rows, title, material_kind, parse_reason)。"""
    if not text or not text.strip():
        return [], None, "unknown", "no_text"

    title = None
    m_title = re.search(r"《([^》]+)》", text)
    if m_title:
        title = m_title.group(1)

    kind = detect_material_kind(text)

    # 第一遍：强锚点扫描
    for marker in _STRONG_MARKERS:
        m = marker.search(text)
        if not m:
            continue
        chunk = text[m.end():]
        for tkind, _pos, body in _extract_all_tables(chunk):
            rows = _try_parse_table_rows(body, tkind == "html")
            if rows:
                return rows, title, kind, "ok"

    # 第二遍：弱锚点扫描
    weak_hit = any(m.search(text) for m in _WEAK_MARKERS)
    tables = _extract_all_tables(text)
    if weak_hit:
        for tkind, _pos, body in tables:
            rows = _try_parse_table_rows(body, tkind == "html")
            if rows:
                return rows, title, kind, "weak_marker"
        if tables:
            return [], title, kind, "no_header"
        return [], title, kind, "no_table"

    # 第三遍：兜底全文扫描
    if tables:
        for tkind, _pos, body in tables:
            rows = _try_parse_table_rows(body, tkind == "html")
            if rows:
                return rows, title, kind, "weak_marker"

    if kind != "unknown":
        return [], title, kind, "no_table"
    return [], title, "unknown", "no_marker"


def render_parse_notice(reason):
    return PARSE_REASON_HINT.get(reason, f"精简执行表（解析原因：{reason}）")


# ── 解析原因 → 置信度（用于 docType/版式分支） ────────────
_REASON_CONFIDENCE = {
    "ok": 0.95,
    "weak_marker": 0.7,
    "no_header_or_empty": 0.4,
    "no_header": 0.35,
    "no_table": 0.3,
    "no_marker": 0.2,
    "no_text": 0.0,
}


def build_material_context(sources, config=None):
    """合并多份资料 → MaterialContext。

    sources: [{"text": str, "source": str}]
    返回 dict：
      {
        "sources": [{source, kind, title, reason, rowCount, confidence}],
        "docType": 主导类型,
        "confidence": 最高置信度,
        "coverageAreas": [{num, module, core, priority}]（去重合并）,
        "parseNotices": [str],
        "hasFullTable": bool,
        "title": 首个有效标题,
      }
    """
    sources = [s for s in (sources or []) if s and s.get("text")]
    parsed = []
    merged_rows = []
    seen_modules = set()
    notices = []
    best_conf = 0.0
    best_title = None
    doc_type = "unknown"

    for s in sources:
        rows, title, kind, reason = parse_panorama_table(s["text"])
        conf = _REASON_CONFIDENCE.get(reason, 0.2)
        parsed.append({
            "source": s.get("source", "?"),
            "kind": kind,
            "title": title,
            "reason": reason,
            "rowCount": len(rows),
            "confidence": conf,
        })
        notices.append(f"[{s.get('source', '?')}] {render_parse_notice(reason)}")
        if conf > best_conf:
            best_conf = conf
            doc_type = kind
        if title and not best_title:
            best_title = title
        for r in rows:
            key = r["module"]
            if key in seen_modules:
                continue
            seen_modules.add(key)
            merged_rows.append(r)

    return {
        "sources": parsed,
        "docType": doc_type,
        "confidence": round(best_conf, 3),
        "coverageAreas": merged_rows,
        "parseNotices": notices,
        "hasFullTable": bool(merged_rows),
        "title": best_title,
    }


# ── 资料拉取（本地文件 / Notion 页） ────────────
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
                                cell_texts = [
                                    "".join(t.get("plain_text", "") for t in cell)
                                    for cell in cells
                                ]
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


# ── 模块匹配 + 执行表（确定性唯一归并） ────────────
def module_matches(zentao_mod, plan_module, config=None):
    if not zentao_mod or not plan_module:
        return False
    if zentao_mod == plan_module:
        return True
    if zentao_module_to_plan(zentao_mod, config) == plan_module:
        return True
    if "-" in zentao_mod and zentao_mod.startswith(plan_module + "-"):
        return True
    if "-" in plan_module and plan_module.startswith(zentao_mod + "-"):
        return True
    return False


def assign_modules(bs, coverage_areas, config=None):
    """把 bugStats.byModule 的禅道 key 唯一归并到 coverage area。

    返回 {zentao_mod: plan_module}（未命中的 key 不在结果里）。
    长 plan_module 优先匹配，避免短前缀吃掉细分 key。
    """
    plan_modules = sorted({r["module"] for r in coverage_areas}, key=lambda x: -len(x))
    mapping = {}
    for zentao_mod in bs.get("byModule", {}):
        for pm in plan_modules:
            if module_matches(zentao_mod, pm, config):
                mapping[zentao_mod] = pm
                break
    return mapping


def _module_result_status(v):
    if v["未关闭"] > 0 or v["回归不通过"] > 0:
        return "⚠️ 有未关闭"
    if v["延期"] > 0:
        return "⚠️ 延期"
    if v["已修复"] > 0:
        return "🟡 待回归"
    return "✅ 通过"


def _module_remark(v):
    parts = []
    if v["回归不通过"]:
        parts.append(f"回归不通过{v['回归不通过']}")
    if v["延期"]:
        parts.append(f"延期{v['延期']}")
    return "、".join(parts) or "—"


def build_execution_rows(bs, coverage_areas, config=None):
    """完整执行表行（8 列），bugStats.byModule 每个 key 唯一归并。"""
    mapping = assign_modules(bs, coverage_areas, config)
    used = set()
    rows = []
    for r in coverage_areas:
        stats = {"未关闭": 0, "已修复": 0, "延期": 0, "回归不通过": 0}
        for zentao_mod, pm in mapping.items():
            if pm == r["module"]:
                for k in stats:
                    stats[k] += bs["byModule"][zentao_mod].get(k, 0)
                used.add(zentao_mod)
        rows.append([
            r["num"], r["module"], r["core"], r["priority"],
            _module_result_status(stats),
            str(stats["未关闭"]), str(stats["已修复"]), _module_remark(stats),
        ])
    # 资料外模块
    for zentao_mod, v in bs.get("byModule", {}).items():
        if zentao_mod in used:
            continue
        if not any(v.get(k, 0) for k in ("未关闭", "已修复", "延期", "回归不通过")):
            continue
        remark = _module_remark(v)
        remark = "资料外模块" if remark == "—" else remark + "、资料外模块"
        rows.append([
            "—", zentao_mod, "—", "—",
            _module_result_status(v),
            str(v["未关闭"]), str(v["已修复"]), remark,
        ])
    return rows


def build_simplified_rows(bs):
    """精简执行表行（5 列）。"""
    rows = []
    for mod, v in bs.get("byModule", {}).items():
        if not any(v.get(k, 0) for k in ("未关闭", "已修复", "延期", "回归不通过")):
            continue
        rows.append([
            mod, _module_result_status(v),
            str(v["未关闭"]), str(v["已修复"]), _module_remark(v),
        ])
    return rows


def coverage_ratio(bs, coverage_areas, config=None):
    """资料覆盖率 = 被资料覆盖到的禅道模块数 / 有缺陷的禅道模块数。"""
    active_modules = [m for m, v in bs.get("byModule", {}).items()
                      if any(v.get(k, 0) for k in ("未关闭", "已修复", "延期", "回归不通过"))]
    if not active_modules:
        return 1.0
    if not coverage_areas:
        return 0.0
    mapping = assign_modules(bs, coverage_areas, config)
    covered = sum(1 for m in active_modules if m in mapping)
    return round(covered / len(active_modules), 3)
