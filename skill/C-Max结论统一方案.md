# C-Max 方案：测试结论统一来自 test-report 技能规范

> **目标**：让所有钉钉机器人推送、钉钉文档、Notion 报告中的「测试结论」，**唯一**来自符合 `skill/skills/test-report` 技能规范的代码化生成器，杜绝人工手写/外部 md 注入/兜底模板三类不一致来源。
>
> **版本**：v1.2　**日期**：2026-07-09　**作者**：SDET
> **状态**：待审批（建议先 Step 1 dry 验证，再 Step 2 落地）
> **v1.1 修订**：纠正蓝本选择——结论聚类复用主管线 `key_issues.py` + `report_config.DEFAULT_IMPACT_SIGNALS`，废弃 `_gen_creator_report.py` 的 `THEME_RULES` 硬编码路径。
> **v1.2 修订**：新增 Bug-M（`--material-auto` 跨项目污染）——`NOTION_DEFAULT_MATERIAL_PAGE_ID` 指向 SaaS1期方案，换项目时会把不相干资料喂给当前报告，导致模块归错行、覆盖率失真，比无资料更危险；纳入 Step 2 一并修复。
> **v1.3 修订**：修正 R2 缓解方案自相矛盾——删除无效的 `min_support` 路径，改为在 `key_issues._primary_label` 增加 Tier-2 `moduleAlias` 回退（4 行改动），复用已有数据结构；同步修正三处 gml 指出的实现缺陷（调用顺序、C_conclusion-3 脆弱性、R2 矛盾）。

---

## 一、背景与问题

### 1.1 痛点现象

在执行 `qa-agent-report-publish` 技能发布「【天翼】星联应急叫应平台2期」测试报告时，发现：**钉钉文档、钉钉机器人推送、Notion 报告三处的「测试结论」，与 `test-report` 技能定义的规范不一致。**

实际推送/写入的结论（数字堆叠版）：

> 本轮覆盖 16 个模块，缺陷总计 35 个：当前未关闭 15 个（其中回归不通过 4 个），待回归 18 个，已延期 2 个……

`test-report` 技能 SKILL.md 要求的结论（动态归纳版）：

> 本轮测试已完成 XX 模块的功能验证，当前仍有 **X 个未解决缺陷**，主要集中在 **【方向1】/【方向2】** 等方向，其中 **X 个高优问题（二级及以上）需优先修复**…… + 每类一段具体描述。

### 1.2 根因（代码层证据）

结论生产链路有三个**并存且互不校验**的入口：

| 入口 | 触发条件 | 代码位置 | 符合 test-report 规范？ |
|------|---------|---------|----------------------|
| ① 外部 md 文件（`--summary-file` / 自动 section1.md） | 传了文件或同目录有文件 | `publish_report.py:268` → `meta["section1_md"]` → `report_context.py:178` `ctx["conclusion"]=section1_md` | ❌ 取决于写的人（本次即为手写不规范） |
| ② 兜底模板 `conclusion_template` | 无 section1 且 `--allow-fallback` | `standard.py:_conclusion_text()` L20-24 | ❌ 纯拼数字 |
| ③ 主管线动态归纳（已存在但未接入结论段） | `build_report_context` 已调用 | `bug_semantic_context` → `key_issues.extract_key_issues()` → `ctx["keyIssues"]`；**结论段未消费** | ✅ 符合技能，但被旁路 |

**关键链路（当前）**：

```
publish_report.py:268   section1_md = load_section1_md(...)        # 读外部 md
publish_report.py:302   meta = {..., "section1_md": section1_md}
report_context.py:116   key_issues = ki.extract_key_issues(...)    # 已算好，仅给第③段用
report_context.py:178   ctx["conclusion"] = meta.get("section1_md")  # 直接透传 ← 病根
standard.py:_conclusion_text   if ctx["conclusion"]: return 它       # 原样用
standard.py:build_notion_blocks(结论段) / build_dingtalk_summary   # 消费 ctx["conclusion"]
```

**根因总结**：`test-report` 技能定义了"结论该怎么写"的规范，主管线也**已经实现了动态方向聚类**（`key_issues.py`），但 `publish_report.py` 拿结论的方式仍是**读一个 md 文件**。规范在文档里、算法在 `keyIssues` 里，结论段却走外部注入——三者脱节，数字闸门（C1-C10）只查数字、不查结论措辞。

### 1.3 附带发现的坏代码

