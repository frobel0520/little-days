import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/_middleware.js';

test('version readback stays available without consulting maintenance configuration', async () => {
  const env = Object.defineProperty({}, 'HARBOR_BASE_URL', {get() {throw Error('Maintenance lookup must not run for version receipts');}});
  const response = await onRequest({request:new Request('https://example.com/version.json'),env,next:()=>Response.json({commit:'a'.repeat(40)},{headers:{'Cache-Control':'no-store'}})});
  assert.equal(response.status,200);
  assert.equal((await response.json()).commit,'a'.repeat(40));
  assert.equal(response.headers.get('Cache-Control'),'no-store');
});
