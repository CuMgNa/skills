# 缺陷路径录制 + 脚本回归 设计文档

> 状态：**已实现（脚本 + intake skill）** · 待用真实 bug 打通验收  
> 日期：2026-08-04  
> 来源：多轮 `/grill-me`（ROI 否定「每 bug 猜入口」→ 提缺时录路径 → 脚本批量回归）  
> 关联：[`regression-collector-design.md`](./regression-collector-design.md)（采集/上传/关激单脚本，本设计复用其 submit 能力）

---

## 1. 问题与结论

### 1.1 失败过的路

| 方案 | 为何不行 |
|------|----------|
| AI 自然语言每次点页面 | 费 token、反复猜入口、准确率低 |
| 固化 Playwright 断言框架 | 多数 bug 无法确定性断言，ROI 不成立 |
| 回归前再录路径再回放 | 录制税 ≈ 手动回归成本，负提效 |
| 模块路径指望跨 bug 复用 | 用户自估复用 &lt;20%，摊销不回来 |

### 1.2 成立的账

提缺陷时本来就要**复现并点击**；若此时顺手录路径，边际成本≈0。  
同一 bug 回归时再走一遍 UI，回放可省「找入口」。  
**不是所有缺陷都适合自动回归**——只有提缺时明确「要录」并落盘路径的，才进入脚本回放集合。

### 1.3 一句话定位

**人在提缺时可选录制到达路径；人在回归时只判 PASS/FAIL；机器负责回放截图与批量关/激禅道。**

---

## 2. 总流程

```
┌──────────────────────────── 提缺（intake）────────────────────────────┐
│ 截图 → 确认 8 块 + 口头「要录/不录」→ 创建禅道拿 ID                      │
│        →（若要录）CDP 录制至 DONE → paths/{projectKey}/bugs/{id}.json  │
│        → 写入 handoff（含 pathFile）→ intake 完成                      │
│        ※ 说了要录但未录完 = intake 未完成                             │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────── 回归（regress）───────────────────────────┐
│ node regress.mjs --project {projectKey}                               │
│   1. 扫 paths/{projectKey}/bugs/*.json                                │
│   2. 查禅道，仅保留「已解决 / 待回归」                                  │
│   3. CDP 逐条回放；失败则跳过并记入汇总，继续下一条                     │
│   4. 输出批次目录 + 每 bug 的截图与 template.md                        │
│   5. 响铃/提示：请批量勾 PASS/FAIL                                     │
│                                                                       │
│ node regress-submit.mjs --batch {批次目录} --yes                      │
│   扫已勾模板 → PASS 关闭 / FAIL 激活（备注内嵌截图）                   │
└──────────────────────────────────────────────────────────────────────┘
```

无路径文件的 bug：**永不进入**自动回放。

---

## 3. 提缺侧（改 `qa-agent-defect-intake`）

### 3.1 相对现流程的插入点

现流程：`确认 8 块 → 写 steps → 创禅道 → handoff`  

新流程：

1. 确认 8 块时，**额外问一句**：是否需要录制回归路径？（用户口头要录 / 不录）  
2. 创建禅道，拿到 `bugId`  
3. 若要录：  
   - 确认 `projectKey`（用户口头短码，如 `wxfb`）  
   - 启动 `record-path.mjs`（CDP 挂已登录 Chrome）  
   - 用户点到复现现场后点页面绿色 DONE  
   - 落盘 `paths/{projectKey}/bugs/{bugId}.json`  
4. 若用户说了要录但录制未成功结束 → **intake 未完成**，须催至录完或用户改口「本次不录」  
5. handoff `latest.json` 增加字段（见下）

### 3.2 handoff 增补

```json
{
  "projectName": "【天翼】星联应急叫应平台2期",
  "projectKey": "wxfb",
  "bugsCreated": [
    {
      "id": 3847,
      "title": "…",
      "url": "https://zentao…/bug-view-3847.html",
      "severity": 3,
      "pri": 2,
      "pathFile": "paths/wxfb/bugs/3847.json",
      "pathRecorded": true
    }
  ]
}
```

- `pathRecorded: false` 或无 `pathFile`：不进入自动回归集合  
- `projectKey`：与目录名一致，由用户短码约定，不做中文自动缩写

### 3.3 录制失败策略

| 情况 | 行为 |
|------|------|
| 用户说不录 | 正常结束 intake，无路径 |
| 用户说要录，录制成功 | 写 pathFile，intake 完成 |
| 用户说要录，失败/取消 | **intake 未完成**；Agent 须继续引导补录，不得当作成功收工 |

---

## 4. 路径资产

### 4.1 目录约定

```
data/paths/
  {projectKey}/
    bugs/
      {bugId}.json          # 主资产：提缺时录，回归时播
    # 可选：模块级复用路径（低频，不作为主模型）
    # modules/
    #   dispatch.json
```

### 4.2 JSON 形态（与现 `record-path` 对齐并扩展）

```json
{
  "id": "wxfb/bugs/3847",
  "projectKey": "wxfb",
  "bugId": 3847,
  "url": "http://wxfb.pg8.ink/console",
  "steps": [
    {
      "index": 0,
      "url": "http://wxfb.pg8.ink/console",
      "x": 1835,
      "y": 31,
      "text": "",
      "tag": "I",
      "selector": "i.iconfont.icon-tongxin",
      "ts": "…"
    }
  ],
  "recordedAt": "…"
}
```

### 4.3 与「模块路径」关系

- **主模型**：按项目 + bugId（提缺绑定）  
- **模块路径**（如现有 `paths/console/dispatch.json`）：仅作偶发共用场景，不默认进批量回归扫描  
- 批量回归**只扫** `paths/{projectKey}/bugs/*.json`

---

## 5. 回归侧（脚本驱动，不定时）

