# skills — SDET 工具箱 monorepo

> 主人（童美娜）的测试开发工具箱。技能、QA 流水线代码、运维脚本、文档、共享资产，平级共存于一个仓库。

## 仓库结构

| 目录 | 装什么 | 给谁看 |
|---|---|---|
| `skills/` | 21+1 个 Claude 技能（每个一个 `SKILL.md`，按个人使用习惯创建，正文互不统一） | 想复用某项 QA 能力时，进对应技能目录读 SKILL.md |
| `services/` | 可运行的服务代码 | `qa-pipeline/` = 缺陷回归+报告流水线（Agent1 提缺陷 → Agent2 出报告）；`rescue-graph/` = 应急救援知识图谱 |
| `scripts/` | 通用运维脚本（cc-switch / claude-env / gateway-check + 调试探针） | 命令行直接跑 |
| `docs/` | 文档与模板，按主题分：`design/` 设计、`manuals/` 产品手册、`personal/` 个人、`templates/` 模板、`guides/` 指南、`_reviews/` 第三方评审 | 找文档按主题进子目录 |
| `assets/` | 共享图片资源（`img/`） | 被技能/文档引用的截图 |
| `output/` | ⚠️ **运行时产物**，整体 gitignore。`runtime/handoff/`、`runtime/reports/`、`runtime/snapshots/` | 别手动改，会被流水线覆盖 |
| `data/` | 🛑 **主资产，进版本库，不可删**。`paths/{project}/bugs/{bugId}.json` 是回归录制的路径资产，批量回归只扫这里 | 新人接手第一注意：`data/` 是源数据，`output/` 是垃圾 |

## 红线

- **`data/` vs `output/` 划红线**：`data/` 是主资产（必须进库、不可删），`output/` 是运行时产物（gitignore、可清）。名字上硬隔离，防新人误删回归录制。
- **技能正文不统一**：每个技能按创建时的个人场景设计，不做章节/标题/frontmatter 风格统一（仅 `name`+`description` 必填）。

## 详细设计

结构重组的完整设计见 `docs/design/repo-restructure-design.md`。
