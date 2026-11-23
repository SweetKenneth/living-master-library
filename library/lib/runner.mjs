import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { moduleEnv } from './env.mjs';
import { moduleRoot, modules } from './registry.mjs';
import { projectPaths } from './project.mjs';

export function runNode(args, { cwd, env = process.env, capture = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
    });
    let stdout = '', stderr = '';
    if (capture) {
      child.stdout.on('data', (d) => { stdout += d; });
      child.stderr.on('data', (d) => { stderr += d; });
    }
    child.on('error', (error) => resolve({ code: 1, stdout, stderr: `${stderr}${error.message}` }));
    child.on('exit', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function hasFlag(args, name) {
  return args.some((a) => a === name || a.startsWith(`${name}=`));
}

export async function runModule(id, args, root, options = {}) {
  const module = moduleRoot(id);
  const p = projectPaths(root);
  const env = moduleEnv(id, options.env ?? process.env);

  if (id === 'press') {
    const command = args[0] ?? 'help';
    if (command === 'setup') {
      env.LIVINGPRESS_CONFIG_PATH = join(p.configDir, 'livingpress.config.json');
      return runNode([join(module, 'install', 'wizard.mjs')], { cwd: root, env, capture: options.capture });
    }
    if (command === 'test') return runNode([join(module, 'dist', 'test', 'selftest.js')], { cwd: module, env, capture: options.capture });
    return { code: 64, stdout: '', stderr: 'LivingPress library commands: setup | test\nIntegration/runtime mounting is documented in modules/livingpress/README.md.\n' };
  }

  if (id === 'changelog') {
    const forwarded = [...args];
    return runNode([join(module, 'dist', 'cli', 'main.js'), ...forwarded], { cwd: root, env, capture: options.capture });
  }

  const forwarded = [...args];
  if (!hasFlag(forwarded, '--path')) forwarded.push('--path', root);
  if (!hasFlag(forwarded, '--config')) forwarded.push('--config', join(p.configDir, modules[id]?.config ?? `living${id}.config.json`));
  if (!hasFlag(forwarded, '--state')) forwarded.push('--state', join(p.stateDir, `${id}.json`));
  if (!hasFlag(forwarded, '--out')) forwarded.push('--out', join(p.outputDir, id));
  return runNode([join(module, 'dist', 'cli', 'main.js'), ...forwarded], { cwd: root, env, capture: options.capture });
}

export async function runModuleTest(id, options = {}) {
  const module = moduleRoot(id);
  return runNode([join(module, 'dist', 'test', 'selftest.js')], { cwd: module, env: moduleEnv(id, options.env ?? process.env), capture: options.capture });
}

export async function runCoreTest(options = {}) {
  const core = join(fileURLToPath(new URL('..', import.meta.url)), 'core');
  return runNode([join(core, 'dist', 'test', 'core.test.js')], { cwd: core, env: options.env ?? process.env, capture: options.capture });
}

export async function runCollectiveTest(options = {}) {
  const collective = join(fileURLToPath(new URL('..', import.meta.url)), 'collective-master-library');
  return runNode([join(collective, 'test', 'collective.test.mjs')], { cwd: collective, env: options.env ?? process.env, capture: options.capture });
}

export async function runLibraryTest(options = {}) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  return runNode([join(root, 'test', 'library.test.mjs')], { cwd: root, env: options.env ?? process.env, capture: options.capture });
}