### 5.1 启动

```bash
# 在 services/qa-pipeline 下
node scripts/regress.mjs --project wxfb
# 可选
node scripts/regress.mjs --project wxfb --status resolved   # 默认即过滤状态
```

- **不定时、不 cron**；需要时人肉执行  
- 依赖：本机 Chrome 已开远程调试且已登录业务系统（CDP，禁止 `chromium.launch` 空浏览器）

### 5.2 选集规则

1. 列出 `paths/{projectKey}/bugs/*.json`  
2. 用禅道 API 查对应 bug 状态  
3. **仅保留**「已解决 / 待回归」（具体状态码以禅道产品配置为准，实现时对照枚举）  
4. 已关闭、激活中、无路径 → 跳过

### 5.3 执行节奏

- **全量回放完再通知人**（响铃 + 终端汇总）  
- 人事后打开批次目录，逐个勾 `template.md` 的 PASS/FAIL  
- **不**在每条之间阻塞等待人工

### 5.4 单条回放失败

- 记入 `batch-summary.json` 的 `failed[]`（原因、失败步、截图）  
- **跳过该 bug，继续下一条**  
- 汇总里标明「需重录」；不自动猜新选择器（与既有决议一致）

### 5.5 批次输出布局

```
output/handoff/regression/batches/{projectKey}-{timestamp}/
  batch-summary.json
  3847/
    step-0.png
    final.png
    template.md
    manifest.json
  3836/
    …
  failed/
    3901-error.json
    3901-FAIL.png
```

`template.md` 与现采集器一致：勾选 PASS/FAIL + 提交命令提示。

### 5.6 批量提交

```bash
node scripts/regress-submit.mjs --batch output/handoff/regression/batches/wxfb-… 
node scripts/regress-submit.mjs --batch … --yes   # 真提交；默认 dry-run
```

| 模板勾选 | 禅道动作 |
|----------|----------|
| PASS | `POST /api.php/v1/bugs/{id}/close` + comment（内嵌截图） |
| FAIL | `POST /api.php/v1/bugs/{id}/active` + comment（内嵌截图） |
| 未勾 / 回放失败 | 跳过，列入报告 |

上传图床复用 `zentao-upload.mjs`；单条逻辑对齐现有 `regression-submit.mjs`，本脚本做目录遍历封装。

---

## 6. 人机边界（不可破）

| 环节 | 谁 |
|------|----|
| 要不要录、projectKey | 人 |
| 录制时点击路径 | 人 |
| 回放点击 / 截图 / 上传 / 关激 | 机器 |
| PASS/FAIL | 人 |
| 页面改版后重录 | 人决定；机器只报失败 |

机器**禁止**：猜入口、自动修选择器、定时跑、对无路径 bug 做自动导航。

---

## 7. 脚本与技能清单（待实现）

| 资产 | 状态 | 说明 |
|------|------|------|
| `scripts/cdp-connect.mjs` | 已有 | CDP 连接 |
| `scripts/path-replay-lib.mjs` | **已实现** | 单条回放共享库 |
| `scripts/record-path.mjs` | **已扩展** | `--project` `--bug` → `paths/{project}/bugs/{id}.json`；兼 `--out` 模块路径 |
| `scripts/replay-path.mjs` | **已改** | 调用共享库 |
| `scripts/regress.mjs` | **已实现** | 选集 + 批量回放 + summary |
| `scripts/regress-submit.mjs` | **已实现** | 批量读模板，调 `regression-submit.mjs` |
| `scripts/regression-submit.mjs` | 已有 | 单条提交 |
| `qa-agent-defect-intake/SKILL.md` | **已改** | 是否录制 / 创单后录 / handoff 字段 |

---

## 8. 明确不做

- ❌ 端到端无人值守（含自动判 PASS/FAIL）  
- ❌ 无路径 bug 的 AI 猜路回归  
- ❌ 定时/CI 调度（可日后加，当前决议禁止）  
- ❌ 用中文项目名自动生成 projectKey  
- ❌ 录制失败仍宣称 intake 成功（在用户已选择要录的前提下）

---

## 9. 决议记录（grilling）

### 提缺

1. 先创建禅道拿 ID，再录制  
2. 「是否录制」由用户口头确认  
3. 说了要录就必须录完，否则 intake 未完成  
4. 落盘 `paths/{projectKey}/bugs/{bugId}.json`  
5. projectKey = 用户口头短码  

### 回归

1. 脚本驱动，手动执行，不定时  
2. 全跑完再批量人工勾选  
3. 再跑批量 submit：PASS 关闭 / FAIL 激活  
4. 单条回放失败：跳过继续，最后汇总  
5. 选集 = 本地有路径 ∩ 禅道已解决/待回归  

### ROI 前提（再次强调）

跨 bug 路径复用不是主收益；主收益是 **提缺复现时零边际录制 + 回归免再找入口**，且集合自限为「适合自动化」的子集。

---

## 10. 实现顺序建议

1. 扩展 `record-path.mjs`（`--project` / `--bug` / 落盘路径）  
2. 实现 `regress.mjs`（选集 + 批量回放 + summary）  
3. 实现 `regress-submit.mjs`（批量提交）  
4. 改 `qa-agent-defect-intake/SKILL.md` + handoff schema  
5. 用 1 个真实 bug 打通：提缺录制 → regress → 勾选 → submit dry-run → `--yes`

---

## 11. 与旧文档关系

| 文档 | 职责 |
|------|------|
| 本文 | 提缺录路径 + 脚本批量回归的产品/流程设计 |
| `regression-collector-design.md` | 单次采集、图床、active/close 备注字段等实现细节 |

旧文档中「AI 现写选择器导航」降级为历史方案；导航以**本设计的路径回放**为准。
