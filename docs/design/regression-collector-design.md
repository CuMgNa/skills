# 视觉回归采集器 设计文档

> 状态：**部分被新设计取代** · 采集/上传/提交仍有效；导航方式见新文档  
> 日期：2026-08-04  
> **请优先阅读**：[defect-path-regression-design.md](./defect-path-regression-design.md)（提缺录路径 + 脚本批量回归）  
> 本文保留：图床上传、active/close comment、单次 template 形态等实现细节

---

# 视觉回归采集器 设计文档（归档补充）

> 原状态：已实现 v0.2 · 模块路径录制回放（CDP）——其中「模块路径主模型」已由「提缺按 bug 录路径」取代，见新文档 §4.3

---

## 1. 为什么做这个（和不做什么）

### 起源问题

每次回归让 AI 用自然语言驱动 browser-use，token 浪费在每 bug 都重复的机械活上。
但上一轮尝试固化「断言逻辑」失败——拉禅道产品 189 全量 11 条 bug 数据后发现：

| 类型 | 数量 | 占比 | 能写确定性像素断言？ |
|---|---|---|---|
| 视觉/排版 | 3 | 27% | 仅 1 条（#3836）真正能 |
| 流程/交互 | 3 | 27% | 不能 |
| 数据/字段 | 1 | 9% | 勉强 |
| 样式主观 | 3 | 27% | 不能（连 DOM 都骗人） |
| 文案 | 1 | 9% | 不能 |

**结论：断言不可固化，固化断言 = 重新制造一次性代码。**

### 重新定位

| 上一轮（错） | 本设计（对） |
|---|---|
| AI 当裁判（写死断言） | **人当裁判**，AI 只采集 |
| 每 bug 写 220 行探针 | 每 bug 给一行选择器 |
| 追求覆盖所有 bug | **只覆盖视觉类**（27%，且体验最好的那部分） |
| 同步守着 | **跑完响铃**，异步 |
| 边试边写留 30 个临时文件 | 单一脚本，输入输出明确 |

### 明确不做

- ❌ 判 PASS/FAIL（人判）
- ❌ 覆盖流程类 bug（操作每个 bug 不同，没法预录）
- ❌ 覆盖数据类 bug（人读截图 10 秒，不值得专门支持）
- ❌ 自动登录（接管本地 Chrome，复用已登录 session；禅道上传复用本地 MCP 的账密登录）
- ❌ 自动提交禅道（独立第二条命令，人填完模板再跑）

---

## 2. 核心理念：人机分工

**AI 摄影师 + 书记员，人当裁判。**

一次回归的环节拆分：

| 环节 | 谁做 | 备注 |
|---|---|---|
| 打开浏览器、导航到大屏 | 采集器 | 复用本地 Chrome session |
| 等渲染、滚到目标 | 采集器 | |
| **截图（全屏 + 关键区域）** | 采集器 | getBoundingClientRect 精确截 |
| 上传图床、拿 URL | 采集器 | 复用 zentao upload |
| 生成备注模板 | 采集器 | 含截图 URL，留 PASS/FAIL 占位 |
| **看截图，下结论** | **人** | 不可替代，主观视觉 AI 不可靠 |
| 决定激活/关闭、提交 | 人拍板，采集器执行 | 独立命令 |

token 杠杆：采集器是命令行，AI 零介入；人只在「看一眼」出场。

---

## 3. 范围（基于数据）

### 覆盖

- 产品 189 中**视觉/排版类** bug（约 27%）
- 截图即证据的场景：对齐、错位、样式不一致、字段缺失可见

### 不覆盖（保持人工 + AI 帮上传写备注）

- 流程类（上拉加载、键盘弹起、滚动行为）
- 数据类（数值核对，人读截图即可）
- 主观样式（颜色高亮、字体观感）

### 为什么这样切

- 视觉类：截图即完整证据，采集器投入产出比最高
- 流程类：操作流程每个 bug 不同，无法预录，自动化价值低
- 数据类：少量且每个字段不同，人读截图 10 秒，不值得专门支持

---

## 4. 技术选型

