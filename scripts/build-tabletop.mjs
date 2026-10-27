import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../prototypes/tabletop-3d/', import.meta.url));
const output = fileURLToPath(new URL('../prototype-build/tabletop-3d/index.html', import.meta.url));
const env = { ...process.env };
// Use the prepared cloud templates when present; otherwise retain Godot's normal lookup.
if (!env.XDG_DATA_HOME && existsSync('/workspace/godot-data/godot/export_templates')) {
  env.XDG_DATA_HOME = '/workspace/godot-data';
}
env.XDG_CONFIG_HOME ||= join(tmpdir(), 'little-days-godot', 'config');
env.XDG_CACHE_HOME ||= join(tmpdir(), 'little-days-godot', 'cache');
mkdirSync(new URL('../prototype-build/tabletop-3d/', import.meta.url), { recursive: true });
for (const args of [
  ['--headless', '--path', project, '--editor', '--import', '--quit'],
  ['--headless', '--path', project, '--export-release', 'Web', output],
]) {
  const result = spawnSync(process.env.GODOT_BIN || 'godot', args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('3D prototype exported. Run npm run dev and open /tabletop-3d/index.html.');
