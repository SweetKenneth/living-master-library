import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { packageRoot, moduleIds, modules, moduleRoot } from './registry.mjs';
import { configStatus, exists, projectPaths, readManifest } from './project.mjs';
import { environmentPresence } from './env.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');

async function coreIntegrity() {
  const canonical = join(packageRoot, 'core', 'src');
  const files = (await readdir(canonical)).filter((f) => f.endsWith('.ts')).sort();
  const expected = Object.fromEntries(await Promise.all(files.map(async (f) => [f, sha(await readFile(join(canonical, f)))])));
  const mismatches = [];
  for (const id of moduleIds) {
    const vendored = join(moduleRoot(id), 'core');
    for (const f of files) {
      const path = join(vendored, f);
      if (!(await exists(path))) { mismatches.push({ module: id, file: f, reason: 'missing' }); continue; }
      const actual = sha(await readFile(path));
      if (actual !== expected[f]) mismatches.push({ module: id, file: f, reason: 'hash mismatch' });
    }
  }
  return { checkedModules: moduleIds.length, filesPerModule: files.length, valid: mismatches.length === 0, mismatches };
}

export async function doctor(root, env = process.env) {
  const p = projectPaths(root);
  const manifest = await readManifest(root);
  const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
  const nodeOk = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 6);
  const checks = [];
  checks.push({ id: 'node', ok: nodeOk, detail: `Node ${process.versions.node}; >=22.6 supported by this release` });
  checks.push({ id: 'project', ok: Boolean(manifest), detail: manifest ? p.manifest : 'Not initialized; run living init' });
  const integrity = await coreIntegrity();
  checks.push({ id: 'core', ok: integrity.valid, detail: integrity.valid ? `${integrity.checkedModules} module core copies match canonical livingcore` : `${integrity.mismatches.length} core mismatch(es)` });
  const configs = {};
  for (const id of moduleIds) {
    configs[id] = await configStatus(root, id);
    const enabled = manifest?.enabled?.includes(id) ?? false;
    if (enabled) {
      const c = configs[id];
      checks.push({ id: `config:${id}`, ok: c.exists && c.validJson, warning: c.placeholders > 0, detail: !c.exists ? 'missing' : !c.validJson ? 'invalid JSON' : `${c.placeholders} placeholder(s) remaining` });
    }
  }
  return {
    ok: checks.every((c) => c.ok),
    warnings: checks.filter((c) => c.warning).length,
    checks,
    manifest,
    configs,
    environment: environmentPresence(env),
    integrity
  };
}
