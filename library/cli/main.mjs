#!/usr/bin/env node
process.stdout.on('error', (e) => { if (e?.code === 'EPIPE') process.exit(0); throw e; });
import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog, moduleIds, modules, normalizeModuleId, packageRoot } from '../lib/registry.mjs';
import { configStatus, ensureConfig, initProject, projectPaths, readManifest, setEnabled } from '../lib/project.mjs';
import { doctor } from '../lib/doctor.mjs';
import { environmentPresence } from '../lib/env.mjs';
import { runCollectiveTest, runCoreTest, runLibraryTest, runModule, runModuleTest } from '../lib/runner.mjs';
import { buildCollective, discoverGuides, verifyCollective, checkConsistency } from '../collective-master-library/lib/collective.mjs';

const VERSION = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8')).version;
const HELP = `Living Master Library ${VERSION}

One install. One control plane. A library of systems that keep important things true over time.

Usage
  living init [--path .] [--all | --modules press,changelog,guide,docs,roadmap]
  living modules
  living status [--path .] [--json]
  living doctor [--path .] [--json]
  living audit [--path .] [--json]
  living test [all|library|core|collective|press|changelog|guide|docs|roadmap]
  living enable <module> [--path .]
  living disable <module> [--path .]
  living env [--json]
  living collective build|status|verify|check|sources [--path .] [--out PATH]

Module commands
  living press setup
  living press test
  living changelog preview --repo owner/name [...]
  living guide init|scan|build|audit|resurrection|status [...]
  living docs init|scan|build|audit|verify|status [...]
  living roadmap init|add|scan|reconcile|confirm|audit|build|status [...]

Collective archive
  living collective build      Roll all Founder’s Guides into one canonical archive
  living collective verify     Detect guide drift against the last collective build
  living collective check      Cross-check versions and test counts stated across all guides

Shared environment aliases
  LIVING_AI_KEY / LIVING_AI_URL / LIVING_AI_MODEL
  LIVING_DB_URL / LIVING_DB_SERVICE_KEY
  LIVING_OWNER_SECRET / LIVING_CRON_SECRET

Module-specific environment variables still override shared aliases.
`;

function parse(argv) {
  const positional = [];
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h') args.help = true;
    else if (a === '-v') args.version = true;
    else if (a.startsWith('--')) {
      const [k, inline] = a.slice(2).split('=', 2);
      if (k.startsWith('no-')) args[k.slice(3)] = false;
      else if (inline !== undefined) args[k] = inline;
      else if (argv[i + 1] && !argv[i + 1].startsWith('-')) args[k] = argv[++i];
      else args[k] = true;
    } else positional.push(a);
  }
  return { positional, args };
}

