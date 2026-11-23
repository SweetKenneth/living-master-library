import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { catalog, moduleIds, modules, normalizeModuleId, moduleRoot } from '../lib/registry.mjs';
import { configStatus, initProject, readManifest, setEnabled, placeholderCount, projectPaths } from '../lib/project.mjs';
import { moduleEnv, environmentPresence } from '../lib/env.mjs';
import { doctor } from '../lib/doctor.mjs';
import { runModule } from '../lib/runner.mjs';
import { verifyCollective, discoverGuides, checkConsistency } from '../collective-master-library/lib/collective.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; process.stdout.write(`✓ ${name}\n`); }
  catch (e) { fail++; process.stderr.write(`✗ ${name}: ${e?.stack ?? e}\n`); }
}

await test('catalog identifies Living Master Library 1.3.2', () => {
  assert.equal(catalog.library, 'Living Master Library'); assert.equal(catalog.version, '1.3.2');
});
await test('catalog has five product modules', () => assert.deepEqual(moduleIds, ['press','changelog','guide','docs','roadmap']));
await test('catalog has livingcore 1.0.0', () => assert.deepEqual(catalog.core, { id: 'core', name: 'livingcore', version: '1.0.0' }));
await test('catalog exposes Collective Master Library 1.1.1', () => { assert.equal(catalog.collective.name, 'Collective Master Library'); assert.equal(catalog.collective.version, '1.1.1'); });
await test('package.json, catalog and CLI agree on the Library version', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.version, catalog.version);
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../cli/main.mjs', import.meta.url)), '--version'], { encoding: 'utf8' });
  assert.equal(r.stdout.trim(), catalog.version);
});
await test('catalog and CoML package agree on the Collective version', async () => {
  const pkg = JSON.parse(await readFile(new URL('../collective-master-library/package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.version, catalog.collective.version);
});
for (const [id, pkg] of [['guide', 'livingguide'], ['docs', 'livingdocs'], ['roadmap', 'livingroadmap']]) {
  await test(`${modules[id].name} scanner never ingests the Library's own .living/ state or output`, async () => {
    const proj = await mkdtemp(join(tmpdir(), `lml-scan-${id}-`));
    try {
      await mkdir(join(proj, 'src'), { recursive: true });
      await writeFile(join(proj, 'src', 'app.md'), '# App\n\nReal project evidence.\n');
      await mkdir(join(proj, '.living', 'output', id), { recursive: true });
      await writeFile(join(proj, '.living', 'output', id, 'PREVIOUS-EDITION.md'), '# Prior generated edition\n\nThis must never become evidence for itself.\n');
      await mkdir(join(proj, '.living', 'state'), { recursive: true });
      await writeFile(join(proj, '.living', 'state', `${id}.json`), '{"claims":[]}');
      let cfg = JSON.parse(await readFile(join(moduleRoot(id), `${pkg}.config.json`), 'utf8'));
      if (!cfg.sourcePolicy) { const { DEMO_CONFIG } = await import(pathToFileURL(join(moduleRoot(id), 'dist', 'engine', 'config.js')).href); cfg = structuredClone(DEMO_CONFIG); }
      let paths;
      if (id === 'roadmap') {
        const { scanProject } = await import(pathToFileURL(join(moduleRoot(id), 'dist', 'adapters', 'local.js')).href);
        paths = (await scanProject(proj, cfg)).artifacts.map((a) => a.path);
      } else {
        const { localProjectSource } = await import(pathToFileURL(join(moduleRoot(id), 'dist', 'adapters', 'local.js')).href);
        const r = await localProjectSource(proj, cfg).scan(Date.now());
        paths = (r.artifacts ?? r).map((a) => a.path);
      }
      assert.ok(paths.includes('src/app.md'), JSON.stringify(paths));
      assert.deepEqual(paths.filter((x) => x.startsWith('.living')), []);
    } finally { await rm(proj, { recursive: true, force: true }); }
  });
}
await test('shipped Founder’s Guides agree with each other and the catalog', async () => {
  const d = await discoverGuides(fileURLToPath(new URL('..', import.meta.url)));
  const r = checkConsistency(d, { rootPackageName: d.rootPackageName });
  assert.equal(r.ok, true, r.findings.map((f) => f.message).join('\n'));
});
await test('every module version in the catalog matches its package.json', async () => {
  for (const id of moduleIds) { const pkg = JSON.parse(await readFile(join(moduleRoot(id), 'package.json'), 'utf8')); assert.equal(pkg.version, modules[id].version, id); }
});
await test('shipped collective archive is current and undamaged', async () => {
  const v = await verifyCollective({ sourceRoot: fileURLToPath(new URL('..', import.meta.url)), outDir: fileURLToPath(new URL('../collective-archive', import.meta.url)) });
  assert.equal(v.state, 'CURRENT', JSON.stringify(v));
});
await test('module aliases normalize', () => { assert.equal(normalizeModuleId('LivingDocs'), 'docs'); assert.equal(normalizeModuleId('founder'), 'guide'); assert.equal(normalizeModuleId('releases'), 'changelog'); assert.equal(normalizeModuleId('planning'), 'roadmap'); });
await test('unknown module does not normalize', () => assert.equal(normalizeModuleId('banana'), null));
await test('module roots point to real package metadata', async () => {
  for (const id of moduleIds) { const pkg = JSON.parse(await readFile(join(moduleRoot(id), 'package.json'), 'utf8')); assert.equal(pkg.version, modules[id].version); }
});
await test('placeholder counter is recursive', () => assert.equal(placeholderCount({a:'[ENTER A]',b:['x','[ENTER B]']}), 2));
await test('shared AI key maps into each module', () => {
  for (const id of moduleIds) { const prefix = ({press:'PRESS',changelog:'CHANGELOG',guide:'GUIDE',docs:'DOCS',roadmap:'ROADMAP'})[id]; assert.equal(moduleEnv(id, { LIVING_AI_KEY: 'shared' })[`LIVING${prefix}_AI_KEY`], 'shared'); }
});
await test('module-specific AI key overrides shared alias', () => assert.equal(moduleEnv('docs', { LIVING_AI_KEY:'shared', LIVINGDOCS_AI_KEY:'specific' }).LIVINGDOCS_AI_KEY, 'specific'));
await test('environment presence never returns secret values', () => { const p = environmentPresence({ LIVING_AI_KEY:'super-secret' }); assert.equal(p.LIVING_AI_KEY, true); assert.equal(JSON.stringify(p).includes('super-secret'), false); });

const root = await mkdtemp(join(tmpdir(), 'living-library-test-'));
try {
  await test('init creates .living control plane', async () => { const r = await initProject(root, ['docs','guide']); assert.equal(r.manifest.library, 'Living Master Library'); });
  await test('init enables selected modules only', async () => { const m = await readManifest(root); assert.deepEqual(m.enabled, ['docs','guide']); });
  await test('init writes selected config templates', async () => { assert.equal((await configStatus(root,'docs')).exists, true); assert.equal((await configStatus(root,'guide')).exists, true); });
  await test('init does not write unselected configs', async () => assert.equal((await configStatus(root,'press')).exists, false));
  await test('enable adds module and its config', async () => { await setEnabled(root,'press',true); assert.equal((await readManifest(root)).enabled.includes('press'), true); assert.equal((await configStatus(root,'press')).exists, true); });
  await test('disable preserves module config but removes activation', async () => { await setEnabled(root,'press',false); assert.equal((await readManifest(root)).enabled.includes('press'), false); assert.equal((await configStatus(root,'press')).exists, true); });
  await test('project paths stay under project .living', () => { const p=projectPaths(root); assert.equal(p.home.startsWith(root), true); assert.equal(p.configDir.includes('.living'), true); });
  await test('doctor sees initialized project', async () => { const d=await doctor(root,{}); assert.equal(d.checks.find(x=>x.id==='project').ok,true); });
  await test('doctor verifies all five vendored core copies', async () => { const d=await doctor(root,{}); assert.equal(d.integrity.valid,true); assert.equal(d.integrity.checkedModules,5); });
  await test('doctor reports placeholder configs as warnings not lies', async () => { const d=await doctor(root,{}); assert.ok(d.warnings >= 2); });
  await test('LivingDocs wrapper reports version', async () => { const r=await runModule('docs',['--version'],root,{capture:true,env:{}}); assert.equal(r.code,0); assert.equal(r.stdout.trim(),'1.0.2'); });
  await test('LivingGuide wrapper reports version', async () => { const r=await runModule('guide',['--version'],root,{capture:true,env:{}}); assert.equal(r.code,0); assert.equal(r.stdout.trim(),'1.0.2'); });
  await test('LivingChangelog wrapper reports version', async () => { const r=await runModule('changelog',['--version'],root,{capture:true,env:{}}); assert.equal(r.code,0); assert.equal(r.stdout.trim(),'1.2.0'); });

  await test('LivingRoadmap wrapper reports version', async () => { const r=await runModule('roadmap',['--version'],root,{capture:true,env:{}}); assert.equal(r.code,0); assert.equal(r.stdout.trim(),'1.0.0'); });
  await test('LivingPress wrapper exposes integration commands safely', async () => { const r=await runModule('press',['nonsense'],root,{capture:true,env:{}}); assert.equal(r.code,64); assert.match(r.stderr,/setup \| test/); });
  await test('manifest is valid JSON after enable/disable writes', async () => { JSON.parse(await readFile(projectPaths(root).manifest,'utf8')); });
  await test('doctor detects a corrupted module core copy', async () => {
    const file=join(moduleRoot('docs'),'core','oracle.ts'); const original=await readFile(file,'utf8');
    try { await writeFile(file, `${original}\n// drift`); const d=await doctor(root,{}); assert.equal(d.integrity.valid,false); }
    finally { await writeFile(file,original); }
  });
  await test('doctor returns to clean core after repair', async () => assert.equal((await doctor(root,{})).integrity.valid,true));
} finally { await rm(root,{recursive:true,force:true}); }

process.stdout.write(`\nLiving Master Library self-test: ${pass} passed, ${fail} failed\n`);
if (fail) process.exitCode = 1;
