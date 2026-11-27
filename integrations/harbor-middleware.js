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
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return null;
      }
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

// shared/outbound-url.ts
var LOCAL_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
  ".lan",
  ".intranet",
  ".corp",
  ".test",
  ".invalid",
  ".example"
];
var LOCAL_HOSTNAMES = /* @__PURE__ */ new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "local",
  "internal",
  "lan",
  "intranet",
  "corp",
  "test",
  "invalid",
  "example"
]);
function parseSafeHttpsUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username !== "" || url.password !== "") return null;
  if (url.port !== "" && url.port !== "443") return null;
  const hostname = stripIpv6Brackets(url.hostname.toLowerCase());
  const policyHostname = hostname.replace(/\.+$/, "");
  if (policyHostname === "" || isSuspiciousHostname(policyHostname) || isBlockedIpLiteral(policyHostname)) {
    return null;
  }
  return url;
}
function normalizeSafeHttpsUrl(value) {
  const url = parseSafeHttpsUrl(value);
  if (url === null) return null;
  const path = url.pathname.replace(/[/]+$/, "");
  return `${url.origin}${path}`;
}
function isSuspiciousHostname(hostname) {
  if (LOCAL_HOSTNAMES.has(hostname)) return true;
  if (!hostname.includes(".") && !hostname.includes(":")) return true;
  return LOCAL_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}
function isBlockedIpLiteral(hostname) {
  const ipv4 = parseIpv4(hostname);
  if (ipv4 !== null) return isBlockedIpv4(ipv4);
  const ipv6 = parseIpv6(hostname);
  if (ipv6 === null) return false;
  if (isIpv4Mapped(ipv6)) {
    const high = ipv6[6];
    const low = ipv6[7];
    if (high === void 0 || low === void 0) return true;
    return isBlockedIpv4([high >>> 8, high & 255, low >>> 8, low & 255]);
  }
  const [first, second] = ipv6;
  if (first === void 0 || second === void 0) return true;
  if (ipv6.every((word) => word === 0)) return true;
  if (ipv6.slice(0, 7).every((word) => word === 0) && ipv6[7] === 1) return true;
  if ((first & 65024) === 64512) return true;
  if ((first & 65472) === 65152) return true;
  if ((first & 65280) === 65280) return true;
  if (matchesPrefix(ipv6, [8193, 3512], 32)) return true;
  if (matchesPrefix(ipv6, [8193, 0], 32)) return true;
  if (matchesPrefix(ipv6, [8193, 1], 32)) return true;
  if (matchesPrefix(ipv6, [8193, 2], 48)) return true;
  if (matchesPrefix(ipv6, [8193, 16], 28)) return true;
  if (matchesPrefix(ipv6, [8193, 32], 28)) return true;
  if (matchesPrefix(ipv6, [8194], 16)) return true;
  if (matchesPrefix(ipv6, [16383], 20)) return true;
  if (matchesPrefix(ipv6, [256, 0, 0, 0], 64)) return true;
  return (first & 57344) !== 8192;
}
function isBlockedIpv4(octets) {
  const [first, second, third] = octets;
  if (first === void 0 || second === void 0 || third === void 0) return true;
  return first === 0 || first === 10 || first === 127 || first === 100 && second >= 64 && second <= 127 || first === 169 && second === 254 || first === 172 && second >= 16 && second <= 31 || first === 192 && second === 168 || first === 192 && second === 0 && third === 0 || first === 192 && second === 0 && third === 2 || first === 192 && second === 31 && third === 196 || first === 192 && second === 52 && third === 193 || first === 192 && second === 88 && third === 99 || first === 198 && (second === 18 || second === 19 || second === 51 && third === 100) || first === 203 && second === 0 && third === 113 || first >= 224;
}
function parseIpv4(value) {
  if (!/^\d+(?:\.\d+){3}$/.test(value)) return null;
  const octets = value.split(".").map(Number);
  return octets.length === 4 && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) ? octets : null;
}
function parseIpv6(value) {
  if (!value.includes(":") || value.includes("%")) return null;
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const left = parseIpv6Words(halves[0] ?? "");
  const right = parseIpv6Words(halves.length === 2 ? halves[1] ?? "" : "");
  if (left === null || right === null) return null;
  if (halves.length === 1) {
    return left.length === 8 ? left : null;
  }
  const missing = 8 - left.length - right.length;
  if (missing < 1) return null;
  return [...left, ...new Array(missing).fill(0), ...right];
}
function parseIpv6Words(value) {
  if (value === "") return [];
  const pieces = value.split(":");
  const words = [];
  for (const [index, piece] of pieces.entries()) {
    if (piece.includes(".")) {
      if (index !== pieces.length - 1) return null;
      const ipv4 = parseIpv4(piece);
      if (ipv4 === null) return null;
      const [first, second, third, fourth] = ipv4;
      if (first === void 0 || second === void 0 || third === void 0 || fourth === void 0) return null;
      words.push(first << 8 | second, third << 8 | fourth);
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/i.test(piece)) return null;
    words.push(Number.parseInt(piece, 16));
  }
  return words.length <= 8 ? words : null;
}
function isIpv4Mapped(words) {
  return words.slice(0, 5).every((word) => word === 0) && words[5] === 65535;
}
function matchesPrefix(words, prefix, bits) {
  const wholeWords = Math.floor(bits / 16);
  const remainingBits = bits % 16;
  for (let index = 0; index < wholeWords; index += 1) {
    if (words[index] !== prefix[index]) return false;
  }
  if (remainingBits === 0) return true;
  const mask = 65535 << 16 - remainingBits & 65535;
  return ((words[wholeWords] ?? 0) & mask) === ((prefix[wholeWords] ?? 0) & mask);
}
function stripIpv6Brackets(hostname) {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

// shared/types.ts
var SLUG_PATTERN = /^[a-z0-9-]{2,40}$/;

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
  if (config.project !== input.slug) {
    return pass("Harbor \u8A2D\u5B9A\u5C08\u6848\u4E0D\u7B26\uFF0Cfail-open");
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
  if (lower.startsWith("/api/")) return false;
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
  const parsedBase = parseSafeHttpsUrl(baseUrl);
  if (parsedBase === null || parsedBase.search !== "" || parsedBase.hash !== "" || !SLUG_PATTERN.test(slug)) {
    return null;
  }
  return {
    baseUrl: normalizeSafeHttpsUrl(baseUrl),
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
  const previewCookie = decision.setPreviewCookie;
  if (previewCookie !== null && (context.request.method === "GET" || context.request.method === "HEAD")) {
    const cleanUrl = new URL(context.request.url);
    cleanUrl.searchParams.delete(PREVIEW_QUERY_PARAM);
    const redirect = new Response(null, {
      status: 302,
      headers: {
        location: cleanUrl.toString(),
        "cache-control": "no-store",
        "referrer-policy": "no-referrer"
      }
    });
    redirect.headers.append("set-cookie", previewCookieHeader(previewCookie));
    return redirect;
  }
  const response = await context.next();
  if (previewCookie === null) return response;
  const withCookie = new Response(response.body, response);
  withCookie.headers.append("set-cookie", previewCookieHeader(previewCookie));
  return withCookie;
}
function previewCookieHeader(cookie) {
  return `${PREVIEW_COOKIE_NAME}=${encodeURIComponent(cookie.token)}; Path=/; Max-Age=${cookie.maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
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
    const response = await fetch(configUrl, { signal: controller.signal, redirect: "manual" });
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
