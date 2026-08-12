#!/usr/bin/env node
/**
 * 禅道截图上传（独立模块）
 *
 * 从 zentao-bug-create.mjs 抽出，供回归采集器/提交器共用。
 * 链路：ensureWebSession（session + 账密登录）→ POST /file-ajaxUpload.json（imgFile 字段）
 *
 * 用法（模块）：
 *   import { uploadImage, ensureWebSession } from "./zentao-upload.mjs";
 *   const url = await uploadImage("C:/path/shot.png"); // → /zentao/file-read-xxxx.png
 *
 * 用法（CLI，单文件上传）：
 *   node zentao-upload.mjs <localPath> [<localPath> ...]
 *
 * 配置：与 zentao-bug-create.mjs 一致，读 .cursor/mcp.json 的 zentao.env 或环境变量。
 */
import { readFileSync, existsSync } from "fs";
import { basename, dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MCP_JSON_CANDIDATES = [
  join(__dirname, "..", "..", ".cursor", "mcp.json"),
  join(process.env.USERPROFILE || process.env.HOME || "", ".cursor", "mcp.json"),
];

export function loadZentaoConfig() {
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
  return {
    ZENTAO_URL: ZENTAO_URL || process.env.ZENTAO_URL,
    ZENTAO_ACCOUNT: ZENTAO_ACCOUNT || process.env.ZENTAO_ACCOUNT,
    ZENTAO_PASSWORD: ZENTAO_PASSWORD || process.env.ZENTAO_PASSWORD,
  };
}

const CFG = loadZentaoConfig();
if (!CFG.ZENTAO_URL || !CFG.ZENTAO_ACCOUNT || !CFG.ZENTAO_PASSWORD) {
  console.error("缺少禅道配置。请配置 mcp.json 的 zentao.env 或环境变量 ZENTAO_URL / ZENTAO_ACCOUNT / ZENTAO_PASSWORD。");
  if (import.meta.url === `file://${process.argv[1]}`) process.exit(1);
}

function joinUrl(base, path) {
  return base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}

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

/** Detect real image type from magic bytes (Cursor chat often saves JPEG as .png). */
export function sniffImageMeta(buf, fallbackName = "shot.bin") {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  let ext = "bin";
  let mime = "application/octet-stream";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    ext = "jpg";
    mime = "image/jpeg";
  } else if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47
  ) {
    ext = "png";
    mime = "image/png";
  } else if (b.length >= 6 && b.slice(0, 6).toString("ascii") === "GIF87a") {
    ext = "gif";
    mime = "image/gif";
  } else if (b.length >= 6 && b.slice(0, 6).toString("ascii") === "GIF89a") {
    ext = "gif";
    mime = "image/gif";
  } else if (b.length >= 12 && b.slice(0, 4).toString("ascii") === "RIFF" && b.slice(8, 12).toString("ascii") === "WEBP") {
    ext = "webp";
    mime = "image/webp";
  } else {
    // fall back to extension
    mime = mimeByName(fallbackName);
    const e = String(fallbackName).split(".").pop()?.toLowerCase();
    if (e === "jpeg") ext = "jpg";
    else if (e) ext = e;
  }
  const base = String(fallbackName).replace(/\.[^.]+$/, "") || "shot";
  const fileName = `${base}.${ext}`;
  const nameMime = mimeByName(fallbackName);
  const extMismatch = nameMime !== "application/octet-stream" && nameMime !== mime;
  return { fileName, mime, ext, extMismatch, bytes: b.length };
}

/** 网页登录：api-getsessionid → user-login。富文本截图必须走 session + imgFile。 */
export async function ensureWebSession() {
  if (webSessionId && webCookieJar.length) return;
  if (!CFG.ZENTAO_URL || !CFG.ZENTAO_ACCOUNT || !CFG.ZENTAO_PASSWORD) {
    throw new Error("缺少禅道配置（ZENTAO_URL/ACCOUNT/PASSWORD）");
  }

  const sidRes = await fetch(joinUrl(CFG.ZENTAO_URL, "/api-getsessionid.json"));
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

  const pageRes = await fetch(joinUrl(CFG.ZENTAO_URL, `/user-login.json?zentaosid=${sessionID}`), {
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
    account: CFG.ZENTAO_ACCOUNT,
    password: CFG.ZENTAO_PASSWORD,
    passwordStrength: "1",
    referer: "/zentao/",
    verifyRand,
    keepLogin: "0",
  });
  const loginRes = await fetch(joinUrl(CFG.ZENTAO_URL, `/user-login.json?zentaosid=${sessionID}`), {
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
 * 上传截图到禅道富文本图床。
 * IPD 4.6 实测：字段必须为 imgFile（file 会报「格式不在规定范围内」）。
 * @param {string} localPath 本地图片路径
 * @returns {Promise<string>} 可写入 img src 的 URL，如 /zentao/file-read-123.png
 */
export async function uploadImage(localPath) {
  await ensureWebSession();
  const fp = resolve(localPath);
  if (!existsSync(fp)) throw new Error(`截图不存在: ${fp}`);
  const buf = readFileSync(fp);
  const meta = sniffImageMeta(buf, basename(fp));
  if (meta.extMismatch) {
    console.warn(
      `[upload] 扩展名与实格式不一致：${basename(fp)} → 按 ${meta.mime} 上传为 ${meta.fileName}（${meta.bytes} bytes）`
    );
  }
  if (meta.ext === "jpg" && meta.bytes < 200 * 1024) {
    console.warn(
      `[upload] 警告：JPEG 仅 ${meta.bytes} bytes，可能已被聊天/客户端压缩；建议改用本机原图或 CDP 全分辨率截图`
    );
  }
  const form = new FormData();
  form.append("imgFile", new Blob([buf], { type: meta.mime }), meta.fileName);

  const url = new URL(joinUrl(CFG.ZENTAO_URL, "/file-ajaxUpload.json"));
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
    throw new Error(`截图上传响应非 JSON (${meta.fileName}): ${text.slice(0, 300)}`);
  }
  if (json.error === 0 && json.url) return String(json.url);
  if (json.result === "success" && json.url) return String(json.url);
  throw new Error(
    `截图上传失败 (${meta.fileName}): ${json.message || json.error || text.slice(0, 300)}`
  );
}

// CLI 入口：node zentao-upload.mjs <path> [<path> ...]
import { pathToFileURL } from "url";
const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("用法: node zentao-upload.mjs <图片路径> [<图片路径> ...]");
    process.exit(1);
  }
  for (const f of files) {
    try {
      const u = await uploadImage(f);
      console.log(`${basename(f)}\t${u}`);
    } catch (e) {
      console.error(`${basename(f)}\tFAIL: ${e.message}`);
      process.exitCode = 1;
    }
  }
}