| 文件 | 问题 |
|------|------|
| `validate_report.py:17` | 从 `publish_report` 导入 `validate_section1_gate` / `validate_report_gate`，但**这两个函数在 `publish_report.py` 中根本不存在**。该脚本运行必崩，是废弃半成品。真闸门是 `report_context.validate_report_context`。 |
| `_gen_report_md.py` / `_gen_creator_report.py` | 一次性脚本，写死项目名/路径/日期，**未接入主管线**；其中 `_gen_creator_report.py` 的 `THEME_RULES` 是错误旁路（见 §1.4），应整体删除而非抽为蓝本。 |

### 1.5 新增 Bug-M：`--material-auto` 跨项目污染（v1.2 补录）

**现象**：传 `--material-auto` 时，`publish_report.py:110-111` 无 `--material-page-id` 就自动回填 `qa_config.NOTION_DEFAULT_MATERIAL_PAGE_ID`，该值硬编码指向 **SaaS1期磐钴项目测试方案**（`3585667c-...`）。换项目（如本次天翼星联2期）时，Agent 只传 `--material-auto` 即会将 SaaS1期方案喂入当前报告。

**危害对比**：

| 场景 | 执行表来源 | C2' 数字校验 | 方向聚类 |
|------|-----------|-------------|---------|
| 无资料 → 精简表 | `bugStats.byModule`，如实呈现 | ✅ 必过 | 按 `impactSignals` 动态方向，正确 |
| `--material-auto` 喂错项目方案 | SaaS1期模块名（登录与认证/电子围栏…）当行模板，天翼 bug 大量落"未归类" | ❌ 可能挂掉（归并唯一性失效） | 与业务不符，出现 SaaS1期专属模块行 |

**比"无资料精简表"更糟**：精简表如实呈现 `bugStats.byModule`，数字正确；错误资料会导致行模板失配、数字挂错行、C2' 可能阻断发布——静默错误比主动降级危害更大。

**根因（代码层证据）**：

```
publish_report.py:110  if args.material_auto and not page_ids:
publish_report.py:111      page_ids.append(qa_config.NOTION_DEFAULT_MATERIAL_PAGE_ID)
                                                        ↑
                              "3585667c-6d3a-807b-8757-d831c8cd84cd"（SaaS1期方案，写死）
qa_config.py:96  NOTION_DEFAULT_MATERIAL_PAGE_ID = "3585667c-..."  # 注释含"SaaS1期"但仍被自动使用
```

`notion_client.py:100` 正确地把同一个 ID 用于"禁止写入"的安全断言，**但 `publish_report.py` 同时把它当默认资料源**——两种语义共用一个 ID，且一种语义是错误的。

### 1.4 v1.0 蓝本纠偏：为什么 `THEME_RULES` 不能用

v1.0 方案曾提议以 `_gen_creator_report.py` 的 `THEME_RULES` 为蓝本，经交叉比对技能与主管线代码后确认：**该路径无技能依据，且与现有实现重复劣化。**

| 维度 | 技能要求（`test-report` / `test-report-notion`） | `_gen_creator_report.THEME_RULES` | 主管线（正确） |
|------|-----------------------------------------------|----------------------------------|---------------|
| 分类是否固定 | **不固定**，由未解决缺陷内容动态决定 | ❌ 写死 6 个方向 + 禅道模块名 | ✅ `DEFAULT_IMPACT_SIGNALS` 关键词动态匹配 |
| 分类依据 | 标题前缀 + 问题关键词归纳 | ❌ 禅道 `模块` 字段名（技术路径） | ✅ 标题/步骤文本 → `impactSignals` |
| 代码位置 | 应在主管线复用 | 孤立一次性脚本 | `key_issues.extract_key_issues()` 已在 `build_report_context` 调用 |
| 可移植性 | 换项目不改代码 | ❌ 模块名写死（设备列表/套餐欠费等） | ✅ 通用关键词词典，项目级可覆盖 `impactSignals` |

**`THEME_RULES` 的真实来源**：写 `_gen_creator_report.py` 时未查阅 `key_issues.py` / `report_config.py`，将当时天翼项目的禅道模块名手工抄入脚本，**并非来自 `test-report` 技能定义**。

**正确路径**：

```
bugStats.未关闭列表
  → bug_semantic_context（标题/步骤 → impactSignals）
  → key_issues.extract_key_issues()（动态方向聚类，已在 ctx["keyIssues"]）
  → conclusion_builder.format_conclusion(ctx)（格式化为 test-report 第一节）← 缺这一环
```

---

## 二、方案选型

### 2.1 候选方案对比

