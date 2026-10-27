import './export-game-content.mjs';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../game/', import.meta.url));
const destination = new URL('../game-build/', import.meta.url);
mkdirSync(destination, { recursive: true });
const env = { ...process.env };
if (!env.XDG_DATA_HOME && existsSync('/workspace/godot-data/godot/export_templates')) env.XDG_DATA_HOME = '/workspace/godot-data';
env.XDG_CONFIG_HOME ||= join(tmpdir(), 'little-days-godot', 'config');
env.XDG_CACHE_HOME ||= join(tmpdir(), 'little-days-godot', 'cache');
for (const args of [
  ['--headless', '--path', project, '--editor', '--import', '--quit'],
  ['--headless', '--path', project, '--export-release', 'Web', fileURLToPath(new URL('index.html', destination))],
]) {
  const result = spawnSync(process.env.GODOT_BIN || 'godot', args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

// Godot's engine exceeds the static host's per-file limit. Stream small parts
// as the original WASM response; gameplay and the engine binary are unchanged.
const wasm = readFileSync(new URL('index.wasm', destination));
const parts = [];
for (let offset = 0; offset < wasm.length; offset += 12 * 1024 * 1024) {
  const name = `engine-${parts.length}.bin`;
  writeFileSync(new URL(name, destination), wasm.subarray(offset, offset + 12 * 1024 * 1024));
  parts.push(name);
}
const loader = `<script>
(() => {
  const fetchOriginal = window.fetch.bind(window);
  const engineUrl = new URL('index.wasm', location.href);
  const parts = ${JSON.stringify(parts)};
  window.fetch = (input, options) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
    if (url.href !== engineUrl.href) return fetchOriginal(input, options);
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (const part of parts) {
            const response = await fetchOriginal(new URL(part, engineUrl), options);
            if (!response.ok) throw new Error('Cannot load engine part: ' + part);
            const reader = response.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          }
          controller.close();
        } catch (error) { controller.error(error); }
      }
    });
    return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'application/wasm', 'Content-Length': '${wasm.length}' } }));
  };
})();
</script>\n`;
const htmlPath = new URL('index.html', destination);
const html = readFileSync(htmlPath, 'utf8')
  .replace('<html lang="en">', '<html lang="zh-Hant">')
  .replace('<title>Little Days 3D</title>', '<title>小日子收納 · 街角的貓</title>')
  .replaceAll('background-color: black;', 'background-color: #f1ede3;')
  .replaceAll('background-color: #242424;', 'background-color: #f1ede3;');
if (!html.includes('<script src="index.js"></script>')) throw new Error('Unexpected Godot HTML shell; engine loader was not installed.');
writeFileSync(htmlPath, html.replace('<script src="index.js"></script>', loader + '<script src="index.js"></script>'));
rmSync(new URL('index.wasm', destination));
cpSync(new URL('../site/', import.meta.url), new URL('archive/', destination), { recursive: true });
cpSync(new URL('../game/assets/FONT-LICENSE.txt', import.meta.url), new URL('FONT-LICENSE.txt', destination));
console.log('Little Days 3D exported. npm run dev serves the new game at /. Original browser versions are archived at /archive/.');
