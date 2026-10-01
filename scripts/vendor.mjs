import { copyFile, mkdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await mkdir(new URL('site/vendor/', root), { recursive: true });
await copyFile(new URL('node_modules/pixi.js/dist/pixi.min.mjs', root), new URL('site/vendor/pixi.js', root));
await copyFile(new URL('node_modules/pixi.js/LICENSE', root), new URL('site/vendor/PIXI-LICENSE.txt', root));