| 方案 | 结论来源 | 外部 md | 兜底模板 | 结构闸门 | 满足"所有结论来自 test-report"？ |
|------|---------|---------|---------|---------|------------------------------|
| **A（最小）** | 规范 Agent 行为，靠自觉写 section1 | 保留 | 保留 | 无 | ❌ 不满足 |
| **B（闸门）** | 现状 + 加结构闸门校验措辞 | 保留 | 保留 | 加 | ⚠️ 部分（人工源仍在） |
| **C-1** | 缺 section1 时自动生成，外部 md 可覆盖 | 优先覆盖 | 可删 | 无 | ❌ 不满足（入口①仍优先） |
| **C-Max（本方案）** | **唯一**由算法生成，单源 + 闸门 | **废弃当结论源** | **删除** | **加** | ✅ **满足** |

### 2.2 结论

主人原话要求"**所有**推送、写入的测试结论都来自 test-report 技能输出"——按字面，**只有 C-Max 满足**。故采用 C-Max。

### 2.3 C-Max 核心原则

1. **单源**：结论唯一来源 = `conclusion_builder.format_conclusion(ctx)`，**消费已有 `ctx["keyIssues"]`**，不重复造分类轮子。
2. **封口**：废弃外部 md 当结论源、删除兜底模板、删除 `--allow-fallback`。
3. **强约束**：加结构闸门 `C_conclusion`，防格式化层跑偏（如聚类为空、缺高优点名）。
4. **复用**：方向聚类与风险短语来自 `report_config.DEFAULT_IMPACT_SIGNALS` + `key_issues.py`；项目级仅覆盖 `impactSignals`，**不引入 `THEME_RULES` 模块名硬绑**。
5. **数字不变**：仍 100% 取 bugStats / `ctx["metrics"]`，不动数据源与数字闸门。

---

## 三、结论生成器设计（v1.1 修订）

### 3.1 蓝本选择

| 维度 | `_gen_creator_report.py`（v1.0 误选） | **`key_issues.py` + `report_config.py`（v1.1 选用）** |
|------|--------------------------------------|-----------------------------------------------------|
| 技能符合度 | ❌ 固定 6 方向，违背「分类不固定」 | ✅ 动态聚类，与 `test-report-notion` §重点问题规则一致 |
| 与主管线关系 | 旁路重写，与 `ctx["keyIssues"]` 两套逻辑 | ✅ `build_report_context` 已产出 `keyIssues`，结论段直接消费 |
| 分类依据 | 禅道 `模块` 字段 | 标题/步骤关键词 → `impactSignals` |
| 可溯源率=0 时 | 仍可用（靠模块名） | ✅ 仍可用：`bug_semantic_context` 对标题做关键词匹配即可产出 `impactSignals` |
| 风险描述 | 写死 `RISK_DICT` | ✅ 用 `impactSignals[].phrase`；不可溯源时标注「（影响待复核）」 |
| 二级点名 | ✅ 逐条点名 ID | ✅ 在 `format_conclusion` 层补充（`key_issues` 已含 id/level） |

**裁决**：`conclusion_builder` 是**薄适配层**（约 50 行），负责把 `ctx["keyIssues"]` + `ctx["metrics"]` 格式化为 `test-report` 第一节 Markdown；**禁止**在 `conclusion_builder` 内重新实现分类或引入 `THEME_RULES`。

### 3.2 数据流（落地后）

```
build_report_context(bs, ...)
  ├─ bug_context = bsc.build_bug_semantic_context(bs)     # impactSignals
  ├─ key_issues  = ki.extract_key_issues(bug_context)     # 动态方向（已有）
  └─ conclusion  = cb.format_conclusion(ctx)                # 新增：格式化第一节
       ↑
  ctx["conclusion"]  ← 唯一来源，三端投影同读
```

### 3.3 `format_conclusion` 输出契约（对齐 test-report SKILL）

**首段（量化摘要）**：

```markdown
本轮测试已完成 {moduleCount} 个模块的功能验证，当前仍有 **{open} 个未解决缺陷**（其中回归不通过 **{regfail}** 个），主要集中在 **{方向1} / {方向2} / {方向3}** 等方向，其中 **{highCount} 个高优问题（二级及以上）需优先修复**，**{deferred} 个已延期问题建议下个版本跟进。**
```

**分方向 bullet**（每个 `keyIssues.groups[]` 一条）：

```markdown
- **【{category}】：{count} 个未关闭**（含二级高优 #{id1}、#{id2}）涉及{标题示例1}、{标题示例2}；{impact 短语}。
```

规则：
- `category` = `keyIssues.groups[].category`（来自 `impactSignals.label`，如「资金/计费」「消息/通信」）
- 二级及以上 ID 从该组 `items` 中筛选 `level in (一级, 二级)` 逐条点名
- 标题示例取 `items[].title` 去前缀后最多 4 条
- `impact`：组内首条可溯源项用 `userImpact`；否则用 `impactSignals.phrase` +「（影响待复核）」
- 有待回归时追加：`- **【回归验证】**：另有 **{pending} 个** 已修复缺陷待回归验证。`

