import { createHash } from 'node:crypto';

/**
 * 依最終 index.html 產生 Cloudflare Pages `_headers` 的安全標頭。
 * Godot 匯出頁有內嵌 <script>，所以 CSP 用內容的 SHA-256 雜湊放行，而不是 'unsafe-inline'；
 * 雜湊在 build 時計算，HTML 改動後自動跟著更新。
 */

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

export function inlineScriptHashes(html) {
  const hashes = new Set();
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    const body = match[1] ?? '';
    hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  return [...hashes];
}

export function contentSecurityPolicy(html) {
  return [
    "default-src 'self'",
    // Godot 4 需要 'wasm-unsafe-eval' 編譯 WebAssembly。AudioWorklet 由同源的 index.audio*.worklet.js 載入，
    // 單執行緒匯出不建立 Worker，所以 script-src／worker-src 都不放 blob:（blob: 只用在游標、圖示與下載，屬 img／下載，不是 script）。
    // 不放 'unsafe-eval'：存檔、匯出入與分頁切換改由 game/web/little-days-bridge.js 提供，GDScript 不呼叫 JavaScriptBridge.eval。
    `script-src 'self' 'wasm-unsafe-eval' ${inlineScriptHashes(html).join(' ')}`.trim(),
    "worker-src 'self'",
    "connect-src 'self'",
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** 全站共用的標頭；預設全站（含 /drawer.html 與 SPA fallback 子頁）套用遊戲 CSP，/archive/ 舊版瀏覽器版獨立處理。 */
export function securityHeaders(html) {
  return `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin
  Content-Security-Policy: ${contentSecurityPolicy(html)}
/archive/*
  ! Content-Security-Policy
/archive/drawer.html
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
`;
}
