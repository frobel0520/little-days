export function onRequestGet() {
  return Response.json({ status: 'ok', service: 'little-days' }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
