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
  }
  return args;
}

function printHelp() {
  console.log(`QA Pipeline — 双 Agent 编排（Cursor SDK）

模式 (--mode):
  agent1   截图 → 提取缺陷 → 写禅道 → 写 handoff
  agent2   读 handoff → 拉禅道 → 测试报告 → 钉钉（可选 Notion）
  full     agent1 完成后串行 agent2

选项:
  --project <名称>     禅道项目名，默认：${DEFAULT_PROJECT}
  --screenshots <paths>  逗号分隔截图绝对路径（agent1/full 需要）
  --no-closed          Agent2 仅拉未关闭缺陷
  --notion             Agent2 在钉钉之外同步写入 Notion
  --notion-parent-page-id <uuid>  Notion 父页面 ID（子页面模式，首选）
  --notion-database-id <uuid>     Notion 数据库 ID（数据库条目模式）
  --notion-title-property <name>  数据库标题列名，默认 Name
  --note <text>        用户简述（传给 Agent1）
  --model <id>         Cursor 模型，默认 composer-2
  --dry-run            只打印 prompt，不调用 SDK
  --agent2-script      Agent2 仅执行 zentao-bugs-summary（不调用 SDK，用于无 API Key 时验证拉取）

环境:
  CURSOR_API_KEY       调用 @cursor/sdk 时必填（--agent2-script 除外）

Handoff:
  ${HANDOFF_PATH}

示例:
  node skill/mcp/scripts/qa-pipeline.mjs --mode full --screenshots "C:\\\\path\\\\bug.png" --no-closed
  node skill/mcp/scripts/qa-pipeline.mjs --mode agent2 --no-closed --notion --notion-parent-page-id "<uuid>"
`);
}

function buildAgent1Prompt(args) {
  const shots = args.screenshots.length ? args.screenshots.join("\n") : "（用户未传 --screenshots，请在对话中索要截图路径）";
  return `你是 QA Agent1（缺陷录入）。工作区根目录：${REPO_ROOT}

必须完整阅读并执行：
- skill/skills/qa-agent-defect-intake/SKILL.md
- skill/skills/defect-screenshot-bug-ticket/SKILL.md
- skill/skills/bug-report-and-create/SKILL.md

禁止：拉取禅道汇总、写测试报告、钉钉推送。

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
6. 按 notion-test-report 将完整报告写入 Notion（钉钉完成后执行）。
   - publishNotion: true
   - notionParentPageId: ${args.notionParentPageId || "（见 handoff 或向用户确认）"}
   - notionDatabaseId: ${args.notionDatabaseId || "（见 handoff 或向用户确认）"}
   - notionTitleProperty: ${args.notionTitleProperty || "Name"}`
    : `
6. 不写入 Notion（默认仅钉钉）。若 handoff 中 reportOptions.publishNotion 为 true，则改按 notion-test-report 执行。`;

  return `你是 QA Agent2（报告发布）。工作区根目录：${REPO_ROOT}

必须完整阅读并执行：
- skill/skills/qa-agent-report-publish/SKILL.md
- skill/skills/zentao-bug-summary/SKILL.md
- skill/skills/test-report/SKILL.md
- skill/skills/dingtalk-test-report/SKILL.md
- skill/skills/notion-test-report/SKILL.md（仅 publishNotion 启用时）

禁止：创建新禅道 Bug、截图提取缺陷。

任务：
1. 先读取 handoff（若存在）：
${handoffBlock}

2. 项目名：${args.project}
3. 拉取缺陷：node skill/mcp/scripts/zentao-bugs-summary.mjs --project-name "${args.project}"${args.noClosed ? " --no-closed" : ""}
4. 根据生成的 MD 按 test-report 技能编写完整测试报告（三节）。
5. 按 dingtalk-test-report 写入钉钉文档并 webhook 推送（推送仅「一、测试结果」）。${notionBlock}

返回：汇总 MD 路径、钉钉文档链接、机器人推送 errcode${args.publishNotion ? "、Notion 页面链接或失败原因" : ""}。`;
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
    if (args.mode === "full" && !args.dryRun && !existsSync(HANDOFF_PATH)) {
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