---

## 四、详细改动清单（增 / 改 / 删 / 不动）

### 4.1 新增（1 文件 + 1 闸门）

| # | 路径 | 内容 | 预估行数 |
|---|------|------|---------|
| N1 | **`mcp/scripts/lib/conclusion_builder.py`**（新文件） | 薄适配层。导出 `format_conclusion(ctx) -> str`。读 `ctx["keyIssues"]`、`ctx["metrics"]`、`ctx["lists"]`，按 §3.3 契约输出 Markdown。**不实现分类逻辑**。 | ~50 |
| N2 | **结论结构闸门 `C_conclusion`**（`report_context.py:validate_report_context` 内） | 校验结论含「高优问题（二级及以上）」+ 至少一个方向分组 + 每个方向 bullet 含至少 1 条缺陷完整去前缀标题。`bs` 从 `ctx["_bs"]` 读取（该字段已在 `build_report_context` L198 写入）。 | ~20 |
| N3 | **`key_issues._primary_label` Tier-2 回退**（`key_issues.py` 第 28-31 行） | 关键词未命中时，用 `config["moduleAlias"]` 前缀匹配禅道模块名，返回可读模块别名而非直接落「其他功能问题」；`extract_key_issues` 调用处同步传入 `config`。 | ~6 |

**N1 骨架（示意，最终以实现为准）**：

```python
# lib/conclusion_builder.py
"""符合 test-report 技能规范的结论格式化器（唯一结论来源）。
方向聚类复用 ctx['keyIssues']（key_issues.extract_key_issues 产出），本模块只做 Markdown 格式化。"""
import re

LEVEL_HIGH = {"一级", "二级"}


def _strip_prefix(title):
    return re.sub(r"^(【[^】]+】)+", "", title or "").strip()


def format_conclusion(ctx):
    """从 ReportContext 生成 test-report 第一节 Markdown。"""
    m = ctx["metrics"]
    groups = (ctx.get("keyIssues") or {}).get("groups") or []
    open_list = ctx["lists"]["open"]

    focus = " / ".join(g["category"] for g in groups[:3]) or "待归纳"
    intro = (
        f"本轮测试已完成 {m['moduleCount']} 个模块的功能验证，"
        f"当前仍有 **{m['open']} 个未解决缺陷**"
        f"（其中回归不通过 **{m['regfail']}** 个），"
        f"主要集中在 **{focus}** 等方向，"
        f"其中 **{m['highCount']} 个高优问题（二级及以上）需优先修复**，"
        f"**{m['deferred']} 个已延期问题建议下个版本跟进**。"
    )

    bullets = []
    for g in groups:
        highs = [it for it in g["items"] if it.get("level") in LEVEL_HIGH]
        high_note = ""
        if highs:
            ids = "、".join(f"#{it['id']}" for it in highs)
            high_note = f"（含二级高优 {ids}）"
        examples = "、".join(_strip_prefix(it["title"]) for it in g["items"][:4])
        if g.get("overflow", 0) > 0 or g["count"] > 4:
            examples += " 等"
        impact = g["items"][0]["impact"] if g["items"] else "需结合业务场景优先修复"
        bullets.append(
            f"- **【{g['category']}】：{g['count']} 个未关闭**{high_note} 涉及{examples}；{impact}。"
        )
    if m["pending"]:
        bullets.append(f"- **【回归验证】**：另有 **{m['pending']} 个** 已修复缺陷待回归验证。")

    return intro + "\n\n" + "\n".join(bullets)
```

**N2 闸门骨架（v1.3 修订，修正 C_conclusion-3 脆弱性）**：

```python
# report_context.py validate_report_context 内，追加：
# 注意：此段必须在 ctx 完整组装后执行（validate_report_context 接收完整 ctx，无顺序问题）
conclusion = ctx.get("conclusion") or ""
m = ctx["metrics"]

# C_conclusion-1：有未关闭时必须含高优点名句
if m["open"] > 0 and "高优问题（二级及以上）" not in conclusion:
    errors.append("C_conclusion 结论缺少「高优问题（二级及以上）」点名")

# C_conclusion-2：有未关闭时必须含方向分组
if m["open"] > 0 and "【" not in conclusion:
    errors.append("C_conclusion 结论缺少业务方向分组")

# C_conclusion-3：每个方向 bullet 在结论中应含完整去前缀标题（而非前8字截断）
# format_conclusion 写入时即用 _strip_prefix(title) 全文，此处同样用全文匹配
import re as _re
def _strip(t): return _re.sub(r"^(【[^】]+】)+", "", t or "").strip()

for g in ctx["keyIssues"]["groups"]:
    used = [_strip(it["title"]) for it in g["items"][:4] if it.get("title")]
    if used and not any(t and t in conclusion for t in used):
        warnings.append(f"C_conclusion 方向「{g['category']}」在结论中未体现具体缺陷标题")
```

