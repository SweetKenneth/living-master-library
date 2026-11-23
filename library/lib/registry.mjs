import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const packageRoot = join(here, '..');
export const catalog = JSON.parse(await readFile(join(packageRoot, 'library.catalog.json'), 'utf8'));

export const modules = Object.freeze(Object.fromEntries(catalog.modules.map((m) => [m.id, m])));
export const moduleIds = Object.freeze(catalog.modules.map((m) => m.id));

export function normalizeModuleId(input) {
  const v = String(input ?? '').trim().toLowerCase().replace(/^living/, '');
  const aliases = { press: 'press', blog: 'press', changelog: 'changelog', change: 'changelog', releases: 'changelog', guide: 'guide', founder: 'guide', docs: 'docs', doc: 'docs', documentation: 'docs', roadmap: 'roadmap', road: 'roadmap', plan: 'roadmap', planning: 'roadmap' };
  return aliases[v] ?? null;
}

export function moduleRoot(id) {
  const m = modules[id];
  if (!m) throw new Error(`Unknown Living module: ${id}`);
  return join(packageRoot, 'modules', m.package);
}
