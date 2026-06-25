# -*- coding: utf-8 -*-
import json
import sys

src = r"C:\Users\33606\.cursor\projects\c-Users-33606-Desktop-skills-skill\agent-tools\9627e621-d0fd-4d6f-afd3-c0df1df0c856.txt"
data = json.loads(open(src, encoding="utf-8").read())
results = data.get("results", [])
sys.stdout.reconfigure(encoding="utf-8")
print(f"total: {len(results)}")
print()
for r in results:
    pid = r.get("id")
    url = r.get("url")
    parent = r.get("parent", {})
    ptype = parent.get("type")
    pid_parent = parent.get(ptype) if ptype else None
    title = ""
    try:
        title = r["properties"]["title"]["title"][0]["plain_text"]
    except Exception:
        try:
            title = r["properties"]["title"]["title"][0]["text"]["content"]
        except Exception:
            title = "(无标题)"
    archived = r.get("in_trash") or r.get("is_archived")
    icon = (r.get("icon") or {}).get("emoji") or ""
    print(f"- [{icon}] {title}")
    print(f"    id: {pid}")
    print(f"    url: {url}")
    print(f"    parent: {ptype}={pid_parent}")
    print(f"    archived: {archived}")