**N3 `_primary_label` Tier-2 回退骨架**：

```python
# key_issues.py 第 28-31 行，原来：
def _primary_label(bug):
    sigs = bug.get("impactSignals") or []
    return sigs[0]["label"] if sigs else OTHER_LABEL

# 修改为（Tier-2：impactSignals 无命中时回退 moduleAlias）：
def _primary_label(bug, config=None):
    sigs = bug.get("impactSignals") or []
    if sigs:
        return sigs[0]["label"]
    if config:
        module = bug.get("module") or ""
        for prefixes, alias in config.get("moduleAlias", []):
            if any(module == p or module.startswith(p + "-") for p in prefixes):
                return alias
    return OTHER_LABEL

# extract_key_issues 内，第 58 行调用处同步传入 config：
# 原来：label = _primary_label(bug)
# 改为：label = _primary_label(bug, config)
```

**Tier-2 对天翼项目的实证效果**（15 条未关闭 bug 中 3 条无关键词命中）：

| id | 模块 | Tier-1 结果 | Tier-2 moduleAlias 命中 | 最终方向 |
|----|------|------------|------------------------|---------|
| 3547 | 我的订单 | 无命中 | 无 alias 条目 | 其他功能问题 |
| 3506 | 群管理 | 无命中 | `["群管理"]` → `🛰️ 对讲群通信` | 🛰️ 对讲群通信 |
| 3421 | 群管理 | 无命中 | `["群管理"]` → `🛰️ 对讲群通信` | 🛰️ 对讲群通信 |

「其他功能问题」从 3 条降至 1 条（20% → 7%）。

### 4.2 修改（8 处编辑 + 文档）

| 文件 | 行/位置 | 改动 |
|------|--------|------|
| **`mcp/scripts/lib/report_context.py`** | L178 + 末尾二次赋值 | **两步改动**：① L178 将 `"conclusion": meta.get("section1_md")` 改为 `"conclusion": None`（先占位，切断外部 md 注入）；② 在 `return ctx` 前追加 `ctx["conclusion"] = conclusion_builder.format_conclusion(ctx)`（此时 `keyIssues`/`metrics`/`lists` 均已就绪）。**不得**在 L178 的 dict 字面量构造中直接调用 `format_conclusion`，否则 `ctx` 尚未完整，`KeyError`。`section1_md` 仅留 `meta` 供审计对比。 |
| **`mcp/scripts/lib/report_context.py`** | `validate_report_context` | 追加 `C_conclusion` 闸门（N2）。 |
| **`mcp/scripts/publish_report.py`** | L214-218 `publish_dingtalk` | 删除「无 conclusion 阻断」逻辑（算法保证总有结论）。 |
| **`mcp/scripts/publish_report.py`** | CLI 参数 | **删除 `--allow-fallback`**（C-Max 后无兜底模板，参数语义作废）。`--summary-file`/`--report-file` **标记 deprecated**：仅写入 `meta` 供人工审计对比，**不参与结论生成**；下一版可移除。 |
| **`mcp/scripts/publish_report.py`** | L110-111 **Bug-M 修复** | **删除 `--material-auto` 自动回填 `NOTION_DEFAULT_MATERIAL_PAGE_ID` 的两行**。修复后 `--material-auto` 无 `--material-page-id` 时等价于无资料，降精简表；**禁止为多项目共用单一默认资料源**。 |
| **`mcp/scripts/lib/qa_config.py`** | L96 **Bug-M 修复** | 将 `NOTION_DEFAULT_MATERIAL_PAGE_ID` 重命名为 `NOTION_MATERIAL_GUARD_PAGE_ID`，加注释明确：**仅用于 `notion_client` 禁写保护断言，禁止当 `--material-auto` 默认值**。同步更新 `notion_client.py:100` 的引用名。 |
| **`mcp/scripts/lib/report_templates/standard.py`** | L16-24 `_conclusion_text` | 简化为 `return ctx["conclusion"].strip(), True`（第二返回值 `_custom=True` 表示算法结论）。删除 `conclusion_template` fallback 分支。确认 `_custom` 无其他消费方依赖 `False` 分支（当前仅用于取值，无分支逻辑）。 |
| **`skill/skills/qa-agent-report-publish/SKILL.md`** | 多处 **Bug-M 修复** | ① 删除 L154 写死的 `3585667c-...` 辅助资料行（或将其注释为「SaaS1期专用，非通用默认值」）；② L159/L203 示例命令删除 `--material-page-id "3585667c-..."` 的硬编码；③ 补充说明：`--material-auto` 需配合 `--material-page-id` 才有效，单独传 `--material-auto` 将降级为精简执行表，Agent 应根据项目显式传 `--material-page-id`。 |

