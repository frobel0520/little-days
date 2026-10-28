import { readdirSync,statSync,readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = new URL('../game-build/', import.meta.url);
const files=[];
function walk(path) { for (const name of readdirSync(path)) { const file=join(path,name);statSync(file).isDirectory()?walk(file):files.push(file); } }
walk(fileURLToPath(root));
if(files.some(file=>statSync(file).size>=25*1024*1024))throw Error('Pages asset exceeds 25 MiB');
for (const file of files.filter(file=>/engine-\d+\.bin$/.test(file))) {
  if(!gunzipSync(readFileSync(file+'.gz')).equals(readFileSync(file)))throw Error('Compressed engine does not match raw fallback');
}
const version=JSON.parse(readFileSync(new URL('version.json',root),'utf8'));
if(!/^[a-f0-9]{40}$/.test(version.commit))throw Error('Missing full source commit');
console.log(`Verified ${files.length} deployment assets and full commit version.`);
