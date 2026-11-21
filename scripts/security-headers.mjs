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
    // Godot 4 需要 'wasm-unsafe-eval' 編譯 WebAssembly；AudioWorklet 以 blob: 模組載入。
    // 'unsafe-eval'：game.gd／storage.gd 以 JavaScriptBridge.eval 讀寫 localStorage 存檔、匯出入進度與偵測分頁切換，
    // 移除前須先改用 get_interface／create_callback 並以 Godot 重新建置驗證（見 progress.md 待辦）。
    `script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval' blob: ${inlineScriptHashes(html).join(' ')}`.trim(),
    "worker-src 'self' blob:",
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

/** 全站共用的標頭；CSP 只套在遊戲首頁，/archive/ 的舊版瀏覽器版不受影響。 */
export function securityHeaders(html) {
  return `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin
/
  Content-Security-Policy: ${contentSecurityPolicy(html)}
/index.html
  Content-Security-Policy: ${contentSecurityPolicy(html)}
`;
}