function rootFrom(args) { return resolve(typeof args.path === 'string' ? args.path : process.cwd()); }
function jsonOut(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
function line(s = '') { process.stdout.write(`${s}\n`); }
function err(s) { process.stderr.write(`${s}\n`); }

function parseModules(args) {
  if (args.all === true || args.modules === undefined) return [...moduleIds];
  const raw = String(args.modules).split(',').map((x) => normalizeModuleId(x)).filter(Boolean);
  return [...new Set(raw)];
}

async function cmdModules(json = false) {
  const data = { library: catalog.library, version: catalog.version, core: catalog.core, modules: catalog.modules };
  if (json) return jsonOut(data);
  line(`${catalog.library} ${catalog.version}`);
  line(`  core       ${catalog.core.name} ${catalog.core.version}`);
  for (const m of catalog.modules) line(`  ${m.id.padEnd(10)} ${m.name} ${m.version} — ${m.tagline}`);
}

async function cmdInit(args) {
  const root = rootFrom(args);
  const selected = parseModules(args);
  if (!selected.length) throw new Error('No recognized modules in --modules. Use press,changelog,guide,docs,roadmap.');
  const result = await initProject(root, selected);
  if (args.json) return jsonOut({ root, ...result });
  line(`Initialized Living Master Library at ${result.paths.home}`);
  line(`Enabled: ${result.manifest.enabled.join(', ') || 'none'}`);
  for (const c of result.configs) line(`  ${c.created ? 'created' : 'kept   '} ${c.id}: ${c.path}`);
  line('');
  line('Next: living doctor');
  line('Configure modules under .living/config/, then run them through the living CLI.');
}

async function cmdStatus(args) {
  const root = rootFrom(args);
  const manifest = await readManifest(root);
  const configs = {};
  for (const id of moduleIds) configs[id] = await configStatus(root, id);
  const p = projectPaths(root);
  const result = { initialized: Boolean(manifest), root, manifest, paths: p, modules: Object.fromEntries(moduleIds.map((id) => [id, { ...modules[id], enabled: manifest?.enabled?.includes(id) ?? false, config: configs[id] }])) };
  if (args.json) return jsonOut(result);
  line(`Living Master Library ${VERSION}`);
  line(`Project: ${root}`);
  if (!manifest) { line('Status: not initialized — run living init'); return; }
  for (const id of moduleIds) {
    const c = configs[id];
    const enabled = manifest.enabled.includes(id);
    const configText = !c.exists ? 'config missing' : !c.validJson ? 'config invalid' : c.placeholders ? `${c.placeholders} placeholder(s)` : 'configured';
    line(`  ${enabled ? '●' : '○'} ${modules[id].name.padEnd(16)} ${modules[id].version.padEnd(7)} ${configText}`);
  }
}

function printDoctor(result) {
  line(`Living Master Library doctor: ${result.ok ? 'PASS' : 'FAIL'}${result.warnings ? ` (${result.warnings} warning${result.warnings === 1 ? '' : 's'})` : ''}`);
  for (const c of result.checks) line(`  ${c.ok ? (c.warning ? '!' : '✓') : '✗'} ${c.id.padEnd(18)} ${c.detail}`);
  const present = Object.entries(result.environment).filter(([, v]) => v).map(([k]) => k);
  line(`  env                 ${present.length ? `${present.length} recognized variable(s) present` : 'no shared/provider credentials detected'}`);
}

async function cmdDoctor(args) {
  const result = await doctor(rootFrom(args));
  if (args.json) jsonOut(result); else printDoctor(result);
  process.exitCode = result.ok ? 0 : 1;
}

async function runTests(target, capture = false) {
  const targets = target === 'all' ? ['library', 'core', 'collective', ...moduleIds] : [target];
  const results = [];
  for (const id of targets) {
    let r;
    if (id === 'library') r = await runLibraryTest({ capture });
    else if (id === 'core') r = await runCoreTest({ capture });
    else if (id === 'collective') r = await runCollectiveTest({ capture });
    else if (moduleIds.includes(id)) r = await runModuleTest(id, { capture });
    else throw new Error(`Unknown test target: ${id}`);
    results.push({ id, ...r });
    if (!capture && r.code !== 0) break;
  }
  return results;
}

async function cmdTest(positional, args) {
  const raw = positional[1] ?? 'all';
  const target = ['all','library','core','collective'].includes(raw) ? raw : normalizeModuleId(raw);
  if (!target) throw new Error(`Unknown test target: ${raw}`);
  const results = await runTests(target, args.json === true);
  if (args.json) jsonOut(results.map((r) => ({ id: r.id, code: r.code, stdout: r.stdout, stderr: r.stderr })));
  if (results.some((r) => r.code !== 0)) process.exitCode = 1;
}

async function cmdAudit(args) {
  const root = rootFrom(args);
  const health = await doctor(root);
  const tests = await runTests('all', true);
  const result = { ok: health.ok && tests.every((r) => r.code === 0), doctor: health, tests: tests.map((r) => ({ id: r.id, code: r.code, summary: (r.stdout.match(/\d+ passed, \d+ failed/) ?? [r.stdout.trim().split('\n').at(-1) ?? ''])[0], stderr: r.stderr.trim() })) };
  if (args.json) jsonOut(result);
  else {
    printDoctor(health);
    line(''); line('Module self-tests:');
    for (const t of result.tests) line(`  ${t.code === 0 ? '✓' : '✗'} ${t.id.padEnd(10)} ${t.summary || `exit ${t.code}`}`);
    line(''); line(result.ok ? 'Library audit: PASS' : 'Library audit: FAIL');
  }
  process.exitCode = result.ok ? 0 : 1;
}

async function cmdEnableDisable(positional, args, enabled) {
  const id = normalizeModuleId(positional[1]);
  if (!id) throw new Error(`Choose a module: ${moduleIds.join(', ')}`);
  const manifest = await setEnabled(rootFrom(args), id, enabled);
  line(`${enabled ? 'Enabled' : 'Disabled'} ${modules[id].name}.`);
  line(`Enabled modules: ${manifest.enabled.join(', ') || 'none'}`);
}

async function cmdEnv(args) {
  const result = environmentPresence(process.env);
  if (args.json) return jsonOut(result);
  line('Recognized shared/provider environment variables (values are never printed):');
  for (const [k, v] of Object.entries(result)) line(`  ${v ? '✓' : '○'} ${k}`);
}


async function cmdCollective(positional, args) {
  const sub = positional[1] ?? 'status';
  const root = rootFrom(args);
  const p = projectPaths(root);
  const outDir = resolve(typeof args.out === 'string' ? args.out : join(p.outputDir, 'collective'));
  if (sub === 'build') {
    const result = await buildCollective({ sourceRoot: packageRoot, outDir });
    const summary = { ok: true, sources: result.manifest.guides.length, outDir: result.outDir, files: result.files };
    if (args.json) return jsonOut(summary);
    line(`Collective Master Library built from ${summary.sources} Founder’s Guides.`);
    line(`Output: ${summary.outDir}`);
    return;
  }
  if (sub === 'verify' || sub === 'status') {
    const result = await verifyCollective({ sourceRoot: packageRoot, outDir });
    if (args.json) return jsonOut(result);
    line(`Collective Master Library: ${result.built ? result.state : 'NOT BUILT'}`);
    if (result.built) {
      line(`Sources: ${result.source_count}`);
      if (result.changed.length) line(`Changed: ${result.changed.join(', ')}`);
      if (result.added.length) line(`Added: ${result.added.join(', ')}`);
      if (result.removed.length) line(`Removed: ${result.removed.join(', ')}`);
      if (result.version_changed.length) line(`Version changed: ${result.version_changed.join(', ')}`);
      if (result.missing.length) line(`Missing archive files: ${result.missing.join(', ')}`);
      if (result.tampered.length) line(`Modified archive files: ${result.tampered.join(', ')}`);
      if (!result.ok) line('Run living collective build to regenerate the archive.');
    }
    if (sub === 'verify' && !result.ok) process.exitCode = 1;
    return;
  }
  if (sub === 'check') {
    const d = await discoverGuides(packageRoot);
    const result = checkConsistency(d, { rootPackageName: d.rootPackageName });
    if (args.json) jsonOut(result);
    else {
      line(`Consistency: ${result.ok ? 'OK' : `${result.findings.length} disagreement(s)`} (${result.claims_checked} claims checked across ${d.guides.length} guides)`);
      for (const f of result.findings) { line(`  ${f.kind}: ${f.message}`); for (const c of f.claims) line(`    ${c.source_path}:${c.line}`); }
    }
    if (!result.ok) process.exitCode = 1;
    return;
  }
  if (sub === 'sources') {
    const d = await discoverGuides(packageRoot);
    const sources = d.guides.map(({ text, ...g }) => g);
    if (args.json) return jsonOut(sources);
    for (const g of sources) line(`${g.kind.padEnd(7)} ${g.name}${g.version ? ` v${g.version}` : ''} — ${g.words} words — ${g.sha256.slice(0, 12)}…`);
    return;
  }
  throw new Error('Collective commands: build | status | verify | check | sources');
}

async function dispatchModule(id, argv, args) {
  const root = rootFrom(args);
  let manifest = await readManifest(root);
  if (!manifest) {
    ({ manifest } = await initProject(root, [id]));
    err(`Initialized .living/ and enabled ${modules[id].name}.`);
  } else if (!manifest.enabled.includes(id) && !argv.includes('--help') && !argv.includes('-h') && !argv.includes('--version') && !argv.includes('-v')) {
    err(`${modules[id].name} is installed but disabled for this project. Run: living enable ${id}`);
    process.exitCode = 1; return;
  }
  if (manifest.enabled.includes(id)) await ensureConfig(root, id);
  const forwarded = [...argv];
  // --path belongs to the umbrella unless the module explicitly receives it after its command.
  const result = await runModule(id, forwarded, root, { capture: false });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.stdout) process.stdout.write(result.stdout);
  process.exitCode = result.code;
}

