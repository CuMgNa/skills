#!/usr/bin/env python3
"""
视觉回归采集器 —— AI 摄影师，人当裁判。

通过 browser-use（CDP 接管本地 Chrome）截图，不做任何断言判断。
跑完响铃，吐出 template.md，等人在上面勾 PASS/FAIL。

用法（由 browser-use 执行，helpers 已预导入）：
    browser-use regression-shoot.py -- --bug-id 3836 \
        --url https://app.pgiot.com/ \
        --shot "全屏" \
        --shot "实时位置表@.moduleTitle:contains(实时位置)" \
        --shot "报警记录表@.moduleTitle:contains(报警记录)"

约定（见 docs/regression-collector-design.md）：
- 选择器由 AI 现写一行，格式：描述@CSS选择器
- 区域未找到：直接报错，不重试（保留页面改版信号）
- 开新标签跑，跑完关掉，不抢用户当前页
- 登录态：复用本地 Chrome 已登录 session，不自动登录
"""
import argparse
import json
import os
import sys
import time
from datetime import datetime

def _find_repo_root(start):
    d = start
    for _ in range(10):
        if os.path.exists(os.path.join(d, "pyproject.toml")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            break
        d = parent
    return os.path.join(start, "..", "..")

OUT_ROOT = os.environ.get(
    "REGRESSION_OUTPUT",
    os.path.join(_find_repo_root(os.path.dirname(__file__)), "output", "runtime", "handoff", "regression"),
)


def parse_shots(raw):
    """把 '描述@选择器' 或 '描述' 解析成 dict。无 @ 的视为全屏。"""
    items = []
    for i, s in enumerate(raw or []):
        s = str(s).strip()
        if "@" in s:
            name, sel = s.split("@", 1)
            items.append({"name": name.strip(), "selector": sel.strip(), "full": False})
        else:
            items.append({"name": s or f"shot-{i}", "selector": None, "full": True})
    # 若没有任何 --shot，默认一张全屏
    if not items:
        items.append({"name": "全屏", "selector": None, "full": True})
    return items


def shoot_one(shot, out_dir, ts):
    """截一张图，返回 (name, filename, error)。"""
    name = shot["name"]
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in name)[:40] or "shot"
    filename = f"{safe}-{ts}.png"
    path = os.path.join(out_dir, filename)

    if shot.get("full") or not shot.get("selector"):
        # 全屏
        s = cdp("Page.captureScreenshot", format="png", captureBeyondViewport=True)
    else:
        # 选择器区域：先算包围盒
        selector = shot["selector"]
        box = js(
            r"""
            (function(sel){
              // 支持 jQuery 风格 :contains(text) —— 纯 CSS 不支持，手动解析
              var m = sel.match(/^(.*?):contains\((.*?)\)$/);
              var el = null;
              if (m) {
                var base = m[1] || '*';
                var text = m[2].replace(/^["']|["']$/g, '');
                var nodes = document.querySelectorAll(base);
                for (var i=0;i<nodes.length;i++){
                  if ((nodes[i].innerText||'').indexOf(text) >= 0){ el = nodes[i]; break; }
                }
              } else {
                el = document.querySelector(sel);
              }
              if(!el) return null;
              var r = el.getBoundingClientRect();
              return {x:r.left, y:r.top, w:r.width, h:r.height, tag:el.tagName, text:(el.innerText||'').slice(0,30)};
            })(arguments[0])
            """,
            selector,
        )
        if not box:
            return name, None, f"选择器未命中：{selector}"
        if box.get("w", 0) < 2 or box.get("h", 0) < 2:
            return name, None, f"选择器命中但元素无可见尺寸：{selector} → {box}"

        # 略微外扩，避免边线裁切；夹在视口内
        vx, vy = js("return {w: innerWidth, h: innerHeight};") or {"w": 1920, "h": 1080}
        x = max(0, box["x"] - 4)
        y = max(0, box["y"] - 4)
        w = min(vx["w"] - x, box["w"] + 8)
        h = min(vy["h"] - y, box["h"] + 8)

        s = cdp(
            "Page.captureScreenshot",
            format="png",
            clip={"x": float(x), "y": float(y), "width": float(w), "height": float(h), "scale": 1},
            captureBeyondViewport=True,
        )

    data = s.get("data", "") if isinstance(s, dict) else ""
    if not data:
        return name, None, "截图返回空 data"
    import base64

    with open(path, "wb") as f:
        f.write(base64.b64decode(data))
    return name, filename, None


def write_template(out_dir, bug_id, url, shots_result):
    """生成 template.md，含勾选位和证据清单。"""
    lines = [
        f"# Bug #{bug_id} 回归",
        "",
        "## 结论（请勾选一个）",
        "- [ ] PASS",
        "- [ ] FAIL",
        "",
        "> 勾选后保存，执行 regression-submit.py 提交禅道",
        "",
        f"目标页面：{url}",
        f"采集时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "## 证据",
    ]
    for s in shots_result:
        if s["error"]:
            lines.append(f"- {s['name']}：**采集失败** —— {s['error']}")
        else:
            lines.append(f"- {s['name']}：{s['file']}")
    lines.append("")
    path = os.path.join(out_dir, "template.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return path


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--bug-id", required=True, type=int)
    p.add_argument("--url", required=True)
    p.add_argument("--shot", action="append", default=[], help='描述 或 描述@CSS选择器')
    p.add_argument("--wait", type=float, default=3.0, help="导航后等待渲染秒数")
    args = p.parse_args()

    shots = parse_shots(args.shot)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = os.path.join(OUT_ROOT, f"{args.bug_id}-{ts}")
    os.makedirs(out_dir, exist_ok=True)

    print(f"[shoot] bug #{args.bug_id} → {out_dir}")
    print(f"[shoot] url={args.url}")
    print(f"[shoot] shots={len(shots)}")

    # 开新标签，不抢用户当前页
    print("[shoot] 新开标签…")
    new_tab(args.url)
    wait_for_load()
    # 额外等待 SPA 渲染
    if args.wait > 0:
        print(f"[shoot] 等待渲染 {args.wait}s…")
        time.sleep(args.wait)

    results = []
    had_error = False
    for s in shots:
        print(f"[shoot] 截图：{s['name']}" + (f" @ {s['selector']}" if s.get("selector") else "（全屏）"))
        name, file, err = shoot_one(s, out_dir, ts)
        if err:
            had_error = True
            print(f"       FAIL: {err}")
        else:
            print(f"       OK → {file}")
        results.append({"name": name, "file": file, "error": err, "selector": s.get("selector")})

    # 关掉这个标签，不抢用户当前页
    try:
        print("[shoot] 关闭标签…")
        # browser-use 没有标准 close_tab，用 CDP 关闭当前 target
        info = page_info()
        if info and info.get("tabId"):
            cdp("Target.closeTarget", targetId=info["tabId"])
    except Exception as e:
        print(f"[shoot] 关闭标签失败（可忽略）：{e}")

    # 写 manifest + template
    manifest = {
        "bugId": args.bug_id,
        "url": args.url,
        "ts": ts,
        "shots": results,
    }
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    tpl = write_template(out_dir, args.bug_id, args.url, results)
    print(f"\n[shoot] 产物目录：{out_dir}")
    print(f"[shoot] 模板：{tpl}")

    # 响铃通知
    sys.stdout.write("\a")
    sys.stdout.flush()
    print("[shoot] \a 响铃通知：请去看截图填结论")

    if had_error:
        print("[shoot] 有区域采集失败，请检查选择器或页面是否改版。")
        sys.exit(2)


if __name__ == "__main__":
    main()
