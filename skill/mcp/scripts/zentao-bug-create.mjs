#!/usr/bin/env node
/**
 * 在禅道中创建缺陷（REST API v1：POST /products/{id}/bugs）
 *
 * 说明：创建缺陷的 URL 为 POST /products/{id}/bugs（产品 ID 必填）；请求体可带 project 以关联「所属项目」。
 * 仅 --project-name 时：先读项目详情中的产品字段；若无，则调用 GET /projects/{id}/bugs（与 zentao-bugs-summary 一致）从已有缺陷推断 product。
 * 仍无法解析时再使用 --product-id。
 *
 * 用法：
 *   node zentao-bug-create.mjs --product-name "应急" --title "xxx" --steps-file ./bug-body.txt
 *   node zentao-bug-create.mjs --project-name "星联应急叫应平台" --title "xxx" --steps-file ./steps.md
 *   node zentao-bug-create.mjs --product-id 12 --title "xxx" --steps "纯文本步骤…"
 *
 * 可选：--severity 3 --pri 3 --type others --opened-build trunk（可多次）
 * 可选：--execution <执行/迭代ID>  --dry-run 只打印请求体不提交
 *
 * 配置：同 zentao-bugs-summary.mjs（mcp.json 中 zentao.env 或环境变量）
 */
import { readFileSync, existsSync, mkdirSync, appendFileSync } from "fs";
import { basename, dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 读取配置（与 zentao-bugs-summary.mjs 一致）────────────────
const MCP_JSON_CANDIDATES = [
  join(__dirname, "..", "..", ".cursor", "mcp.json"),
  join(process.env.USERPROFILE || process.env.HOME || "", ".cursor", "mcp.json"),
];

let ZENTAO_URL, ZENTAO_ACCOUNT, ZENTAO_PASSWORD;
for (const p of MCP_JSON_CANDIDATES) {
  try {
    const cfg = JSON.parse(readFileSync(resolve(p), "utf8"));
    const env = cfg.mcpServers?.zentao?.env;
    if (env?.ZENTAO_URL) {
      ZENTAO_URL = env.ZENTAO_URL;
      ZENTAO_ACCOUNT = env.ZENTAO_ACCOUNT;
      ZENTAO_PASSWORD = env.ZENTAO_PASSWORD;
      break;
    }
  } catch { /* */ }
}
if (!ZENTAO_URL) {
  ZENTAO_URL = process.env.ZENTAO_URL;
  ZENTAO_ACCOUNT = process.env.ZENTAO_ACCOUNT;
  ZENTAO_PASSWORD = process.env.ZENTAO_PASSWORD;
}
if (!ZENTAO_URL || !ZENTAO_ACCOUNT || !ZENTAO_PASSWORD) {
  console.error("缺少禅道配置。请配置 mcp.json 的 zentao.env 或环境变量 ZENTAO_URL / ZENTAO_ACCOUNT / ZENTAO_PASSWORD。");
  process.exit(1);
}

function joinUrl(base, path) {
  return base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}

let token = null;

async function login() {
  const res = await fetch(joinUrl(ZENTAO_URL, "/api.php/v1/tokens"), {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ account: ZENTAO_ACCOUNT, password: ZENTAO_PASSWORD }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`登录失败 (${res.status}): ${text.slice(0, 400)}`);
  token = JSON.parse(text).token;
  if (!token) throw new Error("登录响应中无 token");
}

async function api(path, { method = "GET", query, body } = {}) {
  if (!token) await login();
  const u = new URL(joinUrl(ZENTAO_URL, path));
  if (query && typeof query === "object") {
    for (const [k, v] of Object.entries(query)) {
      if (v != null) u.searchParams.set(k, String(v));
    }
  }
  const opts = {
    method,
    headers: { Token: token, "Content-Type": "application/json; charset=utf-8" },
    body: body != null ? JSON.stringify(body) : undefined,
  };
  let res = await fetch(u, opts);
  if (res.status === 401) {
    token = null;
    await login();
    opts.headers.Token = token;
    res = await fetch(u, opts);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${method} ${path} (${res.status}): ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : {};
}

async function findProject(nameKey) {
  const all = [];
  let page = 1;
  for (;;) {
    const data = await api("/api.php/v1/projects", { query: { page, limit: 100 } });
    const list = data.projects ?? [];
    if (!list.length) break;
    all.push(...list);
    if (list.length < 100) break;
    page++;
    if (page > 50) break;
  }
  const hits = all.filter((p) => String(p.name || "").includes(nameKey));
  if (!hits.length) {
    console.error(`未找到名称包含「${nameKey}」的项目。`);
    process.exit(1);
  }
  if (hits.length > 1) {
    console.error(`匹配到多个项目，使用第一个：`);
    hits.forEach((p) => console.error(`  ${p.id}  ${p.name}`));
  }
  return hits[0];
}

async function listProducts() {
  const all = [];
  let page = 1;
  for (;;) {
    const data = await api("/api.php/v1/products", { query: { page, limit: 100 } });
    const list = data.products ?? [];
    if (!list.length) break;
    all.push(...list);
    if (list.length < 100) break;
    page++;
    if (page > 50) break;
  }
  return all;
}

async function findProducts(nameKey) {
  const all = await listProducts();
  return all.filter((p) => String(p.name || "").includes(nameKey));
}

async function findProduct(nameKey) {
  const hits = await findProducts(nameKey);
  if (!hits.length) {
    console.error(`未找到名称包含「${nameKey}」的产品。可用 --list-products 查看列表。`);
    process.exit(1);
  }
  if (hits.length > 1) {
    console.error(`匹配到多个产品，使用第一个：`);
    hits.forEach((p) => console.error(`  ${p.id}  ${p.name}`));
  }
  return hits[0];
}

async function listProductProjects(productId) {
  const data = await api(`/api.php/v1/products/${productId}/projects`);
  return data.projects ?? [];
}

async function productLinksProject(productId, projectId) {
  const projects = await listProductProjects(productId);
  return {
    linked: projects.some((p) => Number(p.id) === Number(projectId)),
    projects,
  };
}

async function ensureProductLinksProject(productId, projectForBody, productLabel = `产品 ID ${productId}`) {
  if (!projectForBody) return;
  const { linked, projects } = await productLinksProject(productId, projectForBody.id);
  if (linked) return;

  const projectList = projects.length
    ? projects.map((p) => `${p.id} ${p.name}`).join("\n  ")
    : "无关联项目";
  console.error(
    `${productLabel} 未关联目标项目「${projectForBody.name}」(ID ${projectForBody.id})，已停止创建，避免产生产品/项目不匹配的缺陷。\n` +
      `当前产品关联项目：\n  ${projectList}\n`
  );
  process.exit(1);
}

async function findProductLinkedToProject(project, productNameHint = "") {
  const all = await listProducts();
  const nameHits = productNameHint
    ? all.filter((p) => String(p.name || "").includes(productNameHint))
    : [];
  const ordered = [
    ...nameHits,
    ...all.filter((p) => !nameHits.some((h) => Number(h.id) === Number(p.id))),
  ];

  const matches = [];
  for (const p of ordered) {
    const { linked } = await productLinksProject(p.id, project.id);
    if (linked) matches.push(p);
  }
  if (!matches.length) return null;

  const exact = matches.find((p) => String(p.name || "") === String(project.name || ""));
  if (exact) return exact;
  const named = matches.find((p) => productNameHint && String(p.name || "").includes(productNameHint));
  if (named) return named;
  if (matches.length > 1) {
    console.error(`项目「${project.name}」关联到多个产品，使用第一个：`);
    matches.forEach((p) => console.error(`  ${p.id}  ${p.name}`));
  }
  return matches[0];
}

/** 从项目详情推断关联产品 ID（不同禅道版本字段可能不同） */
function pickProductIdFromProjectDetail(d) {
  if (!d || typeof d !== "object") return null;
  if (typeof d.product === "number") return d.product;
  if (d.product && typeof d.product.id === "number") return d.product.id;
  if (Array.isArray(d.products) && d.products.length) {
    const x = d.products[0];
    if (typeof x === "number") return x;
    if (x && typeof x.id === "number") return x.id;
  }
  if (d.linkedProducts && Array.isArray(d.linkedProducts) && d.linkedProducts.length) {
    const x = d.linkedProducts[0];
    if (typeof x === "number") return x;
    if (x && typeof x.id === "number") return x.id;
  }
  return null;
}

/** 从缺陷对象解析所属产品 ID（与 zentao-bugs-summary 拉取的 bugs 结构一致） */
function pickProductIdFromBug(b) {
  if (!b || typeof b !== "object") return null;
  if (typeof b.product === "number") return b.product;
  if (b.product && typeof b.product === "object" && typeof b.product.id === "number") return b.product.id;
  if (typeof b.productID === "number") return b.productID;
  if (typeof b.productId === "number") return b.productId;
  return null;
}

/**
 * 方案一：与「按项目拉缺陷」同源接口 GET /api.php/v1/projects/{id}/bugs，
 * 从缺陷上的 product 字段收集候选产品，并只采用已绑定当前项目的产品。
 */
async function inferProductIdFromProjectBugs(project) {
  const projectId = typeof project === "object" ? project.id : project;
  const projectName = typeof project === "object" ? project.name : "";
  const data = await api(`/api.php/v1/projects/${projectId}/bugs`, { query: { page: 1, limit: 100 } });
  const list = data.bugs ?? [];
  const ids = [];
  for (const b of list) {
    const pid = pickProductIdFromBug(b);
    if (pid != null && !ids.some((id) => Number(id) === Number(pid))) ids.push(pid);
  }
  const linked = [];
  for (const id of ids) {
    const link = await productLinksProject(id, projectId);
    if (!link.linked) continue;
    let product = { id, name: "" };
    try {
      product = await api(`/api.php/v1/products/${id}`);
    } catch {
      // 绑定关系已确认，产品详情失败时仍可使用 ID。
    }
    linked.push(product);
  }
  if (!linked.length) return null;

  const exact = linked.find((p) => projectName && String(p.name || "") === String(projectName));
  if (exact) return Number(exact.id);
  const named = linked.find((p) => projectName && String(p.name || "").includes(projectName));
  if (named) return Number(named.id);
  if (linked.length > 1) {
    console.error(`项目「${projectName || projectId}」历史缺陷中存在多个已绑定产品，使用第一个：`);
    linked.forEach((p) => console.error(`  ${p.id}  ${p.name || ""}`));
  }
  return Number(linked[0].id);
}

/**
 * 解析创建缺陷所需的产品 ID，以及可选的「所属项目」（写入请求体 project 字段）。
 * 说明：禅道 API 路径必须是 POST /products/{id}/bugs，故「产品」在接口层不可省略；
 * 「项目」通过 body.project 关联，满足「缺陷挂到项目」的展示与统计。
 */
async function resolveCreateContext(args) {
  const { productId, productName, projectName, projectId: rawProjectId } = args;

  let projectForBody = null;

  if (rawProjectId != null) {
    const pid = Number(rawProjectId);
    if (!Number.isFinite(pid)) throw new Error("--project-id 必须是数字");
    projectForBody = { id: pid, name: `(ID ${pid})` };
  }

  if (productId != null) {
    const id = Number(productId);
    if (!Number.isFinite(id)) throw new Error("--product-id 必须是数字");
    if (projectName && !projectForBody) {
      const proj = await findProject(projectName);
      projectForBody = proj;
    }
    await ensureProductLinksProject(id, projectForBody);
    const hint =
      projectForBody && projectForBody.name
        ? `产品 ID ${id}，关联项目「${projectForBody.name}」(ID ${projectForBody.id})`
        : `产品 ID ${id}`;
    return { productId: id, hint, projectForBody };
  }

  if (productName) {
    if (projectName && !projectForBody) {
      const proj = await findProject(projectName);
      projectForBody = proj;
    }
    let p = null;
    if (projectForBody) {
      const hits = await findProducts(productName);
      if (!hits.length) {
        console.error(`未找到名称包含「${productName}」的产品。可用 --list-products 查看列表。`);
        process.exit(1);
      }
      for (const hit of hits) {
        const { linked } = await productLinksProject(hit.id, projectForBody.id);
        if (linked) {
          p = hit;
          break;
        }
      }
      if (!p) {
        console.error(
          `名称包含「${productName}」的产品均未关联项目「${projectForBody.name}」(ID ${projectForBody.id})，已停止创建。\n`
        );
        process.exit(1);
      }
    } else {
      p = await findProduct(productName);
    }
    const hint =
      projectForBody && projectForBody.name
        ? `产品「${p.name}」(ID ${p.id})，关联项目「${projectForBody.name}」(ID ${projectForBody.id})`
        : `产品「${p.name}」(ID ${p.id})`;
    return { productId: p.id, hint, projectForBody };
  }

  if (projectName) {
    const proj = await findProject(projectName);
    const linkedProduct = await findProductLinkedToProject(proj, proj.name);
    if (linkedProduct) {
      return {
        productId: Number(linkedProduct.id),
        hint: `由项目「${proj.name}」反查到关联产品「${linkedProduct.name}」(ID ${linkedProduct.id})，并关联该项目`,
        projectForBody: proj,
      };
    }

    const detail = await api(`/api.php/v1/projects/${proj.id}`);
    let inferredProductId = pickProductIdFromProjectDetail(detail);
    let productSource = inferredProductId ? "detail" : null;
    if (!inferredProductId) {
      inferredProductId = await inferProductIdFromProjectBugs(proj);
      productSource = inferredProductId ? "bugs" : null;
    }
    if (inferredProductId) {
      await ensureProductLinksProject(
        inferredProductId,
        proj,
        productSource === "bugs" ? `历史缺陷推断产品 ID ${inferredProductId}` : `项目详情产品 ID ${inferredProductId}`
      );
    }
    if (!inferredProductId) {
      console.error(
        `项目「${proj.name}」(ID ${proj.id}) 无法解析产品 ID：\n` +
          `  · 未从产品-项目绑定关系反查到关联产品，且\n` +
          `  · 项目详情中无产品字段，且\n` +
          `  · GET /projects/${proj.id}/bugs 无可用缺陷记录，或缺陷对象上无 product 字段。\n\n` +
          `请使用「--product-id <数字>」手动指定产品。\n`
      );
      process.exit(1);
    }
    const hint =
      productSource === "bugs"
        ? `由项目「${proj.name}」下已有缺陷兜底推断产品 ID ${inferredProductId}（已校验产品-项目绑定），并关联该项目`
        : `由项目「${proj.name}」详情解析到产品 ID ${inferredProductId}，并关联该项目`;
    return {
      productId: inferredProductId,
      hint,
      projectForBody: proj,
    };
  }

  if (rawProjectId != null && productId == null && productName == null && !projectName) {
    const pid = Number(rawProjectId);
    if (!Number.isFinite(pid)) throw new Error("--project-id 必须是数字");
    const project = { id: pid, name: `(ID ${pid})` };
    const linkedProduct = await findProductLinkedToProject(project);
    let inferredProductId = linkedProduct ? Number(linkedProduct.id) : null;
    let productSource = linkedProduct ? "linked" : null;
    if (!inferredProductId) {
      inferredProductId = await inferProductIdFromProjectBugs(project);
      productSource = inferredProductId ? "bugs" : null;
    }
    if (inferredProductId) {
      await ensureProductLinksProject(inferredProductId, project, `产品 ID ${inferredProductId}`);
    }
    if (!inferredProductId) {
      console.error(
        `项目 ID ${pid} 下无法从产品-项目绑定或已有缺陷推断产品 ID。请使用 --product-id。\n`
      );
      process.exit(1);
    }
    return {
      productId: inferredProductId,
      hint:
        productSource === "linked"
          ? `由项目 ID ${pid} 反查到关联产品 ID ${inferredProductId}，并关联该项目`
          : `由项目 ID ${pid} 下已有缺陷兜底推断产品 ID ${inferredProductId}（已校验产品-项目绑定），并关联该项目`,
      projectForBody: project,
    };
  }

  throw new Error("请指定 --product-id、--product-name 或 --project-name 之一");
}

function parseArgs(argv) {
  const args = { openedBuild: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--product-id" && argv[i + 1]) args.productId = argv[++i];
    else if (a === "--product-name" && argv[i + 1]) args.productName = argv[++i];
    else if (a === "--project-name" && argv[i + 1]) args.projectName = argv[++i];
    else if (a === "--project-id" && argv[i + 1]) args.projectId = argv[++i];
    else if (a === "--title" && argv[i + 1]) args.title = argv[++i];
    else if (a === "--title-file" && argv[i + 1]) args.titleFile = argv[++i];
    else if (a === "--steps" && argv[i + 1]) args.steps = argv[++i];
    else if (a === "--steps-file" && argv[i + 1]) args.stepsFile = argv[++i];
    else if (a === "--severity" && argv[i + 1]) args.severity = Number(argv[++i]);
    else if (a === "--pri" && argv[i + 1]) args.pri = Number(argv[++i]);
    else if (a === "--type" && argv[i + 1]) args.type = argv[++i];
    else if (a === "--execution" && argv[i + 1]) args.execution = Number(argv[++i]);
    else if (a === "--opened-build" && argv[i + 1]) args.openedBuild.push(argv[++i]);
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--update-bug-id" && argv[i + 1]) args.updateBugId = Number(argv[++i]);
    else if (a === "--list-products") {
      args.listProducts = true;
      if (argv[i + 1] && !String(argv[i + 1]).startsWith("--")) args.listProductsKeyword = argv[++i];
    }
    else if (a === "--attach" && argv[i + 1]) {
      if (!args.attach) args.attach = [];
      args.attach.push(argv[++i]);
    }
    else if (a === "--attach-section" && argv[i + 1]) args.attachSection = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

const HTML_ENTITY_MAP = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function unescapeHtml(s) {
  return String(s).replace(
    /&(?:amp|lt|gt|quot|#39|apos);/gi,
    (m) => HTML_ENTITY_MAP[m.toLowerCase()] || m
  );
}

/**
 * 标点与分节标签规范化（写入禅道前统一处理）。
 * - 统一 CRLF → LF
 * - 保护反引号内技术串
 * - 「」→ 中文双引号
 * - [小节] / 小节: / ## 小节 → 小节：
 */
function normalizePunctuation(s) {
  if (!s) return s;
  let r = String(s).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const chunks = [];
  r = r.replace(/`[^`\n]*`/g, (m) => {
    chunks.push(m);
    return `\x00BT_${chunks.length - 1}\x00`;
  });
  const SEC =
    "前置条件|预置条件|前提|重现步骤|操作步骤|复现步骤|步骤|实际结果|现象|实际|预期结果|期望|预期";
  r = r
    .replace(/「/g, "\u201c")
    .replace(/」/g, "\u201d")
    .replace(new RegExp(`^\\[(${SEC})\\]\\s*$`, "gm"), "$1：")
    .replace(new RegExp(`^(${SEC})\\s*:\\s*$`, "gm"), "$1：")
    .replace(new RegExp(`^#{1,3}\\s*(${SEC})\\s*$`, "gm"), "$1：");
  if (/[？?]{2,}|[！!]{2,}/.test(r))
    console.error("[warn] 正文含连续问号/叹号（规范禁止），请人工检查");
  return r.replace(/\x00BT_(\d+)\x00/g, (_, i) => chunks[Number(i)]);
}

/**
 * 将纯文本/Markdown 简述转为禅道富文本可用的 HTML。
 * - 连续空行合并，不再为每行空行生成 `<p> </p>`（避免禅道里出现大块异常空白）。
 * - 以 `1、` / `1.` / `1)` 开头的连续行转为 `<ol><li>…</li></ol>`，保留有序编号。
 * - 列表项之间允许空一行（loose list）；空行后若仍为有序项，归入同一 `<ol>`，避免禅道每条都显示为 `1.`。
 * - 入参里若包含字面量 `\n`、`\r\n`、`\t`（命令行常见情况），先解码为真实控制符。
 */
function stepsToHtml(s) {
  const esc = (t) => {
    const raw = unescapeHtml(String(t));
    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };
  const decoded = String(s)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
  const raw = decoded
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trimEnd());
  const lines = [];
  for (const L of raw) {
    if (L === "" && lines.length && lines[lines.length - 1] === "") continue;
    lines.push(L);
  }
  while (lines.length && lines[0] === "") lines.shift();
  while (lines.length && lines[lines.length - 1] === "") lines.pop();

  const ORDERED_RE = /^\d+[、.)]\s*/;
  const SECTION_LABEL_RE =
    /^(前置条件|预置条件|前提|重现步骤|操作步骤|复现步骤|步骤|实际结果|现象|实际|预期结果|期望|预期)\s*[：:]\s*$/;
  const parts = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i] === "") {
      i++;
      continue;
    }
    if (SECTION_LABEL_RE.test(lines[i])) {
      parts.push(`<p><strong>${esc(lines[i])}</strong></p>`);
      i++;
      continue;
    }
    if (ORDERED_RE.test(lines[i])) {
      const items = [];
      while (i < lines.length) {
        if (lines[i] === "") {
          if (items.length > 0 && i + 1 < lines.length && ORDERED_RE.test(lines[i + 1])) {
            i++;
            continue;
          }
          break;
        }
        if (!ORDERED_RE.test(lines[i])) break;
        items.push(lines[i].replace(ORDERED_RE, ""));
        i++;
      }
      parts.push(`<ol>${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>`);
      continue;
    }
    parts.push(`<p>${esc(lines[i])}</p>`);
    i++;
  }
  return parts.join("\r\n");
}

