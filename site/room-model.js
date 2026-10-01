import {levels} from './levels.js';
// All gameplay positions are continuous world coordinates. No visible or hidden snap grid.
export const PROJECTION = { x: 43, y: 22, z: 48, originX: 480, originY: 242 };
export function project(x, y, z = 0) { return { x: PROJECTION.originX + (x - y) * PROJECTION.x, y: PROJECTION.originY + (x + y) * PROJECTION.y - z * PROJECTION.z }; }
export function inverse(px, py, z = 0) {
  const a = (px - PROJECTION.originX) / PROJECTION.x;
  const b = (py - PROJECTION.originY + z * PROJECTION.z) / PROJECTION.y;
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
const baseSurfaces = [
  { id: 'desk', name: '書桌', x: 1.1, y: 1.4, w: 4.3, d: 2.15, z: 1.62, accepts: true, group: 'desk' },
  { id: 'shelf-low', name: '下層架', x: 6.85, y: .65, w: 2.5, d: 1.08, z: 1.0, accepts: true, group: 'shelf' },
  { id: 'shelf-high', name: '上層架', x: 6.85, y: .65, w: 2.5, d: 1.08, z: 2.4, accepts: true, group: 'shelf' },
  { id: 'drawer', name: '小抽屜', x: 1.5, y: 3.6, w: 1.7, d: 1.05, z: 1.08, accepts: true, group: 'desk' },
  { id: 'floor', name: '地毯', x: 2.4, y: 4.65, w: 3.25, d: 2.6, z: .035, accepts: true, group: 'rug' },
  { id: 'box', name: '搬家箱', x: 7.05, y: 4.6, w: 2.35, d: 1.8, z: .48, accepts: false, group: 'box' }
];
export let surfaces = baseSurfaces.map(s=>({...s}));
export let items = levels[0].items;
export function configureLevel(id){const level=levels.find(level=>level.id===id);if(!level)throw new Error('Unknown level');items=level.items;surfaces=baseSurfaces.map(s=>({...s,...level.layout?.[s.id],name:level.surfaceNames[s.id]||s.name}));return level;}

export function size(it, orientation = 0) { return orientation % 2 ? { w: it.d, d: it.w } : { w: it.w, d: it.d }; }
export function fit(surfaceId, itemId, x, y, orientation = 0) {
  const s = surfaces.find(s => s.id === surfaceId), it = items.find(i => i.id === itemId);
  if (!s || !it || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isInteger(orientation)) return null;
  const { w, d } = size(it, orientation);
  if (w > s.w || d > s.d) return null;
  return { surface: s.id, x: Math.max(s.x, Math.min(s.x + s.w - w, x)), y: Math.max(s.y, Math.min(s.y + s.d - d, y)), orientation: ((orientation % 4) + 4) % 4 };
}
export function surfaceAt(px, py, itemId, orientation = 0, preferred = null) {
  const candidates = surfaces.filter(s => {
    const p = inverse(px, py, s.z);
    return p.x >= s.x - .12 && p.x <= s.x + s.w + .12 && p.y >= s.y - .12 && p.y <= s.y + s.d + .12;
  });
  // A explicitly chosen surface resolves overlaps between shelf tiers and the desk.
  candidates.sort((a, b) => (b.id === preferred) - (a.id === preferred) || b.z - a.z);
  for (const s of candidates) {
    const p = inverse(px, py, s.z), { w, d } = size(items.find(i => i.id === itemId), orientation);
    const placement = fit(s.id, itemId, p.x - w / 2, p.y - d / 2, orientation);
    if (placement) return placement;
  }
  return null;
}
export function initialState() { return Object.fromEntries(items.map(it => [it.id, { ...it.initial, orientation: 0 }])); }
export function isValid(id, p) {
  if (!p || !Number.isInteger(p.orientation) || p.orientation < 0 || p.orientation > 3) return false;
  const fitted = fit(p.surface, id, p.x, p.y, p.orientation);
  return !!fitted && Math.abs(fitted.x - p.x) < 1e-6 && Math.abs(fitted.y - p.y) < 1e-6;
}
export function ready(state) { return items.every(it => isValid(it.id, state[it.id]) && surfaces.find(s => s.id === state[it.id].surface)?.accepts); }
export function depth(p, it) { const { w, d } = size(it, p.orientation); return p.x + p.y + (w + d) / 2; }
// Keep overlapping small objects visible rather than rejecting the player's arrangement.
export function gentlePlacement(state, itemId, requested) {
  const it = items.find(i => i.id === itemId), s = surfaces.find(s => s.id === requested?.surface);
  if (!it || !s) return null;
  const { w, d } = size(it, requested.orientation);
  const overlapScore = p => Object.entries(state).reduce((score, [id, o]) => {
    if (id === itemId || o.surface !== p.surface) return score;
    const other = items.find(i => i.id === id); if (!other) return score;
    const os = size(other, o.orientation);
    const area = Math.max(0, Math.min(p.x + w, o.x + os.w) - Math.max(p.x, o.x)) * Math.max(0, Math.min(p.y + d, o.y + os.d) - Math.max(p.y, o.y));
    return score + area / Math.min(w * d, os.w * os.d);
  }, 0);
  let best = fit(s.id, it.id, requested.x, requested.y, requested.orientation), score = overlapScore(best);
  if (score < .48) return best;
  for (const [dx,dy] of [[.22,0],[-.22,0],[0,.22],[0,-.22],[.35,.25],[-.35,-.25],[.55,0],[0,.5]]) {
    const p = fit(s.id, it.id, requested.x + dx, requested.y + dy, requested.orientation), n = overlapScore(p);
    if (n < score) { best = p; score = n; }
  }
  return best;
}