export async function main(argv = process.argv.slice(2)) {
  const { positional, args } = parse(argv);
  if (positional.length === 0) {
    if (args.version) return line(VERSION);
    return line(HELP.trimEnd());
  }
  if (positional[0] === 'help') return line(HELP.trimEnd());
  const command = positional[0];
  const moduleCommand = normalizeModuleId(command);
  if (moduleCommand) return dispatchModule(moduleCommand, argv.slice(1), args);
  if (args.version) return line(VERSION);
  if (args.help) return line(HELP.trimEnd());
  if (command === 'modules') return cmdModules(args.json === true);
  if (command === 'collective' || command === 'coml') return cmdCollective(positional, args);
  if (command === 'init') return cmdInit(args);
  if (command === 'status') return cmdStatus(args);
  if (command === 'doctor') return cmdDoctor(args);
  if (command === 'audit') return cmdAudit(args);
  if (command === 'test') return cmdTest(positional, args);
  if (command === 'enable') return cmdEnableDisable(positional, args, true);
  if (command === 'disable') return cmdEnableDisable(positional, args, false);
  if (command === 'env') return cmdEnv(args);
  throw new Error(`Unknown command: ${command}\n\n${HELP}`);
}

const invoked = process.argv[1] ? realpathSync(resolve(process.argv[1])) : '';
if (invoked === realpathSync(fileURLToPath(import.meta.url))) {
  main().catch((e) => { err(`living: ${e instanceof Error ? e.message : String(e)}`); process.exitCode = 1; });
}