### 4.3 删除（冗余 / 废弃 / 已坏）

| # | 路径 | 删除原因 | 处置 |
|---|------|---------|------|
| D1 | **`mcp/scripts/validate_report.py`** | 导入不存在的函数，运行必崩。真闸门为 `validate_report_context`。 | **删除整文件** |
| D2 | **`mcp/scripts/_gen_report_md.py`** | 一次性脚本，逻辑被主管线 `key_issues` + `conclusion_builder` 取代。 | **删除整文件** |
| D3 | **`mcp/scripts/_gen_creator_report.py`** | 错误旁路（`THEME_RULES` 违背技能）；**不是蓝本，不应抽逻辑**。 | **删除整文件** |
| D4 | **`mcp/scripts/lib/report_templates/strings.py`** 的 `conclusion_template`（zh-CN + en-US） | 兜底模板，C-Max 后算法保证有结论。 | **删除该 key** |
| D5 | `publish_report.py` 中「section1 = conclusion」的**语义** | `load_section1_md` 等函数可暂留（审计对比），但**禁止赋给 `ctx["conclusion"]`**。 | **改语义不删函数** |

### 4.4 不动（安全边界）

| 范围 | 理由 |
|------|------|
| `bugstats.py` / `zentao-bugs-summary.mjs` | 数据源，与结论无关 |
| `dingtalk_client.py` / `notion_client.py` | 推送/写入通道，只读 `ctx["conclusion"]` |
| 数字闸门 C1-C10 / C1'-C4' | 查数字，不查结论措辞 |
| Notion 八段（结论段除外）、钉钉投影（结论段除外） | 零改动，只消费 `ctx["conclusion"]` |
| **`key_issues.py`** | **核心聚类引擎，结论段改为消费其产出**；仅增加 Tier-2 `moduleAlias` 回退（N3，6 行），不改聚类框架，`_primary_label` 签名向后兼容（`config` 默认 `None`） |
| **`bug_semantic_context.py`** | **impactSignals 来源**；已在主管线调用，结论段间接依赖 |
| **`report_config.py` 的 `DEFAULT_IMPACT_SIGNALS`** | 已有通用关键词词典；项目级可通过 `--project-config` 覆盖 `impactSignals`，**不新增 `THEME_RULES`** |
| `material_context.py` | 与结论段无关（第二节执行表专用） |

---

## 五、执行步骤（分两步，不梭哈）

### Step 1：先验证格式化质量（不改主管线）

**目的**：验证 `format_conclusion(ctx)` 把 `keyIssues` 格式化为 test-report 第一节的质量，避免固化不满意输出。

**操作**：
1. 新建 `mcp/scripts/lib/conclusion_builder.py`（N1）。
2. 用现有 bugStats + 现有 `build_report_context` dry 跑一遍，打印 `format_conclusion(ctx)` 输出。
3. 人工审：方向是否来自 `impactSignals`（资金/计费、消息/通信等）而非禅道模块名？二级点名是否准确？每条 bullet 是否含具体缺陷标题？

**通过标准**：
- 归纳质量 ≥ 当前人工水平，主人签字认可。
- 方向名来自 `keyIssues.groups[].category`，**不出现**「设备列表」「对讲群-下行退费」等禅道模块路径名作为分组标题（Tier-1 命中时方向名来自 `impactSignals.label`，Tier-2 命中时来自 `moduleAlias` 别名，如「🛰️ 对讲群通信」，均为可读业务分类）。
- 无关键词命中的 bug（Tier-1 失败）确认走 Tier-2 `moduleAlias` 回退，「其他功能问题」数量在总未关闭中占比合理（天翼项目预期 ≤ 10%）。
- 可溯源率=0 时仍能通过标题关键词产出合理方向（依赖 `DEFAULT_IMPACT_SIGNALS`）。

### Step 2：落地 C-Max（改主管线 + 删除 + 闸门 + 文档）

**前置**：Step 1 通过。