| 维度 | 选择 | 理由 |
|---|---|---|
| 登录态 | **接管本地 Chrome（browser-use / CDP）** | 复用用户已登录 session，不存账密，不过验证码 |
| 截图 | CDP `Page.captureScreenshot` | 全屏 + clip 局部，已验证可用 |
| 区域定位 | 选择器 + `getBoundingClientRect` | 不写死坐标，适应分辨率变化 |
| 通知 | 终端响铃 `\a` + stdout 提示 | 最轻，无依赖 |
| 上传图床 | **复用本地 MCP 的 `uploadStepsImage`** | 见下方「上传实现」 |
| 脚本形态 | 单文件 `.mjs`（与本地禅道脚本同语言，便于复用） | 不建框架，单一脚本 |

### 上传实现（不依赖外部 CLI）

复用 `services/qa-pipeline/zentao/zentao-bug-create.mjs` 中已验证的链路，**不**用 `zentao upload` CLI：

1. `ensureWebSession()`：`/api-getsessionid.json` 拿 `zentaosid` → `/user-login.json` 账密登录，cookie jar 维持会话
2. `POST /file-ajaxUpload.json`：表单字段必须为 **`imgFile`**（用 `file` 会报「格式不在规定范围内」），带 `zentaosid` + `uid`
3. 返回 `{"error":0,"url":"/zentao/file-read-xxxx.png"}`，直接可用于 `<img src>`

抽出一个独立 `zentao-upload.mjs`（放在 `services/qa-pipeline/zentao/`），只导出 `uploadImage(localPath)`，供采集器和提交器共用。登录态用环境变量 `ZENTAO_URL/ACCOUNT/PASSWORD`（与 MCP 配置一致）。

### 为什么不选 Playwright

- Playwright 需要自己管登录，会撞验证码
- browser-use 接管本地 Chrome，用户已登录，零登录成本
- 项目已有 browser-use skill，无需引入新工具链

### 为什么不固化到 MCP

- MCP server 适合「原子能力」，但采集流程是有状态的（goto→等→截→上传）
- 单脚本足够，且调试方便
- 若未来高频，再考虑包成 MCP 工具

---

## 5. 接口设计（已实现）

### 5.1 采集命令

```bash
# 形态（实际用法）
browser-use services/qa-pipeline/regression/regression-shoot.py -- \
  --bug-id 3836 \
  --url https://app.pgiot.com/ \
  --shot "全屏" \
  --shot "实时位置表@.moduleTitle:contains(实时位置)" \
  --shot "报警记录表@.moduleTitle:contains(报警记录)"
```

**实现文件**：`services/qa-pipeline/regression/regression-shoot.py`

### 5.2 输入参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `url` | string | ✅ | 目标页面 |
| `shots` | array | ✅ | 截图区域列表 |
| `shots[].name` | string | ✅ | 区域名（写进模板） |
| `shots[].full` | bool | | true=全屏，与 selector 互斥 |
| `shots[].selector` | string | | CSS 选择器，截其包围盒 |
| `bug_id` | int | ✅ | 关联 bug，用于产物命名 |
| `out_dir` | string | | 默认 `handoff/regression/` |

### 5.3 输出产物

```
output/runtime/handoff/regression/
└── <bug_id>-<timestamp>/
    ├── fullpage.png
    ├── loc.png
    ├── alarm.png
    ├── manifest.json      # 区域名→文件名映射
    └── template.md        # 待填结论的备注模板
```

`template.md` 示例：

```markdown
# Bug #3836 回归

## 结论
- [ ] PASS
- [ ] FAIL

> 勾选后保存，执行 `submit.sh` 提交禅道

## 证据
- 全屏：fullpage.png
- 实时位置表：loc.png
- 报警记录表：alarm.png
```

### 5.4 提交命令（独立）

等人在 `template.md` 勾选结论后：

```bash
# dry-run（默认，只打印不提交）
node services/qa-pipeline/regression/regression-submit.mjs --dir output/runtime/handoff/regression/<bug_id>-<timestamp>

# 真正提交
node services/qa-pipeline/regression/regression-submit.mjs --dir <同上> --yes
```

**实现文件**：`services/qa-pipeline/regression/regression-submit.mjs`

- 读 template.md 的勾选 → PASS 走 close，FAIL 走 active
- 上传截图到图床（复用 `zentao-upload.mjs`）→ 拿 file-read URL
- 调 `POST /api.php/v1/bugs/{id}/active|close`，comment 内嵌 img HTML
- **默认 dry-run**，加 `--yes` 才真提交

---

## 6. 产物归档约定

借鉴上轮 handoff 混乱的教训，立规矩：

