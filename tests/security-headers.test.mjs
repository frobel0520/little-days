import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { contentSecurityPolicy, inlineScriptHashes, securityHeaders } from '../scripts/security-headers.mjs';

const html = '<html><head><script>const a = 1;</script><script src="index.js"></script><script type="text/javascript">boot();</script></head></html>';
const hash = (body) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`;

test('hashes only inline scripts', () => {
  assert.deepEqual(inlineScriptHashes(html), [hash('const a = 1;'), hash('boot();')]);
});

test('CSP allows the Godot runtime and inline hashes without unsafe-inline scripts', () => {
  const csp = contentSecurityPolicy(html);
  const script = csp.split('; ').find((part) => part.startsWith('script-src'));
  assert.ok(script.includes("'wasm-unsafe-eval'"));
  assert.ok(script.includes(hash('boot();')));
  assert.ok(!script.includes("'unsafe-inline'"));
  assert.ok(!script.split(' ').includes("'unsafe-eval'"), 'game page must not allow eval()');
  for (const directive of ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "connect-src 'self'"]) {
    assert.ok(csp.includes(directive), directive);
  }
});

test('headers apply CSP to the game root only and common headers everywhere', () => {
  const text = securityHeaders(html);
  assert.match(text, /^\/\*\n(?:  .+\n)+/);
  assert.ok(text.includes('X-Frame-Options: DENY'));
  assert.ok(text.includes('Cross-Origin-Opener-Policy: same-origin'));
  assert.equal(text.match(/Content-Security-Policy:/g).length, 2);
  assert.ok(!/^\/archive/m.test(text));
});

test('GDScript never calls JavaScriptBridge.eval, so the CSP can stay without unsafe-eval', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  const dir = new URL('../game/scripts/', import.meta.url);
  for (const name of await readdir(dir)) {
    if (!name.endsWith('.gd')) continue;
    const source = await readFile(new URL(name, dir), 'utf8');
    assert.ok(!/JavaScriptBridge\.eval\s*\(/.test(source), name);
  }
});
