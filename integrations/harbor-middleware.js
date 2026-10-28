// Harbor managed-project middleware.
// 由 Harbor 的 `npm run build:middleware` 產生，請勿手動編輯。
// 已寫入 Harbor 網址 https://harbor-1wk.pages.dev、slug little-days、豁免路徑 /api/health；只需設定 secret HARBOR_PREVIEW_SECRET。

// shared/cookie.ts
function readCookie(header, name) {
  if (header === null) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return null;
}

// shared/runtime-config.ts
function parseRuntimeConfig(value) {
  if (!isRecord(value)) return null;
  const { project, version, maintenance, flags, banner } = value;
  if (typeof project !== "string" || project.length === 0) return null;
  if (typeof version !== "number" || !Number.isFinite(version)) return null;
  const parsedMaintenance = parseMaintenance(maintenance);
  if (parsedMaintenance === null) return null;
  const parsedFlags = parseFlags(flags);
  if (parsedFlags === null) return null;
  const parsedBanner = parseBanner(banner);
  if (parsedBanner === void 0) return null;
  return {
    project,
    version,
    maintenance: parsedMaintenance,
    flags: parsedFlags,
    banner: parsedBanner
  };
}
function parseMaintenance(value) {
  if (!isRecord(value)) return null;
  if (typeof value.enabled !== "boolean") return null;
  if (!isNullableString(value.message)) return null;
  if (!isNullableString(value.eta)) return null;
  return { enabled: value.enabled, message: value.message, eta: value.eta };
}
function parseFlags(value) {
  if (!isRecord(value)) return null;
  const flags = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== "boolean" && typeof raw !== "string") return null;
    flags[key] = raw;
  }
  return flags;
}
function parseBanner(value) {
  if (value === null || value === void 0) return null;
  if (!isRecord(value)) return void 0;
  if (typeof value.message !== "string") return void 0;
  if (value.severity !== "info" && value.severity !== "warn") return void 0;
  if (!isNullableString(value.expiresAt)) return void 0;
  return { message: value.message, severity: value.severity, expiresAt: value.expiresAt };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNullableString(value) {
  return value === null || typeof value === "string";
}

// shared/hmac.ts
var MIN_SECRET_LENGTH = 32;
function isUsableSecret(secret) {
  return typeof secret === "string" && secret.length >= MIN_SECRET_LENGTH;
}
async function hmacSign(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=+$/, "").replace(/[+]/g, "-").replace(/[/]/g, "_");
}

// shared/preview-token.ts
async function verifyPreviewToken(token, options) {
  if (!isUsableSecret(options.secret)) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [slug, expText, signature] = parts;
  if (slug !== options.slug) return false;
  const exp = Number.parseInt(expText, 10);
  if (!Number.isFinite(exp)) return false;
  const now = options.now ?? Math.floor(Date.now() / 1e3);
  if (exp <= now) return false;
  const expected = await hmacSign(options.secret, `${slug}.${expText}`);
  return timingSafeEqual(signature, expected);
}
function previewTokenExpiry(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const exp = Number.parseInt(parts[1], 10);
  return Number.isFinite(exp) ? exp : null;
}

// shared/maintenance-gate.ts
var PREVIEW_COOKIE_NAME = "harbor_preview";
var PREVIEW_QUERY_PARAM = "harbor_preview";
var DEFAULT_RETRY_AFTER_SECONDS = 300;
var MIN_RETRY_AFTER_SECONDS = 30;
var MAX_RETRY_AFTER_SECONDS = 3600;
var EXEMPT_EXTENSIONS = [
  ".css",
  ".js",
  ".mjs",
  ".map",
  ".json",
  ".txt",
  ".xml",
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".avif",
  ".woff",
  ".woff2",
  ".ttf",
  ".mp4",
  ".webm"
];
async function decideMaintenanceGate(input) {
  if (isExemptPath(input.pathname, input.extraExemptPaths)) {
    return pass("\u8C41\u514D\u8DEF\u5F91");
  }
  const now = input.now ?? Math.floor(Date.now() / 1e3);
  const cookieToken = readCookie(input.cookieHeader, PREVIEW_COOKIE_NAME);
  if (cookieToken !== null) {
    const valid = await verifyPreviewToken(cookieToken, {
      secret: input.previewSecret,
      slug: input.slug,
      now
    });
    if (valid) return pass("\u7BA1\u7406\u8005\u9810\u89BD cookie");
  }
  if (input.previewToken !== null) {
    const valid = await verifyPreviewToken(input.previewToken, {
      secret: input.previewSecret,
      slug: input.slug,
      now
    });
    if (valid) {
      const expiry = previewTokenExpiry(input.previewToken);
      return {
        kind: "pass",
        reason: "\u7BA1\u7406\u8005\u9810\u89BD token",
        setPreviewCookie: {
          token: input.previewToken,
          maxAgeSeconds: expiry === null ? 0 : Math.max(0, expiry - now)
        }
      };
    }
  }
  let raw;
  try {
    raw = await input.loadConfig();
  } catch {
    return pass("\u8B80\u53D6 Harbor \u8A2D\u5B9A\u5931\u6557\uFF0Cfail-open");
  }
  const config = parseRuntimeConfig(raw);
  if (config === null) {
    return pass("Harbor \u8A2D\u5B9A\u683C\u5F0F\u4E0D\u7B26\uFF0Cfail-open");
  }
  if (!config.maintenance.enabled) {
    return pass("\u7DAD\u8B77\u6A21\u5F0F\u672A\u958B\u555F");
  }
  return {
    kind: "block",
    maintenance: config.maintenance,
    retryAfterSeconds: retryAfterFrom(config.maintenance.eta, now)
  };
}
function isExemptPath(pathname, extraPaths = []) {
  if (matchesPath(pathname, "/health")) return true;
  if (extraPaths.some((path) => matchesPath(pathname, path))) return true;
  const lower = pathname.toLowerCase();
  return EXEMPT_EXTENSIONS.some((extension) => lower.endsWith(extension));
}
function matchesPath(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}
function retryAfterFrom(eta, now) {
  if (eta === null) return DEFAULT_RETRY_AFTER_SECONDS;
  const parsed = Date.parse(eta);
  if (Number.isNaN(parsed)) return DEFAULT_RETRY_AFTER_SECONDS;
  const seconds = Math.round(parsed / 1e3) - now;
  if (seconds <= 0) return MIN_RETRY_AFTER_SECONDS;
  return Math.min(Math.max(seconds, MIN_RETRY_AFTER_SECONDS), MAX_RETRY_AFTER_SECONDS);
}
function pass(reason) {
  return { kind: "pass", reason, setPreviewCookie: null };
}
function resolveHarborConnection(env, baked) {
  const baseUrl = nonEmpty(env.HARBOR_BASE_URL) ?? nonEmpty(baked.baseUrl);
  const slug = nonEmpty(env.HARBOR_PROJECT_SLUG) ?? nonEmpty(baked.slug);
  if (baseUrl === null || slug === null) return null;
  return {
    baseUrl: baseUrl.replace(/[/]+$/, ""),
    slug,
    previewSecret: env.HARBOR_PREVIEW_SECRET ?? ""
  };
}
function nonEmpty(value) {
  const trimmed = value?.trim();
  return trimmed === void 0 || trimmed.length === 0 ? null : trimmed;
}

