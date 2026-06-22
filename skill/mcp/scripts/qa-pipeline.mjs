#!/usr/bin/env node
/**
 * QA 双 Agent 编排 CLI（Cursor SDK）
 *
 * 依赖：npm i @cursor/sdk（在 skill/mcp 或仓库根目录）
 * 环境：CURSOR_API_KEY
 *
 * 用法：
 *   node skill/mcp/scripts/qa-pipeline.mjs --help
 *   node skill/mcp/scripts/qa-pipeline.mjs --mode agent1 --project "【磐钴】位置监控平台-国际化" --screenshots "a.png,b.png"
 *   node skill/mcp/scripts/qa-pipeline.mjs --mode agent2 --project "【磐钴】位置监控平台-国际化" --no-closed
 *   node skill/mcp/scripts/qa-pipeline.mjs --mode full --project "【磐钴】位置监控平台-国际化" --screenshots "a.png" --no-closed
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const HANDOFF_PATH = join(REPO_ROOT, "skill", "mcp", "output", "handoff", "latest.json");
const DEFAULT_PROJECT = "【磐钴】位置监控平台-国际化";

function parseArgs(argv) {
  const args = {
    mode: "full",
    project: DEFAULT_PROJECT,
    screenshots: [],
    noClosed: false,
    dryRun: false,
    model: "composer-2",
    userNote: "",
    agent2OnlyScript: false,
    publishNotion: false,
    notionParentPageId: "",
    notionDatabaseId: "",
    notionTitleProperty: "Name",
    notionTemplatePageId: "",
    notionMaterialPageIds: [],
    reportMode: "create-new",
    testType: "",
    coverageStart: "",
    coverageEnd: "",
    tester: "",
    developer: "",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--mode" && argv[i + 1]) args.mode = argv[++i];
    else if (a === "--project" && argv[i + 1]) args.project = argv[++i];
    else if (a === "--screenshots" && argv[i + 1])
      args.screenshots = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--no-closed") args.noClosed = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--model" && argv[i + 1]) args.model = argv[++i];
    else if (a === "--note" && argv[i + 1]) args.userNote = argv[++i];
    else if (a === "--agent2-script") args.agent2OnlyScript = true;
    else if (a === "--notion") args.publishNotion = true;
    else if (a === "--notion-parent-page-id" && argv[i + 1])
      args.notionParentPageId = argv[++i];
    else if (a === "--notion-database-id" && argv[i + 1])
      args.notionDatabaseId = argv[++i];
    else if (a === "--notion-title-property" && argv[i + 1])
      args.notionTitleProperty = argv[++i];
    else if (a === "--notion-template-page-id" && argv[i + 1])
      args.notionTemplatePageId = argv[++i];
    else if (a === "--notion-material-page-ids" && argv[i + 1])
      args.notionMaterialPageIds = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--report-mode" && argv[i + 1])
      args.reportMode = argv[++i];
    else if (a === "--test-type" && argv[i + 1])
      args.testType = argv[++i];
    else if (a === "--coverage-start" && argv[i + 1])
      args.coverageStart = argv[++i];
    else if (a === "--coverage-end" && argv[i + 1])
      args.coverageEnd = argv[++i];
    else if (a === "--tester" && argv[i + 1])
      args.tester = argv[++i];
    else if (a === "--developer" && argv[i + 1])
      args.developer = argv[++i];
  }
  return args;
}

function printHelp() {
  console.log(`QA Pipeline (v3) — 双 Agent 编排

Mode (--mode):
  agent1   截图 → 提取缺陷 → 写禅道 → 写 handoff
  agent2   读 handoff → 拉禅道 → 单一统计源 → 钉钉报告 → (可选 Notion)
  full     agent1 完成后串行 agent2

Options:
  --project <name>     禅道项目名，默认: ${DEFAULT_PROJECT}
  --screenshots <paths>  逗号分隔截图绝对路径（agent1/full 需要）
  --no-closed          Agent2 仅拉未关闭缺陷
  --notion             Agent2 在钉钉之外同步写入 Notion
  --notion-parent-page-id <uuid>  Notion 父页面 ID（子页面模式，首选）
  --notion-database-id <uuid>     Notion 数据库 ID（数据库条目模式）
  --notion-title-property <name>  数据库标题列名，默认 Name
  --notion-template-page-id <uuid>  样板页 ID（v3 默认 c1b23699-3b3b-4b06-b2ac-0ec9ede194b6）
  --notion-material-page-ids <uuids> 逗号分隔的辅助测试资料页 ID（第二部分数据来源）
  --report-mode <mode>    create-new（默认）/ overwrite / fail-on-duplicate
  --test-type <text>     测试类型，如"第二轮功能测试 + 缺陷回归"
  --coverage-start <date>  覆盖期起始 YYYY-MM-DD
  --coverage-end <date>    覆盖期截止 YYYY-MM-DD
  --tester <name>        测试人姓名（如"童美娜"）
  --developer <name>      开发者姓名（可选）
  --note <text>        用户简述（传给 Agent1）
  --model <id>         Cursor 模型，默认 composer-2
  --dry-run            只打印 prompt，不调用 SDK
  --agent2-script      Agent2 仅执行 zentao-bugs-summary（不调用 SDK，用于无 API Key 时验证拉取）

Environment:
  CURSOR_API_KEY       调用 @cursor/sdk 时必填（--agent2-script 除外）

Handoff:
  ${HANDOFF_PATH}

Examples:
  node qa-pipeline.mjs --mode full --screenshots "C:\\path\\bug.png" --no-closed
  node qa-pipeline.mjs --mode agent2 --no-closed --notion --notion-parent-page-id "<uuid>"
  node qa-pipeline.mjs --mode agent2 --no-closed --notion --tester "童美娜" --test-type "第二轮功能测试 + 缺陷回归" --coverage-start 2026-06-02 --coverage-end 2026-06-13
`);
}

function buildAgent1Prompt(args) {
  const shots = args.screenshots.length ? args.screenshots.join("\n") : "（用户未传 --screenshots，请在对话中索要截图路径）";
  return `你是 QA Agent1（缺陷录入）。工作区根目录：${REPO_ROOT}

必须完整阅读并执行：
- skill/skills/qa-agent-defect-intake/SKILL.md
- skill/skills/defect-screenshot-bug-ticket/SKILL.md
- skill/skills/bug-report-and-create/SKILL.md

禁止：拉取禅道汇总，写测试报告、钉钉推送。

任务：
1. 项目名：${args.project}
2. 截图路径：
${shots}
3. 用户简述：${args.userNote || "无"}
4. 从截图提取缺陷，按 8 块模板展示；获得用户确认逻辑在自动化场景下视为已确认，直接写入禅道。
5. 使用 node skill/mcp/scripts/zentao-bug-create.mjs --steps 写入禅道。
6. 完成后必须写入 handoff 文件：${HANDOFF_PATH}
   字段见 skill/mcp/output/handoff/handoff.schema.json

返回：创建的 Bug ID、标题、禅道链接、handoff 是否写入成功。`;
}

function buildAgent2Prompt(args) {
  let handoffBlock = "（handoff 文件不存在，使用命令行项目名）";
  if (existsSync(HANDOFF_PATH)) {
    handoffBlock = readFileSync(HANDOFF_PATH, "utf8");
  }

  const notionBlock = args.publishNotion
    ? `
6. 执行 Notion 富格式报告管线（钉钉完成后）：
   a. 按 bug-stats 技能生成 bugStats.json（单一统计事实源）
   b. 按 test-report-notion 编排 Notion 富格式 Markdown（含校验闸门）
   c. 按 notion-test-report 写入 Notion（含 replace_content 主路径 + 降级策略）
   - publishNotion: true
   - notionParentPageId: ${args.notionParentPageId || "（见 handoff 或向用户确认）"}
   - reportMode: ${args.reportMode}
   - notionMaterialPageIds: ${args.notionMaterialPageIds.join(",") || "（无，按 test-report-notion 规则隐藏第二部分）"}
   - reportMeta: testType="${args.testType}", coverageStart="${args.coverageStart}", coverageEnd="${args.coverageEnd}", tester="${args.tester}", developer="${args.developer}"`
    : `
6. 不写入 Notion（默认仅钉钉）。若 handoff 中 reportOptions.publishNotion 为 true，则改按 v3 流程执行 Notion 富格式报告。`;

  return `你是 QA Agent2（报告发布 v3）。工作区根目录：${REPO_ROOT}

必须完整阅读并执行（v3 升级）：
- skill/skills/qa-agent-report-publish/SKILL.md（主流程）
- skill/skills/bug-stats/SKILL.md（单一统计事实源）
- skill/skills/test-report/SKILL.md（钉钉简版）
- skill/skills/dingtalk-test-report/SKILL.md（钉钉推送）
- skill/skills/test-report-notion/SKILL.md（Notion 富格式编排，publishNotion 时）
- skill/skills/notion-test-report/SKILL.md（Notion 写入，含校验闸门，publishNotion 时）

禁止：创建新禅道 Bug、截图提取缺陷。

任务：
1. 先读取 handoff（若存在）：
${handoffBlock}

2. 项目名：${args.project}
3. 拉取缺陷：
   node skill/mcp/scripts/zentao-bugs-summary.mjs --project-name "${args.project}"${args.noClosed ? " --no-closed" : ""}
4. 按 bug-stats 生成单一统计事实源 bugStats.json（数字只算一次，钉钉与 Notion 共用）
5. 按 test-report 编写钉钉三节简版报告（数字全取 bugStats，不重算）
6. 按 dingtalk-test-report 写入钉钉文档 + webhook 推送（仅摘录「一、测试结果」）${notionBlock}

返回：汇总 MD 路径、bugStats 路径、钉钉文档链接、机器人推送 errcode${args.publishNotion ? "、Notion 页面链接或失败原因" : ""}。`;
}

async function loadSdk() {
  try {
    return await import("@cursor/sdk");
  } catch {
    console.error(
      "未安装 @cursor/sdk。请在仓库根或 skill/mcp 下执行：npm i @cursor/sdk\n" +
        "或 Agent2 仅用脚本拉取：加 --agent2-script --mode agent2"
    );
    process.exit(1);
  }
}

async function runAgentPrompt(prompt, args) {
  if (args.dryRun) {
    console.log("--- DRY RUN PROMPT ---\n");
    console.log(prompt);
    return { status: "dry-run", result: "" };
  }
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.error("缺少环境变量 CURSOR_API_KEY");
    process.exit(1);
  }
  const { Agent } = await loadSdk();
  console.error(`调用 Cursor Agent（model=${args.model}）…`);
  const result = await Agent.prompt(prompt, {
    apiKey,
    model: { id: args.model },
    local: { cwd: REPO_ROOT },
  });
  console.log("\n--- Agent 结果 ---\n");
  console.log(result.result ?? JSON.stringify(result, null, 2));
  return result;
}

function runAgent2ScriptOnly(args) {
  const script = join(__dirname, "zentao-bugs-summary.mjs");
  const cmdArgs = ["--project-name", args.project];
  if (args.noClosed) cmdArgs.push("--no-closed");
  console.error(`执行: node ${script} ${cmdArgs.join(" ")}`);
  const r = spawnSync(process.execPath, [script, ...cmdArgs], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    encoding: "utf8",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.error("\n（仅完成禅道拉取；测试报告与钉钉需在 IDE 中 @qa-agent-report-publish 或使用完整 SDK Agent2）");
}

function ensureHandoffDir() {
  const dir = dirname(HANDOFF_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  ensureHandoffDir();

  if (args.mode === "agent2" && args.agent2OnlyScript) {
    runAgent2ScriptOnly(args);
    return;
  }

  if (args.mode === "agent1" || args.mode === "full") {
    if (!args.screenshots.length && !args.dryRun) {
      console.error("agent1/full 模式需要 --screenshots（逗号分隔绝对路径）");
      process.exit(1);
    }
    await runAgentPrompt(buildAgent1Prompt(args), args);
  }

  if (args.mode === "agent2" || args.mode === "full") {
    if (args.mode === "full" && !existsSync(HANDOFF_PATH) && !args.dryRun) {
      console.error(`警告：未找到 handoff ${HANDOFF_PATH}，Agent2 将仅依赖 --project`);
    }
    await runAgentPrompt(buildAgent2Prompt(args), args);
  }

  if (!["agent1", "agent2", "full"].includes(args.mode)) {
    console.error(`未知 --mode: ${args.mode}，可选 agent1 | agent2 | full`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
