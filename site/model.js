const item = (id, name, art, w, h, color, x, y) => ({ id, name, art, w, h, color, home: { x, y, rotated: false } });
export const levels = [
  { title: '陽光下的抽屜', subtitle: '把喜歡的小東西，放回剛剛好的位置。', scene: '書桌抽屜', cols: 6, rows: 4, theme: 'desk',
    items: [item('book', '草綠筆記本', 'book', 2, 3, '#b9cfad', 0, 0), item('camera', '小相機', 'camera', 2, 2, '#f0c2ae', 2, 0), item('tin', '收藏小鐵盒', 'tin', 2, 2, '#bfd6dd', 4, 0), item('pencils', '彩色鉛筆', 'pencils', 4, 1, '#f0d49c', 2, 2), item('letter', '一封來信', 'letter', 3, 1, '#f1e1bf', 0, 3), item('glasses', '圓圓眼鏡', 'glasses', 3, 1, '#d4c3df', 3, 3)] },
  { title: '一起去野餐', subtitle: '今天的好心情，也一起裝進籃子裡。', scene: '野餐籃', cols: 6, rows: 5, theme: 'picnic',
    items: [item('lunch', '午餐盒', 'lunch', 3, 2, '#b9cfad', 0, 0), item('bottle', '檸檬水', 'bottle', 1, 3, '#bfd6dd', 3, 0), item('napkin', '格紋餐巾', 'cloth', 2, 2, '#f0c2ae', 4, 0), item('apple', '蘋果小盒', 'apple', 2, 2, '#eac1b6', 0, 2), item('sandwich', '小小三明治', 'sandwich', 1, 2, '#f0d49c', 2, 2), item('fork', '木頭餐具', 'pencils', 2, 1, '#d4c3df', 4, 2), item('blanket', '野餐墊', 'cloth', 3, 1, '#b9cfad', 3, 3), item('letter', '野餐明信片', 'letter', 2, 1, '#f1e1bf', 0, 4), item('cookie', '奶油餅乾', 'cookie', 2, 1, '#f0d49c', 2, 4), item('flowers', '一束小花', 'flowers', 2, 1, '#d4c3df', 4, 4)] },
  { title: '週末的小旅行', subtitle: '行李不多，期待卻裝得滿滿的。', scene: '週末行李', cols: 6, rows: 5, theme: 'travel',
    items: [item('sweater', '柔軟毛衣', 'sweater', 3, 3, '#b9cfad', 0, 0), item('camera', '旅行相機', 'camera', 2, 2, '#f0c2ae', 3, 0), item('bottle', '隨身水壺', 'bottle', 1, 3, '#bfd6dd', 5, 0), item('book', '口袋旅遊手帳', 'book', 2, 1, '#f0d49c', 3, 2), item('shoes', '舒服的鞋子', 'shoes', 3, 2, '#e9c4ba', 0, 3), item('pouch', '盥洗小包', 'pouch', 2, 2, '#d4c3df', 3, 3), item('letter', '車票與地圖', 'letter', 1, 2, '#f1e1bf', 5, 3)] },
  { title: '手作的午後', subtitle: '替每一點靈感，留一個小小的家。', scene: '手作盒', cols: 7, rows: 5, theme: 'craft',
    items: [item('cloth', '花布', 'cloth', 3, 2, '#f0c2ae', 0, 0), item('tin', '鈕扣盒', 'tin', 2, 2, '#bfd6dd', 3, 0), item('book', '靈感筆記', 'book', 2, 3, '#b9cfad', 5, 0), item('pencils', '畫筆', 'pencils', 3, 1, '#f0d49c', 0, 2), item('pouch', '針線包', 'pouch', 2, 3, '#d4c3df', 3, 2), item('flowers', '乾燥小花', 'flowers', 3, 2, '#eac1b6', 0, 3), item('cookie', '下午茶餅乾', 'cookie', 2, 2, '#f1e1bf', 5, 3)] },
  { title: '新家的第一天', subtitle: '把熟悉的小日子，搬進新的生活。', scene: '搬家紙箱', cols: 7, rows: 6, theme: 'home',
    items: [item('sweater', '最喜歡的毛衣', 'sweater', 3, 3, '#b9cfad', 0, 0), item('lunch', '木頭收納盒', 'lunch', 4, 2, '#f0d49c', 3, 0), item('letter', '珍藏的信', 'letter', 4, 1, '#f1e1bf', 3, 2), item('book', '床邊讀物', 'book', 2, 3, '#bfd6dd', 0, 3), item('pouch', '小熊零錢包', 'pouch', 2, 2, '#f0c2ae', 2, 3), item('camera', '回憶相機', 'camera', 3, 2, '#d4c3df', 4, 3), item('glasses', '閱讀眼鏡', 'glasses', 3, 1, '#eac1b6', 2, 5), item('tin', '小寶物盒', 'tin', 2, 1, '#b9cfad', 5, 5)] }
];
// Natural object proportions in a continuous local coordinate system, not cells.
const sizes = {
  book: [1.28, 1.95], camera: [1.62, 1.32], tin: [1.22, 1.36],
  pencils: [2.45, .48], letter: [1.8, .83], glasses: [1.7, .64],
  lunch: [2.05, 1.48], bottle: [.65, 1.85], cloth: [1.65, 1.4],
  apple: [1.1, 1.18], sandwich: [.85, 1.08], cookie: [1.38, .9],
  flowers: [1.85, 1.16], sweater: [2.2, 1.9], shoes: [1.85, 1.3], pouch: [1.35, 1.2]
};
export function dimensions(item, rotated = false) {
  const [w, h] = sizes[item.art] || [item.w, item.h];
  return rotated ? [h, w] : [w, h];
}
export function canPlace(level, placements, id, x, y, rotated = false) {
  const it = level.items.find(i => i.id === id);
  if (!it || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  const [w, h] = dimensions(it, rotated);
  // Layering is welcome. Completion cares about bringing things home, not perfect packing.
  return x >= 0 && y >= 0 && x + w <= level.cols + 1e-8 && y + h <= level.rows + 1e-8;
}
export function fitInside(level, id, x, y, rotated = false) {
  const it = level.items.find(i => i.id === id);
  if (!it || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const [w, h] = dimensions(it, rotated);
  return { x: Math.max(0, Math.min(level.cols - w, x)), y: Math.max(0, Math.min(level.rows - h, y)), rotated };
}
export function isComplete(level, placements) {
  return level.items.every(i => {
    const p = placements[i.id];
    return p && canPlace(level, placements, i.id, p.x, p.y, p.rotated);
  });
}
export function suggestion(level, placements, id, rotated = false) {
  const it = level.items.find(i => i.id === id);
  const [w, h] = dimensions(it, rotated);
  // Suggest a quiet spot with the least overlap; the player can put it anywhere.
  let best = null, score = Infinity;
  for (let y = .12; y <= level.rows - h; y += .2) for (let x = .12; x <= level.cols - w; x += .2) {
    let overlap = 0;
    for (const [otherId, p] of Object.entries(placements)) {
      if (otherId === id) continue;
      const other = level.items.find(i => i.id === otherId); if (!other) continue;
      const [ow, oh] = dimensions(other, p.rotated);
      overlap += Math.max(0, Math.min(x + w, p.x + ow) - Math.max(x, p.x)) * Math.max(0, Math.min(y + h, p.y + oh) - Math.max(y, p.y));
    }
    if (overlap < score) { score = overlap; best = { x, y, rotated }; }
  }
  return best || fitInside(level, id, 0, 0, rotated);
}
// Affine projection inversion keeps dragging accurate on the tilted floor, at any screen size.
export function unproject(point, origin, right, bottom, width, height) {
  const ax = right.x - origin.x, ay = right.y - origin.y;
  const bx = bottom.x - origin.x, by = bottom.y - origin.y;
  const dx = point.x - origin.x, dy = point.y - origin.y;
  const det = ax * by - ay * bx;
  return { x: (dx * by - dy * bx) / det * width, y: (ax * dy - ay * dx) / det * height };
}