// integrations/managed-middleware.ts
var BAKED = {
  baseUrl: true ? "https://harbor-1wk.pages.dev" : void 0,
  slug: true ? "little-days" : void 0
};
var BAKED_EXEMPT_PATHS = true ? ["/api/health"] : [];
var CONFIG_TIMEOUT_MS = 800;
var CACHE_TTL_SECONDS = 30;
var onRequest = async (context) => {
  try {
    return await applyGate(context);
  } catch {
    return context.next();
  }
};
async function applyGate(context) {
  const connection = resolveHarborConnection(context.env, BAKED);
  if (connection === null) {
    return context.next();
  }
  const url = new URL(context.request.url);
  const decision = await decideMaintenanceGate({
    pathname: url.pathname,
    cookieHeader: context.request.headers.get("cookie"),
    previewToken: url.searchParams.get(PREVIEW_QUERY_PARAM),
    slug: connection.slug,
    previewSecret: connection.previewSecret,
    extraExemptPaths: BAKED_EXEMPT_PATHS,
    loadConfig: () => loadRuntimeConfig(context, connection)
  });
  if (decision.kind === "block") {
    return maintenanceResponse(decision.maintenance, decision.retryAfterSeconds);
  }
  const response = await context.next();
  if (decision.setPreviewCookie === null) return response;
  const withCookie = new Response(response.body, response);
  withCookie.headers.append(
    "set-cookie",
    `${PREVIEW_COOKIE_NAME}=${encodeURIComponent(decision.setPreviewCookie.token)}; Path=/; Max-Age=${decision.setPreviewCookie.maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`
  );
  return withCookie;
}
async function loadRuntimeConfig(context, connection) {
  const configUrl = `${connection.baseUrl}/api/v1/public/runtime-config?project=${encodeURIComponent(connection.slug)}`;
  const cacheKey = new Request(configUrl, { method: "GET" });
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached !== void 0) return cached.json();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);
  try {
    const response = await fetch(configUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Harbor \u56DE\u61C9 ${response.status}`);
    }
    const forCache = new Response(response.clone().body, response);
    forCache.headers.set("cache-control", `public, max-age=${CACHE_TTL_SECONDS}`);
    context.waitUntil(cache.put(cacheKey, forCache));
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
function maintenanceResponse(maintenance, retryAfter) {
  const message = maintenance.message ?? "\u9019\u500B\u7DB2\u7AD9\u6B63\u5728\u7DAD\u8B77\u4E2D\uFF0C\u7A0D\u5F8C\u56DE\u4F86\u5C31\u597D\u3002";
  const eta = maintenance.eta === null ? "" : `<p class="eta">\u9810\u8A08\u6062\u5FA9\uFF1A${escapeHtml(maintenance.eta)}</p>`;
  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>\u7DAD\u8B77\u4E2D</title>
<style>
:root { color-scheme: light dark; }
body {
  margin: 0; min-height: 100svh; display: grid; place-items: center;
  padding: 24px; background: #f6f7f9; color: #1b1f26;
  font: 16px/1.6 system-ui, -apple-system, "Segoe UI", "Noto Sans TC", sans-serif;
}
@media (prefers-color-scheme: dark) { body { background: #14171c; color: #e6e9ee; } }
main { max-width: 30rem; text-align: center; }
h1 { font-size: 1.5rem; margin: 0 0 0.75rem; }
p { margin: 0 0 0.5rem; }
.eta { opacity: 0.7; font-size: 0.9rem; }
</style>
</head>
<body>
<main>
<h1>\u7DAD\u8B77\u4E2D</h1>
<p>${escapeHtml(message)}</p>
${eta}
</main>
</body>
</html>`;
  return new Response(html, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "retry-after": String(retryAfter),
      "cache-control": "no-store"
    }
  });
}
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
export {
  onRequest
};
