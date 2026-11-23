#!/usr/bin/env node
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const modulesRoot = join(root, 'modules');
const builds = [
  ['livingchangelog', 'tsconfig.library-build.json'],
  ['livingguide', 'tsconfig.library-build.json'],
  ['livingdocs', 'tsconfig.library-build.json'],
  ['livingroadmap', 'tsconfig.library-build.json'],
  ['livingpress', 'tsconfig.library-build.json']
];

function tsc(cwd, config) {
  let r = spawnSync('tsc', ['-p', config], { cwd, stdio: 'inherit' });
  if (r.error?.code === 'ENOENT') r = spawnSync('npx', ['-y', '-p', 'typescript@5.9', 'tsc', '-p', config], { cwd, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`TypeScript build failed in ${cwd}`);
}

for (const [name, config] of builds) {
  const cwd = join(modulesRoot, name);
  await rm(join(cwd, 'dist'), { recursive: true, force: true });
  tsc(cwd, config);
}

const core = join(root, 'core');
await rm(join(core, 'dist'), { recursive: true, force: true });
tsc(core, 'tsconfig.library-build.json');

for (const name of ['livingpress', 'livingchangelog']) {
  const m = join(modulesRoot, name);
  const dst = join(m, 'dist', 'core');
  await mkdir(dst, { recursive: true });
  await cp(join(m, 'core', 'CORE-MANIFEST.json'), join(dst, 'CORE-MANIFEST.json'));
  for (const f of await readdir(join(m, 'core'))) if (f.endsWith('.ts')) await cp(join(m, 'core', f), join(dst, f));
  // .d.ts also ends in .ts and would be mistaken for vendored source by the legacy self-test.
  for (const f of await readdir(dst)) if (f.endsWith('.d.ts')) await rm(join(dst, f));
}

await mkdir(join(modulesRoot, 'livingpress', 'dist', 'test', 'fixtures'), { recursive: true });
await cp(join(modulesRoot, 'livingpress', 'test', 'fixtures', 'receipts-v1.1.json'), join(modulesRoot, 'livingpress', 'dist', 'test', 'fixtures', 'receipts-v1.1.json'));
await mkdir(join(modulesRoot, 'livingchangelog', 'dist', 'install'), { recursive: true });
await cp(join(modulesRoot, 'livingchangelog', 'install', 'wizard.mjs'), join(modulesRoot, 'livingchangelog', 'dist', 'install', 'wizard.mjs'));

process.stdout.write('Living Master Library compiled distribution is ready.\n');