/** IPD/经典站：网页 session（zentaosid），用于富文本截图上传。与 REST Token 并行。 */
let webCookieJar = [];
let webSessionId = null;

function mergeSetCookies(jar, setCookieList) {
  const next = [...jar];
  for (const sc of setCookieList || []) {
    const kv = String(sc).split(";")[0];
    if (!kv || !kv.includes("=")) continue;
    const name = kv.split("=")[0];
    for (let i = next.length - 1; i >= 0; i--) {
      if (next[i].startsWith(name + "=")) next.splice(i, 1);
    }
    next.push(kv);
  }
  return next;
}

function cookieHeader(jar) {
  return (jar || []).join("; ");
}

function mimeByName(fileName) {
  const ext = String(fileName).split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "bmp") return "image/bmp";
  return "application/octet-stream";
}

/**
 * 网页登录：api-getsessionid → user-login。
 * IPD 4.6 实测：富文本截图必须走 session + imgFile，不能依赖 /api.php/v2/files。
 */
async function ensureWebSession() {
  if (webSessionId && webCookieJar.length) return;

  const sidRes = await fetch(joinUrl(ZENTAO_URL, "/api-getsessionid.json"));
  const sidText = await sidRes.text();
  if (!sidRes.ok) throw new Error(`获取 zentaosid 失败 (${sidRes.status}): ${sidText.slice(0, 300)}`);
  const sidJson = JSON.parse(sidText);
  const sidData = typeof sidJson.data === "string" ? JSON.parse(sidJson.data) : sidJson.data;
  const sessionName = sidData?.sessionName || "zentaosid";
  const sessionID = sidData?.sessionID;
  if (!sessionID) throw new Error(`获取 zentaosid 失败：响应无 sessionID：${sidText.slice(0, 300)}`);

  webCookieJar = mergeSetCookies(
    webCookieJar,
    typeof sidRes.headers.getSetCookie === "function"
      ? sidRes.headers.getSetCookie()
      : sidRes.headers.get("set-cookie")
        ? [sidRes.headers.get("set-cookie")]
        : []
  );
  webCookieJar = mergeSetCookies(webCookieJar, [`${sessionName}=${sessionID}`]);
  webSessionId = sessionID;

  const pageRes = await fetch(joinUrl(ZENTAO_URL, `/user-login.json?zentaosid=${sessionID}`), {
    headers: { Cookie: cookieHeader(webCookieJar) },
  });
  webCookieJar = mergeSetCookies(
    webCookieJar,
    typeof pageRes.headers.getSetCookie === "function"
      ? pageRes.headers.getSetCookie()
      : pageRes.headers.get("set-cookie")
        ? [pageRes.headers.get("set-cookie")]
        : []
  );
  const pageJson = JSON.parse(await pageRes.text());
  const pageData = typeof pageJson.data === "string" ? JSON.parse(pageJson.data) : pageJson.data;
  const verifyRand = String(pageData?.rand || pageData?.verifyRand || "");

  const body = new URLSearchParams({
    account: ZENTAO_ACCOUNT,
    password: ZENTAO_PASSWORD,
    passwordStrength: "1",
    referer: "/zentao/",
    verifyRand,
    keepLogin: "0",
  });
  const loginRes = await fetch(joinUrl(ZENTAO_URL, `/user-login.json?zentaosid=${sessionID}`), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(webCookieJar),
    },
    body: body.toString(),
  });
  webCookieJar = mergeSetCookies(
    webCookieJar,
    typeof loginRes.headers.getSetCookie === "function"
      ? loginRes.headers.getSetCookie()
      : loginRes.headers.get("set-cookie")
        ? [loginRes.headers.get("set-cookie")]
        : []
  );
  const loginText = await loginRes.text();
  if (!loginRes.ok || !/"user"\s*:/.test(loginText)) {
    throw new Error(`网页登录失败 (${loginRes.status}): ${loginText.slice(0, 400)}`);
  }
}

