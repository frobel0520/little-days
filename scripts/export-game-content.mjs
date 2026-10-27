import { mkdirSync, writeFileSync } from 'node:fs';
import { storyLevels as levels, cats } from '../site/levels.js';
import { memories, reactionFor, greetingFor } from '../site/cat-behavior.js';
import { levels as smallDays, dimensions } from '../site/model.js';
import { configureLevel, surfaces } from '../site/room-model.js';

// Keep the original authored stories and dimensions as the single content source.
const chapters = levels.map(level => {
  configureLevel(level.id);
  const placed = Object.fromEntries(level.items.map(item => [item.id, { surface: 'desk' }]));
  return { ...level, surfaces: structuredClone(surfaces), reactions: Object.fromEntries(level.items.map(item => [item.id, reactionFor(level, placed, item.id)]).filter(([, value]) => value)) };
});
smallDays.forEach((day, index) => {
  const scale = 0.7;
  const box = { id: 'box', name: '待整理的小物', x: 7, y: 4.4, w: 2.7, d: 3.0, z: 0.4, accepts: false };
  const surface = { id: 'desk', name: day.scene, x: 0.8, y: 1.4, w: day.cols * scale, d: day.rows * scale, z: 1.25, accepts: true };
  const heights = { letter: 0.035, cloth: 0.12, pencils: 0.08, glasses: 0.09, cookie: 0.14, sandwich: 0.35, sweater: 0.24, shoes: 0.4, flowers: 0.65, bottle: 0.9, camera: 0.65 };
  chapters.push({
    id: `small-${index}`, number: `S${index + 1}`, title: day.title, place: day.scene,
    subtitle: day.subtitle, author: '日常小品', letter: '每件小物都能有自己的位置。不用排得完美，舒服就很好。',
    cat: null, theme: day.theme, legacy_index: index, legacy_scale: scale,
    surfaces: [surface, box],
    items: day.items.map((item, n) => {
      const [w, d] = dimensions(item).map(value => value * scale);
      return { id: item.id, name: item.name, kind: item.art, w, d, h: heights[item.art] || 0.36, color: item.color,
        story: `${item.name}，也是今天想好好留住的一點日常。`,
        initial: { surface: 'box', x: Math.min(box.x + 0.08 + (n % 3) * 0.8, box.x + box.w - w), y: Math.min(box.y + 0.1 + Math.floor(n / 3) * 0.7, box.y + box.d - d) } };
    }),
    ending: '每樣小物都回家了。不用排得完美，這樣就很好。', clue: '明天，也替自己留一點慢慢整理的時間。', next: '下一個小日常',
  });
});
const greetings = Object.fromEntries(Object.keys(cats).map(id => [id, Object.fromEntries(['hidden', 'peek', 'sit', 'sleep'].map(pose => [pose, greetingFor(id, pose)]))]));
const content = { version: 1, chapters, cats, memories, greetings };
mkdirSync(new URL('../game/data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../game/data/content.json', import.meta.url), JSON.stringify(content, null, 2) + '\n');
console.log(`Godot content: ${chapters.length} chapters, ${chapters.reduce((sum, level) => sum + level.items.length, 0)} objects.`);