**操作（按顺序）**：
1. `key_issues.py` 增加 `_primary_label` Tier-2 回退（N3）。
2. `report_context.py` L178 置 `None` + 末尾二次赋值 `format_conclusion(ctx)`，切断 section1 注入。
3. `validate_report_context` 加 `C_conclusion`（N2，含修正后的 C_conclusion-3 全文匹配）。
4. `publish_report.py` 删无结论阻断 + 删 `--allow-fallback`；`--summary-file` 标记 deprecated。
5. `publish_report.py:110-111` 删除 `--material-auto` 自动回填逻辑（**Bug-M**）。
6. `qa_config.py:96` 将 `NOTION_DEFAULT_MATERIAL_PAGE_ID` 改名为 `NOTION_MATERIAL_GUARD_PAGE_ID`，同步 `notion_client.py` 引用（**Bug-M**）。
7. `standard.py:_conclusion_text` 简化，删 fallback。
8. 删除 D1-D4。
9. `SKILL.md` 结论段文档对齐 + Bug-M 相关命令示例修正（**Bug-M**）。
10. 全链路 dry + 真实小流量验证。

---

## 六、风险与缓解

| # | 风险 | 等级 | 缓解 |
|---|------|------|------|
| R1 | **可溯源率偏低**：无 `bug-semantic/*.jsonl` 时 `userImpact` 多为模板短语 | 中 | 标题关键词仍可驱动 `impactSignals`；不可溯源项标注「（影响待复核）」；Step 1 用真实数据验证 |
| R2 | **方向全并入「其他功能问题」**：标题无关键词命中 | 中 | **Tier-2 moduleAlias 回退**（N3）：`_primary_label` 关键词未命中时继续用 `moduleAlias` 前缀匹配禅道模块名，返回可读模块别名（如「🛰️ 对讲群通信」）而非直接落「其他」；新项目接入只需在 `moduleAlias` 补条目（接入执行表时已是必做项）。**禁止**两条无效路径：① 调低 `dynamic_label_min_support`（只影响方向门槛，不解决关键词未命中）；② 回退到 `THEME_RULES` 模块名硬绑 |
| R3 | **失去人工微调结论能力** | 中 | 预留 `--conclusion-override` 应急口，默认禁用、用了即告警留痕（可后续加） |
| R4 | **删除文件误伤** | 低 | 删除前 grep 全仓引用 |
| R5 | **闸门误阻断** | 中 | `C_conclusion` 只查结构；标题片段缺失降为 warning 非 error；保留 `--no-validate` 应急旁路 |
| R6 | **`conclusion_builder` 膨胀为第二套分类器** | 高 | 代码评审硬性要求：禁止在 `conclusion_builder` 内写 `classify`/`THEME_RULES`；分类只允许在 `key_issues.py` |
| R7 | **Bug-M 修复后 `--material-auto` 语义静默变化**：存量 CI/脚本中若传了 `--material-auto` 不加 `--material-page-id`，行为从「用 SaaS1 方案」变为「降精简表」 | 低 | 降精简表比喂错项目方案更安全；在 Step 2 修改完成后通知使用方更新命令；`publish_report.py` 加 warn 日志提示 |

---

## 七、验证清单

### 7.1 Step 1 验证（dry 格式化质量）

- [ ] `format_conclusion(ctx)` 不抛异常
- [ ] 结论含「高优问题（二级及以上）需优先修复」
- [ ] 结论含至少一个「【方向】」分组
- [ ] Tier-1 命中时方向名 = `impactSignals.label`（如「资金/计费」「消息/通信」），**非**禅道模块路径名
- [ ] Tier-2 回退时方向名 = `moduleAlias` 别名（如「🛰️ 对讲群通信」），不出现「群管理」等原始模块路径名
- [ ] 「其他功能问题」条目数 ≤ 总未关闭数的 10%（天翼项目预期 1 条）
- [ ] 未关闭数 = `ctx["metrics"]["open"]`
- [ ] 待回归数 = `ctx["metrics"]["pending"]`
- [ ] 二级缺陷 ID 逐条出现
- [ ] 每个方向 bullet 含至少 1 条来自 `keyIssues.items[].title` 的标题片段
- [ ] 与 `ctx["keyIssues"]` 方向数、缺陷数一致（结论不另算一套分类）

### 7.2 Step 2 验证（C-Max 全链路）

