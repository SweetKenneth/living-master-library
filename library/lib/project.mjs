import { mkdir, readFile, rename, writeFile, copyFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { moduleIds, modules, moduleRoot, catalog } from './registry.mjs';

export function projectPaths(rootInput = process.cwd()) {
  const root = resolve(rootInput);
  const home = join(root, '.living');
  return {
    root,
    home,
    manifest: join(home, 'library.json'),
    configDir: join(home, 'config'),
    stateDir: join(home, 'state'),
    outputDir: join(home, 'output')
  };
}

export async function exists(path) { try { await access(path); return true; } catch { return false; } }

export async function readManifest(root) {
  const p = projectPaths(root);
  if (!(await exists(p.manifest))) return null;
  return JSON.parse(await readFile(p.manifest, 'utf8'));
}

export async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(tmp, path);
}

export function freshManifest(enabled = moduleIds) {
  const now = new Date().toISOString();
  return {
    schema: 1,
    library: 'Living Master Library',
    libraryVersion: catalog.version,
    createdAt: now,
    updatedAt: now,
    enabled: [...new Set(enabled)],
    moduleVersions: Object.fromEntries(moduleIds.map((id) => [id, modules[id].version]))
  };
}

export async function ensureConfig(root, id, { overwrite = false } = {}) {
  const p = projectPaths(root);
  const m = modules[id];
  if (!m) throw new Error(`Unknown module ${id}`);
  const dest = join(p.configDir, m.config);
  if (!overwrite && await exists(dest)) return { path: dest, created: false };
  await mkdir(p.configDir, { recursive: true });
  await copyFile(join(moduleRoot(id), m.config), dest);
  return { path: dest, created: true };
}

export async function initProject(root, enabled = moduleIds) {
  const p = projectPaths(root);
  await mkdir(p.home, { recursive: true });
  await mkdir(p.configDir, { recursive: true });
  await mkdir(p.stateDir, { recursive: true });
  await mkdir(p.outputDir, { recursive: true });
  const existing = await readManifest(root);
  const manifest = existing ?? freshManifest(enabled);
  if (existing) {
    manifest.enabled = [...new Set([...existing.enabled.filter((x) => moduleIds.includes(x)), ...enabled])];
    manifest.updatedAt = new Date().toISOString();
    manifest.libraryVersion = catalog.version;
    manifest.moduleVersions = Object.fromEntries(moduleIds.map((id) => [id, modules[id].version]));
  }
  await writeJsonAtomic(p.manifest, manifest);
  const configs = [];
  for (const id of enabled) configs.push({ id, ...(await ensureConfig(root, id)) });
  return { paths: p, manifest, configs };
}

export async function setEnabled(root, id, value) {
  if (!moduleIds.includes(id)) throw new Error(`Unknown module: ${id}`);
  const p = projectPaths(root);
  let manifest = await readManifest(root);
  if (!manifest) ({ manifest } = await initProject(root, []));
  const set = new Set(manifest.enabled.filter((x) => moduleIds.includes(x)));
  value ? set.add(id) : set.delete(id);
  manifest.enabled = [...set];
  manifest.updatedAt = new Date().toISOString();
  await writeJsonAtomic(p.manifest, manifest);
  if (value) await ensureConfig(root, id);
  return manifest;
}

export function placeholderCount(value) {
  if (typeof value === 'string') return (value.match(/\[ENTER[^\]]*\]/g) ?? []).length;
  if (Array.isArray(value)) return value.reduce((n, v) => n + placeholderCount(v), 0);
  if (value && typeof value === 'object') return Object.values(value).reduce((n, v) => n + placeholderCount(v), 0);
  return 0;
}

export async function configStatus(root, id) {
  const p = projectPaths(root);
  const m = modules[id];
  const path = join(p.configDir, m.config);
  if (!(await exists(path))) return { path, exists: false, placeholders: null, validJson: false };
  try {
    const data = JSON.parse(await readFile(path, 'utf8'));
    return { path, exists: true, placeholders: placeholderCount(data), validJson: true };
  } catch {
    return { path, exists: true, placeholders: null, validJson: false };
  }
}