/**
 * 上传截图到禅道富文本图床（IPD 4.6 实测字段必须为 imgFile，file 会报格式不在范围）。
 * @returns {string} 可写入 steps 的相对/绝对 img src，如 /zentao/file-read-123.png
 */
async function uploadStepsImage(localPath) {
  await ensureWebSession();
  const fp = resolve(localPath);
  if (!existsSync(fp)) throw new Error(`截图不存在: ${fp}`);
  const fileName = basename(fp);
  const buf = readFileSync(fp);
  const form = new FormData();
  form.append("imgFile", new Blob([buf], { type: mimeByName(fileName) }), fileName);

  const url = new URL(joinUrl(ZENTAO_URL, "/file-ajaxUpload.json"));
  url.searchParams.set("zentaosid", webSessionId);
  url.searchParams.set("uid", String(Date.now()));

  const res = await fetch(url, {
    method: "POST",
    headers: { Cookie: cookieHeader(webCookieJar) },
    body: form,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`截图上传响应非 JSON (${fileName}): ${text.slice(0, 300)}`);
  }
  // 成功形态：{"error":0,"url":"/zentao/file-read-xxxx.png"}
  if (json.error === 0 && json.url) return String(json.url);
  if (json.result === "success" && json.url) return String(json.url);
  throw new Error(
    `截图上传失败 (${fileName}): ${json.message || json.error || text.slice(0, 300)}`
  );
}

