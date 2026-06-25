# -*- coding: utf-8 -*-
import json, re, sys
src = r"C:\Users\33606\.cursor\projects\c-Users-33606-Desktop-skills-skill\agent-tools\9627e621-d0fd-4d6f-afd3-c0df1df0c856.txt"
data = json.loads(open(src, encoding="utf-8").read())
results = data.get("results", [])
sys.stdout.reconfigure(encoding="utf-8")
kw = ["天翼", "星联", "应急叫应平台2期", "2期测试计划", "2期需求", "测试方案", "测试大纲", "逻辑点梳理", "救援棒", "二期逻辑大纲"]
print(f"总数 {len(results)}，筛出与本期报告可能相关的资料页：\n")
for r in results:
    try:
        title = r["properties"]["title"]["title"][0]["plain_text"]
    except Exception:
        title = "(无标题)"
    if not any(k in title for k in kw):
        continue
    pid = r["id"]
    url = r.get("url")
    p = r.get("parent", {})
    pt = p.get("type")
    pv = p.get(pt)
    icon = (r.get("icon") or {}).get("emoji") or ""
    print(f"- {icon} {title}")
    print(f"  id:    {pid}")
    print(f"  url:   {url}")
    print(f"  parent:{pt}={pv}\n")