- 采集产物统一进 `handoff/regression/<bug_id>-<timestamp>/`
- 每个 bug 一个子目录，不散落
- 采集器跑完**只产出**，不残留中间脚本（与上轮 30 个临时文件相反）
- 人确认提交后，该目录可归档/清理，但路径稳定可追溯

---

## 7. 何时不该用这个

诚实列出失效场景，避免被滥用：

1. **页面改版**：选择器失效 → 采集器报「区域未找到」，需更新选择器（人介入）
2. **需要登录态刷新**：Chrome session 过期 → 采集器报「跳转登录页」，需人工重登
3. **流程类 bug**：截图无法复现（如 #3672 上拉加载）→ 不适用，保持人工
4. **数据精确核对**：如 #3758 字段是否存在 → 人读截图即可，不值得用采集器
5. **主观样式**：如 #3713 颜色高亮 → 截图能看，但「对不对」纯主观，采集器只能给图不能给判

---

## 8. 与现有资产的关系

| 现有资产 | 关系 |
|---|---|
| `handoff/align-check.py` | 参考其 CDP 截图与 getBoundingClientRect 逻辑，但**不继承**其断言部分 |
| `handoff/activate-v1-active.py` | submit 命令直接复用其 `POST /active` 调用 |
| **`services/qa-pipeline/zentao/zentao-bug-create.mjs`** | **抽 `uploadStepsImage` + `ensureWebSession` 成独立 `zentao-upload.mjs`，采集器/提交器共用** |
| `handoff/latest.json` | 不再混入回归产物，回归走独立子目录 |
| browser-use skill | shoot/submit 基于 browser-use，不另起工具链 |
| zentao MCP | submit 可选走 MCP 的 `zentao_request`，或直接 HTTP（与本地脚本同款） |

---

## 9. 开放问题（已决议）

| # | 问题 | 决议 | 理由 |
|---|---|---|---|
| 1 | 选择器谁写 | **AI 现写一行** | token 可控，远低于全程驱动 |
| 2 | 区域未找到时 | **直接报错，不重试** | 重试会掩盖页面改版信号 |
| 3 | 多 bug 批量 | **不支持，一条条处理** | 每个 bug 页面/区域不同，批量无收益 |
| 4 | 浏览器标签 | **开新标签，跑完关掉** | 不抢用户当前页 |
| 5 | 模板格式 | **Markdown 勾选** | 人填友好，够用 |
| 6 | 上传图床 | **复用本地 MCP `uploadStepsImage`** | 不引入外部 CLI，与创单同源 |

---

## 10. 决策路径回顾

这个设计是经过以下收敛得到的，记录以防回退：

1. **发现**：每 bug 断言不同 → 固化断言 = 一次性代码
2. **数据验证**：11 条 bug 仅 1 条能确定性断言 → 框架 ROI 不成立
3. **转向**：不固化断言，只固化每 bug 都一样的采集/上传/写备注
4. **分工**：AI 采集，人判 PASS/FAIL
5. **收窄**：三类判断（视觉/流程/数据）只做视觉，其余人工
6. **异步**：跑完响铃，不要求人同步守着
7. **登录态**：接管本地 Chrome，零登录成本
8. **上传图床**：复用本地 MCP `uploadStepsImage`，不引入外部 CLI（与创单同源）
9. **6 个开放问题全部决议**：AI 写选择器、不重试、单 bug、开新标签、Markdown 勾选、本地 MCP 上传
10. **v0.2 路径录制**：AI 猜入口不可用 → 模块路径人录一次、机器回放；PASS/FAIL 仍人判；路径按 `paths/{module}/{scene}.json` 复用；失败停并报错；bug→路径现口头指定；CDP 接管本地 Chrome

每一步都有数据或体验支撑，不是拍脑袋。

---

## 11. v0.2 模块路径录制 / 回放

| 脚本 | 作用 |
|---|---|
| `scripts/cdp-connect.mjs` | 读 DevToolsActivePort / `BU_CDP_WS`，禁止 launch |
| `scripts/record-path.mjs` | 在已登录 Chrome 上录点击 → `paths/{module}/{scene}.json` |
| `scripts/replay-path.mjs` | 按路径回放；任一步失败 exit 2，不自动修 |

```
node scripts/record-path.mjs --url http://wxfb.pg8.ink/console --out console/dispatch
node scripts/replay-path.mjs --path console/dispatch --out-dir output/handoff/regression/3847-xxx --bug 3847
```
