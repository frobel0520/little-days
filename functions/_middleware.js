import { onRequest as harborGate } from '../integrations/harbor-middleware.js';
// A public source-version receipt must remain readable during maintenance.
export function onRequest(context) {
  return new URL(context.request.url).pathname === '/version.json'
    ? context.next()
    : harborGate(context);
}
