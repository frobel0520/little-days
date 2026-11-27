import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { onRequest } from '../functions/_middleware.js';

test('version readback stays available without consulting maintenance configuration', async () => {
  const env = Object.defineProperty({}, 'HARBOR_BASE_URL', {get() {throw Error('Maintenance lookup must not run for version receipts');}});
  const response = await onRequest({request:new Request('https://example.com/version.json'),env,next:()=>Response.json({commit:'a'.repeat(40)},{headers:{'Cache-Control':'no-store'}})});
  assert.equal(response.status,200);
  assert.equal((await response.json()).commit,'a'.repeat(40));
  assert.equal(response.headers.get('Cache-Control'),'no-store');
});

test('malformed preview cookie does not trigger URIError fail-open during maintenance', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: {
      default: {
        match: async () => ({
          json: async () => ({
            project: 'little-days',
            version: 1,
            maintenance: { enabled: true, message: '維護測試中', eta: null },
            flags: {},
            banner: null,
          }),
        }),
      },
    },
  });
  try {
    let reached = false;
    const response = await onRequest({
      request: new Request('https://example.com/', { headers: { cookie: 'harbor_preview=%' } }),
      env: { HARBOR_PREVIEW_SECRET: 's'.repeat(32) },
      next: async () => {
        reached = true;
        return new Response('game');
      },
      waitUntil: () => {},
    });
    assert.equal(response.status, 503);
    assert.equal(reached, false);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'caches', previous);
    else delete globalThis.caches;
  }
});

test('valid preview query token redirects with 302 to strip harbor_preview from URL', async () => {
  const secret = 's'.repeat(32);
  const exp = Math.floor(Date.now() / 1000) + 600;
  const sig = createHmac('sha256', secret).update(`little-days.${exp}`).digest('base64url');
  const token = `little-days.${exp}.${sig}`;

  const response = await onRequest({
    request: new Request(`https://example.com/?harbor_preview=${encodeURIComponent(token)}&keep=1`),
    env: { HARBOR_PREVIEW_SECRET: secret },
    next: async () => new Response('game'),
    waitUntil: () => {},
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://example.com/?keep=1');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(response.headers.get('set-cookie') ?? '', /^harbor_preview=/);
});
