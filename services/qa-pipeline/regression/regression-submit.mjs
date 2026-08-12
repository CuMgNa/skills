#!/usr/bin/env node
/**
 * 视觉回归提交器 —— 人填完结论后代提交禅道。
 *
 * 读 template.md 的勾选（PASS/FAIL）→ 上传截图 → POST /active（FAIL）或 /close（PASS）。
 * 默认 dry-run，加 --yes 才真提交。
 *
 * 用法：
 *   node regression-submit.mjs --dir <采集产物目录>
 *   node regression-submit.mjs --dir <采集产物目录> --yes
 *
 * 关键约束（见 docs/regression-collector-design.md）：
 * - 备注走 active/close 的 comment 字段，不碰 steps
 * - 激活：POST /api.php/v1/bugs/{id}/active（不是 PUT，不是 /activate）
 * - 关闭：POST /api.php/v1/bugs/{id}/close
 * - 截图通过 zentao-upload.mjs 上传，comment 内嵌 <img>
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { loadZentaoConfig, uploadImage } from "../zentao/zentao-upload.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CFG = loadZentaoConfig();
if (!CFG.ZENTAO_URL || !CFG.ZENTAO_ACCOUNT || !CFG.ZENTAO_PASSWORD) {
  console.error("缺少禅道配置。请配置 mcp.json 的 zentao.env 或环境变量。");
  process.exit(1);
}

function joinUrl(base, path) {
  return base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}

let token = null;
async function login() {
  const res = await fetch(joinUrl(CFG.ZENTAO_URL, "/api.php/v1/tokens"), {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ account: CFG.ZENTAO_ACCOUNT, password: CFG.ZENTAO_PASSWORD }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`登录失败 (${res.status}): ${text.slice(0, 400)}`);
  token = JSON.parse(text).token;
  if (!token) throw new Error("登录响应中无 token");
}

async function api(path, { method = "GET", body } = {}) {
  if (!token) await login();
  const opts = {
    method,
    headers: { Token: token, "Content-Type": "application/json; charset=utf-8" },
    body: body != null ? JSON.stringify(body) : undefined,
  };
  let res = await fetch(joinUrl(CFG.ZENTAO_URL, path), opts);
  if (res.status === 401) {
    token = null;
    await login();
    opts.headers.Token = token;
    res = await fetch(joinUrl(CFG.ZENTAO_URL, path), opts);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${method} ${path} (${res.status}): ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : {};
}

/** 解析 template.md，提取结论。返回 'PASS' | 'FAIL' | null。 */
function parseVerdict(templatePath) {
  const md = readFileSync(templatePath, "utf8");
  // 找勾选行：- [x] PASS  或  - [x] FAIL（大小写不敏感，x 可为 X）
  const passMatch = md.match(/-\s*\[[xX√✓]\]\s*PASS/i);
  const failMatch = md.match(/-\s*\[[xX√✓]\]\s*FAIL/i);
  if (passMatch && failMatch) {
    throw new Error("模板里 PASS 和 FAIL 都勾了，请只勾一个。");
  }
  if (passMatch) return "PASS";
  if (failMatch) return "FAIL";
  return null;
}

/** 从 manifest.json 读 bugId 和截图列表。 */
function loadManifest(dir) {
  const mf = join(dir, "manifest.json");
  if (!existsSync(mf)) throw new Error(`找不到 manifest.json：${mf}`);
  return JSON.parse(readFileSync(mf, "utf8"));
}

/** 只取 final 截图（禅道备注只贴终态，不贴每步）。 */
function listShots(dir, manifest) {
  const finalShot = (manifest.shots || []).find(
    (s) => !s.error && (s.step === "final" || s.name === "final" || s.file === "final.png")
  );
  if (!finalShot) return [];
  return [{ ...finalShot, path: join(dir, finalShot.file) }];
}

function buildComment(verdict, bugId, images) {
  const verdictLine = verdict === "PASS"
    ? `<p><strong>回归结论：PASS</strong>（视觉核对通过，详见截图）</p>`
    : `<p><strong>回归结论：FAIL</strong>（问题仍存在，详见截图）</p>`;
  const imgs = images
    .map((i) => `<p><img src="${i.url}" alt="screenshot" /></p>`)
    .join("\r\n");
  return `<p>Bug #${bugId} 自动化回归</p>\r\n${verdictLine}\r\n${imgs}`;
}

async function main() {
  const args = process.argv.slice(2);
  const yes = args.includes("--yes");
  const dirIdx = args.indexOf("--dir");
  const dir = dirIdx >= 0 ? args[dirIdx + 1] : null;
  if (!dir) {
    console.error("用法: node regression-submit.mjs --dir <采集产物目录> [--yes]");
    console.error("  --yes：跳过 dry-run，直接提交。默认只打印不提交。");
    process.exit(1);
  }

  const absDir = resolve(dir);
  if (!existsSync(absDir)) throw new Error(`目录不存在：${absDir}`);

  const templatePath = join(absDir, "template.md");
  if (!existsSync(templatePath)) throw new Error(`找不到 template.md：${templatePath}`);

  const verdict = parseVerdict(templatePath);
  if (!verdict) {
    console.error("template.md 里没有勾选结论。请编辑该文件，在 PASS 或 FAIL 前打 [x]。");
    console.error(`文件：${templatePath}`);
    process.exit(2);
  }

  const manifest = loadManifest(absDir);
  const bugId = manifest.bugId;
  const shots = listShots(absDir, manifest);
  if (!shots.length) {
    console.error("采集目录里没有 final.png。请先跑 regress.mjs。");
    process.exit(2);
  }

  console.log(`[submit] bug #${bugId}  结论=${verdict}  仅上传 final 截图`);
  console.log(`[submit] 动作=${verdict === "PASS" ? "close（关闭）" : "active（激活）"}`);

  // 上传截图
  console.log("[submit] 上传截图…");
  const uploaded = [];
  for (const s of shots) {
    if (!existsSync(s.path)) {
      console.error(`  缺文件：${s.path}`);
      continue;
    }
    const url = await uploadImage(s.path);
    uploaded.push({ desc: s.name, url });
    console.log(`  ${s.name} → ${url}`);
  }
  if (!uploaded.length) throw new Error("没有截图上传成功");

  const comment = buildComment(verdict, bugId, uploaded);
  const action = verdict === "PASS" ? "close" : "active";
  const path = `/api.php/v1/bugs/${bugId}/${action}`;
  const body =
    action === "active"
      ? { assignedTo: CFG.ZENTAO_ACCOUNT, openedBuild: ["trunk"], comment }
      : { comment };

  console.log("\n[submit] ===== 将要提交 =====");
  console.log(`POST ${path}`);
  console.log("comment 预览（前 200 字）：" + comment.slice(0, 200) + "…");
  console.log("[submit] ======================");

  if (!yes) {
    console.log("\n[submit] dry-run 模式，未提交。加 --yes 真正提交。");
    return;
  }

  console.log("\n[submit] 提交中…");
  const res = await api(path, { method: "POST", body });
  console.log("[submit] 响应：", JSON.stringify(res));
  if (res.status === "success" || res.data === String(bugId)) {
    console.log(`[submit] OK：Bug #${bugId} 已 ${action === "active" ? "激活" : "关闭"}。`);
  } else {
    console.error(`[submit] 响应异常，请人工核对 Bug #${bugId} 状态。`);
    process.exitCode = 3;
  }
}

main().catch((e) => {
  console.error(`[submit] 失败：${e.message}`);
  process.exit(1);
});
