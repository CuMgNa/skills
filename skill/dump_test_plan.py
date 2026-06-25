# -*- coding: utf-8 -*-
import json
import sys
src = r"C:\Users\33606\.cursor\projects\c-Users-33606-Desktop-skills-skill\agent-tools\8174fccc-301b-4e00-a818-f562b7c3f733.txt"
data = json.loads(open(src, encoding="utf-8").read())
results = data.get("results", [])
sys.stdout.reconfigure(encoding="utf-8")


def rich(rt):
    if not rt:
        return ""
    parts = []
    for r in rt:
        t = (r.get("plain_text") or (r.get("text") or {}).get("content") or "")
        ann = r.get("annotations") or {}
        if ann.get("code"):
            t = "`" + t + "`"
        if ann.get("bold"):
            t = "**" + t + "**"
        parts.append(t)
    return "".join(parts)


def walk(blocks, depth=0):
    out = []
    for b in blocks:
        btype = b.get("type")
        bid = b.get("id")
        pad = "  " * depth
        if btype in ("heading_1", "heading_2", "heading_3"):
            level = int(btype[-1])
            text = rich(b.get(btype, {}).get("rich_text"))
            out.append(f"{pad}{'#' * level} {text}")
        elif btype == "paragraph":
            text = rich(b.get("paragraph", {}).get("rich_text"))
            if text.strip():
                out.append(f"{pad}{text}")
        elif btype == "bulleted_list_item":
            text = rich(b.get("bulleted_list_item", {}).get("rich_text"))
            out.append(f"{pad}- {text}")
        elif btype == "numbered_list_item":
            text = rich(b.get("numbered_list_item", {}).get("rich_text"))
            out.append(f"{pad}1. {text}")
        elif btype == "to_do":
            t = b.get("to_do", {})
            text = rich(t.get("rich_text"))
            mark = "[x]" if t.get("checked") else "[ ]"
            out.append(f"{pad}- {mark} {text}")
        elif btype == "toggle":
            text = rich(b.get("toggle", {}).get("rich_text"))
            out.append(f"{pad}> {text}")
        elif btype == "quote":
            text = rich(b.get("quote", {}).get("rich_text"))
            out.append(f"{pad}> {text}")
        elif btype == "callout":
            t = b.get("callout", {})
            text = rich(t.get("rich_text"))
            icon = ((t.get("icon") or {}).get("emoji") or "")
            out.append(f"{pad}> {icon} {text}".strip())
        elif btype == "code":
            text = rich(b.get("code", {}).get("rich_text"))
            lang = b.get("code", {}).get("language", "")
            out.append(f"{pad}```{lang}\n{text}\n{pad}```")
        elif btype == "table":
            tbl = b.get("table", {})
            rows = []
            for cid in tbl.get("children", []) or []:
                pass
            out.append(f"{pad}（table id={bid}，width={tbl.get('table_width')}）")
        elif btype == "table_row":
            cells = b.get("table_row", {}).get("cells", [])
            line = " | ".join(rich(c) for c in cells)
            out.append(f"{pad}| {line} |")
        elif btype == "child_page":
            out.append(f"{pad}📄 子页：{b.get('child_page', {}).get('title')}")
        elif btype == "child_database":
            out.append(f"{pad}🗂 数据库：{b.get('child_database', {}).get('title')}")
        elif btype == "divider":
            out.append(f"{pad}---")
        else:
            out.append(f"{pad}（{btype} id={bid}）")
    return out


lines = walk(results)
print("\n".join(lines))