- [ ] 不传 `--summary-file`，结论仍正确生成（单源生效）
- [ ] 传了不规范的 `--summary-file`，**结论不被污染**（入口①已封）
- [ ] `validate_report_context` 打印「校验闸门通过 ✅」
- [ ] 钉钉投影 / Notion / 钉钉文档三处结论段逐字一致（同源 `ctx["conclusion"]`）
- [ ] `validate_report.py` / `_gen_*.py` 已删除，无残留引用
- [ ] `--allow-fallback` 已删除；`--summary-file` 仅审计、不参与结论
- [ ] 数字闸门 C1-C10 不受影响
- [ ] **Bug-M**：单独传 `--material-auto`（不加 `--material-page-id`）→ 降精简表，**不**加载 SaaS1期方案
- [ ] **Bug-M**：`qa_config.py` 中 `NOTION_DEFAULT_MATERIAL_PAGE_ID` 已不存在；`notion_client.py` 引用改为 `NOTION_MATERIAL_GUARD_PAGE_ID`，功能不变
- [ ] **Bug-M**：`SKILL.md` 中硬编码 `3585667c-...` 示例命令已删除或标注仅限 SaaS1期

---

## 八、回滚方案

- Step 1 不改主管线，无回滚成本（删 `conclusion_builder.py` 即可）。
- Step 2 全部改动在 git 版本控制下，回滚 = `git revert` 对应 commit。
- 删除的 D1-D3 文件可从 git 历史恢复。

---

## 九、附录：改动量预估

| 类别 | 文件数 | 代码量 |
|------|--------|--------|
| 新增 | 1 文件 + 2 处代码块（N2 闸门 + N3 回退） | ~76 行 |
| 修改 | 7 文件 + 1 文档 | ~50 行（含 Bug-M 3 处 + 调用顺序修正 + C_conclusion-3 修正） |
| 删除 | 3 文件 + 1 配置 key + 2 CLI 参数 + 2 行代码 | -约 255 行 |
| **净变化** | — | **-约 130 行**（删多于增，复用主管线而非重写分类器） |

改动集中在三条链路：①结论**格式化**（`conclusion_builder` + `report_context`）；②**资料加载安全**（Bug-M）；③**聚类韧性**（N3 Tier-2 回退）。爆炸半径可控，每条链路独立可回滚。

---

## 十、附录：版本变更摘要

### v1.0 → v1.1

| 项 | v1.0 | v1.1 |
|----|------|------|
| 蓝本 | `_gen_creator_report.py` + `THEME_RULES` | `key_issues.py` + `report_config.DEFAULT_IMPACT_SIGNALS` |
| `conclusion_builder` 职责 | 重实现分类（~90 行） | 薄格式化适配（~50 行），消费 `ctx["keyIssues"]` |
| `report_config` 新增 | `THEME_RULES` / `RISK_DICT` | **不新增**；沿用已有 `impactSignals` |
| 项目级配置 | 模块名映射表 | `impactSignals` 关键词追加/覆盖 |
| 删除 `_gen_creator_report` 理由 | 逻辑已抽取 | 错误旁路，整体废弃 |
| 新增风险 R6 | — | 防止 `conclusion_builder` 膨胀为第二套分类器 |

### v1.1 → v1.2

| 项 | v1.1 | v1.2 |
|----|------|------|
| 问题范围 | 仅结论生成链路 | 新增 **Bug-M**：`--material-auto` 跨项目资料污染 |
| 新增问题节 | — | §1.5（Bug-M 根因分析与危害量化） |
| 4.2 修改处数 | 6 处 | **8 处**（+2：`publish_report.py:110-111` 删回填、`qa_config.py` 改名） |
| Step 2 操作数 | 7 步 | **9 步**（+Bug-M 的 3 个操作，其中 1 个合并入文档步骤） |
| 风险条目 | R1-R6 | **+R7**（`--material-auto` 语义变化通知） |
| 验证清单 7.2 | 7 条 | **+3 条** Bug-M 验证项 |
| 受影响文件 | `report_context`/`publish_report`/`standard`/`SKILL.md` | **+`qa_config.py`/`notion_client.py`** |

### v1.2 → v1.3（gml 质疑整改）

| 缺陷 | v1.2 问题 | v1.3 修正 |
|------|---------|---------|
| 调用顺序露怯 | §4.2 写"L178"改调，但 dict 字面量构造中 `ctx` 尚未完整，`KeyError` | 明确"L178 先置 None，return 前末尾二次赋值" |
| C_conclusion-3 脆弱 | `[:8]` 截断；空字符串永远 `True`；`in` 失配风险 | 改为全文去前缀标题匹配（与 `format_conclusion` 写入逻辑一致） |
| R2 自相矛盾 | `min_support` 无效；无具体交付物 | 删除 `min_support` 路径；引入 N3 Tier-2 `moduleAlias` 回退（6 行），复用已有数据结构 |
| 新增 N3 | — | `key_issues._primary_label` Tier-2 回退：天翼项目「其他功能问题」从 20% 降至 7% |
