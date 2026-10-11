// Syntax-checks every browser module and validates the data files exist and parse.
import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const walk = async dir => (await readdir(dir, { withFileTypes: true })).flatMap(d => d.isDirectory() ? [] : [path.join(dir, d.name)]);
const js = [...await walk(path.join(root, 'js')), ...await walk(path.join(root, 'js', 'pages')), ...await walk(path.join(root, 'js', 'content'))].filter(f => f.endsWith('.js'));
for (const f of js) execFileSync(process.execPath, ['--check', f]);
console.log(`✔ ${js.length} modules parse`);
for (const name of ['meta', 'missions', 'factions', 'ships', 'items', 'locations', 'terminals', 'news', 'paints']) {
  const data = JSON.parse(await readFile(path.join(root, 'data', `${name}.json`), 'utf8'));
  const n = Array.isArray(data) ? data.length : Object.keys(data).length;
  if (!n) throw new Error(`data/${name}.json is empty`);
  console.log(`✔ data/${name}.json (${n})`);
}