/**
 * 把已上传图片插入「实际结果」小节之后（与线上习惯一致：steps 内 <img>，不是 bug.files 附件栏）。
 * sectionHint 默认匹配 实际结果/实际/现象。
 */
function insertImagesIntoSection(stepsHtml, imageUrls, sectionHint = "实际结果") {
  if (!imageUrls?.length) return stepsHtml;
  const imgs = imageUrls
    .map((u) => {
      const src = String(u).replace(/"/g, "&quot;");
      return `<p><img src="${src}" alt="screenshot" /></p>`;
    })
    .join("\r\n");

  const labels = ["实际结果", "实际", "现象", "预期结果", "预期", "期望", "前置条件", "重现步骤", "操作步骤", "复现步骤", "步骤"];
  // 优先用户指定章节
  const preferred = [sectionHint, "实际结果", "实际", "现象"].filter(Boolean);
  const html = String(stepsHtml || "");

  const findSection = (name) => {
    const re = new RegExp(
      `<p><strong>\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*：\\s*</strong></p>`,
      "i"
    );
    return html.search(re);
  };

  let start = -1;
  let matchedLabel = null;
  for (const name of preferred) {
    const idx = findSection(name);
    if (idx >= 0) {
      start = idx;
      matchedLabel = name;
      break;
    }
  }

  if (start < 0) {
    // 无「实际结果」标题时，追加一整块，避免截图丢失
    return (
      html +
      `\r\n<p><strong>实际结果：</strong></p>\r\n${imgs}`
    );
  }

  const afterHead = html.indexOf("</p>", start);
  const insertAt = afterHead >= 0 ? afterHead + 4 : start;

  // 找到下一个分节标题，插在该分节内容末尾、下一节之前
  let nextSection = html.length;
  for (const name of labels) {
    if (matchedLabel && name === matchedLabel) continue;
    const idx = findSection(name);
    if (idx > insertAt && idx < nextSection) nextSection = idx;
  }

  return html.slice(0, nextSection) + (html.slice(0, nextSection).endsWith("\r\n") ? "" : "\r\n") + imgs + "\r\n" + html.slice(nextSection);
}

/**
 * 上传 --attach 截图并嵌入 steps HTML。
 * 失败抛错（避免创建「无图」缺陷还当成功）。
 */
async function embedAttachedScreenshots(stepsHtml, paths, sectionHint = "实际结果") {
  if (!paths?.length) return { html: stepsHtml, urls: [] };
  const urls = [];
  for (const p of paths) {
    const url = await uploadStepsImage(p);
    urls.push(url);
    console.error(`已上传截图并嵌入步骤: ${basename(resolve(p))} → ${url}`);
  }
  return {
    html: insertImagesIntoSection(stepsHtml, urls, sectionHint),
    urls,
  };
}

/**
 * 从缺陷描述纯文本里按「标签：内容」抽取结构化语义字段。
 * 供报告阶段（report 流程）只读消费，不触发任何创建。
 */
function extractSemantic(stepsText, title) {
  const decoded = String(stepsText || "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
  const sectionDefs = [
    ["preconditions", ["前置条件", "前提", "预置条件"]],
    ["steps", ["重现步骤", "操作步骤", "复现步骤", "步骤"]],
    ["actual", ["实际结果", "实际", "现象"]],
    ["expected", ["预期结果", "预期", "期望"]],
  ];
  const out = {};
  const lines = decoded.split(/\r?\n/);
  let current = null;
  let buf = [];
  const flush = () => {
    if (current && buf.length) out[current] = buf.join("\n").trim();
  };
  for (const line of lines) {
    let matched = null;
    for (const [field, labels] of sectionDefs) {
      for (const lb of labels) {
        const re = new RegExp(`^\\s*(?:\\[${lb}\\]|${lb}\\s*[:：])\\s*`);
        if (re.test(line)) {
          matched = [field, line.replace(re, "").trim()];
          break;
        }
      }
      if (matched) break;
    }
    if (matched) {
      flush();
      current = matched[0];
      buf = matched[1] ? [matched[1]] : [];
    } else if (current) {
      buf.push(line);
    }
  }
  flush();

  // rootProblem 兜底：标题去掉【模块】前缀
  const mTitle = String(title || "").match(/^【.*?】(.+)$/);
  const rootProblem = out.actual || (mTitle ? mTitle[1].trim() : String(title || "").trim());
  return { ...out, rootProblem: rootProblem || null };
}

/**
 * 缺陷创建成功后写结构化语义产物（JSONL），路径：
 *   mcp/output/bug-semantic/{projectId|productId}-{YYYYMMDD}.jsonl
 * 报告阶段（bug_semantic_context.load_persisted_semantics）只读消费。
 */
function persistBugSemantic({ bugId, title, severity, pri, type, stepsText, projectId, productId }) {
  try {
    const outDir = join(__dirname, "..", "output", "bug-semantic");
    mkdirSync(outDir, { recursive: true });
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const key = projectId || productId || "unknown";
    const file = join(outDir, `${key}-${ymd}.jsonl`);
    const mod = (String(title || "").match(/^【(.+?)】/) || [])[1] || "未分类";
    const sem = extractSemantic(stepsText, title);
    const record = {
      bugId: String(bugId),
      title: title || "",
      module: mod,
      severity: Number.isFinite(severity) ? severity : null,
      pri: Number.isFinite(pri) ? pri : null,
      type: type || null,
      projectId: projectId || null,
      productId: productId || null,
      createdAt: new Date().toISOString(),
      preconditions: sem.preconditions || null,
      steps: sem.steps || null,
      actual: sem.actual || null,
      expected: sem.expected || null,
      rootProblem: sem.rootProblem || null,
      userImpact: sem.userImpact || null, // 业务影响默认留空，需人工/LLM 补全后才可作确定性结论
      evidenceRef: `zentao#${bugId}`,
      sourceConfidence: "high",
    };
    appendFileSync(file, JSON.stringify(record) + "\n", "utf8");
    console.error(`已写缺陷语义产物: ${file}（bug #${bugId}）`);
  } catch (e) {
    console.error(`缺陷语义产物写入失败（不影响创建）: ${e.message || e}`);
  }
}

const args = parseArgs(process.argv);

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain && (args.help || process.argv.length <= 2)) {
  console.log(`禅道创建缺陷

  node mcp/scripts/zentao-bug-create.mjs \\
    --project-name "星联应急叫应平台" \\
    --title "【求救群聊】…" \\
    --steps-file ./bug-steps.md

  或：--product-name "关键词" | --product-id <数字>

  --project-name  关键词，匹配项目名（可单独使用：自动解析/推断产品 ID 后创建）
  --project-id    数字，可与 --product-id 同用；单独使用时从该项目下已有缺陷推断产品 ID

  --title-file   从 UTF-8 文件读取标题（取首行，推荐含中文标题时使用）
  --steps-file   缺陷描述全文（前置条件、步骤、实际、预期等）
  --steps        直接跟一段文字（换行用 \\n；含中文时建议改用 --steps-file）
  --severity     默认 3  |  --pri 默认 3  |  --type 默认 others
  --opened-build 可多次，默认 trunk
  --execution    可选，迭代/执行 ID
  --dry-run      只打印 JSON，不创建
  --update-bug-id <数字>  仅更新已有缺陷的 steps（需配合 --steps / --steps-file）
  --list-products [关键词]  列出产品 id 与名称，可选关键词过滤名称
  --attach <路径>  可多次；上传截图并嵌入「实际结果」HTML（IPD：session + imgFile → file-read-*.png）
  --attach-section <名>  截图插入分节，默认「实际结果」

禅道 API：POST /api.php/v1/products/{产品ID}/bugs
截图上传：POST /file-ajaxUpload.json（字段 imgFile；与线上 steps 内 <img> 习惯一致）
`);
  process.exit(args.help ? 0 : 1);
}

async function main() {
  if (args.listProducts) {
    await login();
    const kw = args.listProductsKeyword || "";
    let page = 1;
    const rows = [];
    for (;;) {
      const data = await api("/api.php/v1/products", { query: { page, limit: 100 } });
      const list = data.products ?? [];
      for (const p of list) {
        if (!kw || String(p.name).includes(kw)) rows.push({ id: p.id, name: p.name });
      }
      if (!list.length || list.length < 100) break;
      page++;
      if (page > 20) break;
    }
    console.log("id\tname");
    for (const r of rows) console.log(`${r.id}\t${r.name}`);
    console.error(`共 ${rows.length} 条`);
    return;
  }

  if (args.titleFile) {
    args.title = readFileSync(resolve(args.titleFile), "utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)[0]
      .trim();
  }

  if (!args.title && !(Number.isFinite(args.updateBugId) && args.updateBugId > 0)) {
    console.error("请指定 --title 或 --title-file（更新步骤时可用 --update-bug-id 省略）");
    process.exit(1);
  }

  let steps = args.steps;
  if (args.stepsFile) {
    steps = readFileSync(resolve(args.stepsFile), "utf8").replace(/^\uFEFF/, "");
  }
  if (steps == null || String(steps).trim() === "") {
    console.error("请通过 --steps 或 --steps-file 提供缺陷描述（重现步骤等）");
    process.exit(1);
  }

  const severity = Number.isFinite(args.severity) ? args.severity : 3;
  const pri = Number.isFinite(args.pri) ? args.pri : 3;
  const type = args.type || "others";
  const openedBuild = args.openedBuild.length ? args.openedBuild : ["trunk"];

  await login();

  const { productId, hint, projectForBody } = await resolveCreateContext(args);
  console.error(hint);

  steps = normalizePunctuation(steps);
  args.title = normalizePunctuation(args.title || "").replace(/[。]$/, "");

  let stepsHtml = stepsToHtml(steps.trim());
  const attachSection = args.attachSection || "实际结果";

  if (args.attach?.length && !args.dryRun) {
    const embedded = await embedAttachedScreenshots(stepsHtml, args.attach, attachSection);
    stepsHtml = embedded.html;
  } else if (args.attach?.length && args.dryRun) {
    console.error(
      `[dry-run] 将上传 ${args.attach.length} 张截图并插入「${attachSection}」：\n` +
        args.attach.map((p) => `  - ${resolve(p)}`).join("\n")
    );
  }

  const body = {
    title: args.title,
    severity,
    pri,
    type,
    steps: stepsHtml,
    openedBuild,
  };
  if (Number.isFinite(args.execution)) body.execution = args.execution;
  if (projectForBody && Number.isFinite(Number(projectForBody.id))) {
    body.project = Number(projectForBody.id);
  }

  if (args.dryRun) {
    const combined = (body.title || "") + (body.steps || "");
    const warn = [];
    if (combined.includes("\uFFFD"))
      warn.push("含 U+FFFD 替换字符，UTF-8 解码失败，建议改用 --steps-file / --title-file");
    warn.length
      ? warn.forEach((w) => console.error("[encoding-warn] " + w))
      : console.error("[encoding-check] 通过（未检测到 U+FFFD）");
    console.log(JSON.stringify({ path: `/api.php/v1/products/${productId}/bugs`, body, attach: args.attach || [], attachSection }, null, 2));
    return;
  }

  if (Number.isFinite(args.updateBugId) && args.updateBugId > 0) {
    const updated = await api(`/api.php/v1/bugs/${args.updateBugId}`, {
      method: "PUT",
      body: { steps: stepsHtml },
    });
    console.log(JSON.stringify(updated, null, 2));
    console.error(`已更新缺陷 ID: ${args.updateBugId} 的重现步骤`);
    return;
  }

  const created = await api(`/api.php/v1/products/${productId}/bugs`, {
    method: "POST",
    body,
  });

  const bugId = created.id ?? created.bug?.id;
  console.log(JSON.stringify(created, null, 2));
  if (bugId) {
    const base = ZENTAO_URL.replace(/\/$/, "");
    console.error(`已创建缺陷 ID: ${bugId}（请在禅道界面核对产品与项目归属）`);
    console.error(`可尝试访问: ${base}/bug-view-${bugId}.html（路径因禅道路由配置可能略有不同）`);
    persistBugSemantic({
      bugId,
      title: args.title,
      severity,
      pri,
      type,
      stepsText: steps.trim(),
      projectId: projectForBody && Number.isFinite(Number(projectForBody.id)) ? Number(projectForBody.id) : null,
      productId,
    });
  }
}

export { embedAttachedScreenshots, insertImagesIntoSection, uploadStepsImage };

if (isMain) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
