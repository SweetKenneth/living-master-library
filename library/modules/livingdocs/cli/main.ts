#!/usr/bin/env node
/** LivingDocs CLI. Zero runtime dependencies. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { jsonStorage } from "../adapters/json.ts";
import { localProjectSource } from "../adapters/local.ts";
import { modelsFromEnv } from "../adapters/models.ts";
import { DEMO_CONFIG, validateConfig, type LivingDocsConfig } from "../engine/config.ts";
import { guideAuditMarkdown } from "../engine/audit.ts";
import { runAudit, runBuild, runVerification } from "../engine/engine.ts";
import { verificationMarkdown } from "../engine/verification.ts";
import { artifactInventory } from "../engine/source.ts";
import { syncSources } from "../engine/source.ts";
import { verifyStoredChain } from "../engine/receipts.ts";

declare const process: {
  argv: string[]; env: Record<string, string | undefined>; exitCode?: number;
  cwd(): string;
  stdout: { write(s: string): boolean; isTTY?: boolean };
  stderr: { write(s: string): boolean };
};

const VERSION = "1.0.2";
const HELP = `livingdocs ${VERSION}

Documentation that stays true.

Usage
  livingdocs init [--path .]
  livingdocs scan [--path .]
  livingdocs build [--path .] [--out .livingdocs/output]
  livingdocs audit [--path .]
  livingdocs verify [--path .]
  livingdocs status [--path .]

Options
  --path <dir>        Project root (default current directory)
  --config <file>     Config file (default <path>/livingdocs.config.json)
  --state <file>      Durable truth state (default <path>/.livingdocs/state.json)
  --out <dir>         Output directory (default <path>/.livingdocs/output)
  --model <id>        Override configured model id
  --dry               Do not commit extracted claims or a guide
  --json              Machine-readable command result
  -h, --help          Show help
  -v, --version       Show version

AI providers
  LIVINGDOCS_AI_KEY + LIVINGDOCS_AI_URL + LIVINGDOCS_AI_MODEL
  ANTHROPIC_API_KEY
  OPENAI_API_KEY

The scanner never reads .env/private-key/credential files matched by the
configured sensitive-name policy. Likely secrets found in readable source are
redacted before they enter LivingDocs state or model context.
`;

type Args = Record<string, string | boolean>;
export function parseArgs(argv: string[]): { command: string | null; args: Args } {
  const args: Args = {}; let command: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === "-h") args.help = true; else if (a === "-v") args.version = true;
    else if (a.startsWith("--")) {
      const [k, inline] = a.slice(2).split("=", 2) as [string, string | undefined];
      if (k.startsWith("no-")) args[k.slice(3)] = false;
      else if (inline !== undefined) args[k] = inline;
      else if (argv[i + 1] && !argv[i + 1]!.startsWith("-")) args[k] = argv[(i += 1)]!;
      else args[k] = true;
    } else if (!command) command = a;
  }
  return { command, args };
}

function merge<T>(base: T, patch: unknown): T {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return structuredClone(base);
  const out = structuredClone(base) as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const cur = out[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object" && !Array.isArray(cur) ? merge(cur, v) : structuredClone(v);
  }
  return out as T;
}

async function loadConfig(file: string): Promise<LivingDocsConfig> {
  const raw = JSON.parse(await readFile(file, "utf8"));
  return merge(DEMO_CONFIG, raw);
}

async function exists(file: string): Promise<boolean> { try { await readFile(file); return true; } catch { return false; } }

async function initProject(root: string, configFile: string): Promise<LivingDocsConfig> {
  if (await exists(configFile)) throw new Error(`${configFile} already exists`);
  const cfg = structuredClone(DEMO_CONFIG);
  try {
    const p = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { name?: string; description?: string; repository?: string | { url?: string } };
    if (p.name) cfg.project.name = p.name;
    if (p.description) cfg.project.description = p.description;
    const repo = typeof p.repository === "string" ? p.repository : p.repository?.url;
    if (repo) cfg.project.repository = repo;
  } catch { /* not a package project */ }
  await writeFile(configFile, `${JSON.stringify(cfg, null, 2)}\n`, "utf8");
  return cfg;
}

function outputPaths(root: string, args: Args) {
  const config = resolve(typeof args.config === "string" ? args.config : join(root, "livingdocs.config.json"));
  const state = resolve(typeof args.state === "string" ? args.state : join(root, ".livingdocs", "state.json"));
  const out = resolve(typeof args.out === "string" ? args.out : join(root, ".livingdocs", "output"));
  return { config, state, out };
}

async function writeGuide(outDir: string, cfg: LivingDocsConfig, markdown: string, html: string): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, cfg.output.markdownFile), markdown, "utf8");
  await writeFile(join(outDir, cfg.output.htmlFile), html, "utf8");
}

function auditStandalone(title: string, scores: Record<string, number>, findings: Array<{ severity: string; kind: string; message: string; recommendation: string }>): string {
  return `# ${title} — Enterprise Audit\n\n## Quality Assessment\n\n| Dimension | Score |\n|---|---:|\n${Object.entries(scores).map(([k, v]) => `| ${k.replace(/_/g, " ")} | ${v}/100 |`).join("\n")}\n\n## Findings\n\n${findings.length ? findings.map((f) => `### ${f.severity.toUpperCase()} — ${f.kind}\n\n${f.message}\n\n**Recommended repair:** ${f.recommendation}`).join("\n\n") : "No findings recorded."}\n`;
}

export async function main(argv: string[], env: Record<string, string | undefined>, out = (s: string) => process.stdout.write(s), err = (s: string) => process.stderr.write(s)): Promise<number> {
  const { command, args } = parseArgs(argv);
  if (args.version) { out(`${VERSION}\n`); return 0; }
  if (args.help || !command || command === "help") { out(HELP); return command || args.help ? 0 : 1; }
  const root = resolve(typeof args.path === "string" ? args.path : process.cwd());
  const p = outputPaths(root, args);

  try {
    if (command === "init") {
      const cfg = await initProject(root, p.config);
      out(args.json ? `${JSON.stringify({ created: p.config, config: cfg }, null, 2)}\n` : `Created ${p.config}\nFill the remaining [ENTER …] project fields, then run: livingdocs scan\n`);
      return 0;
    }
    if (!(await exists(p.config))) { err(`No config at ${p.config}. Run: livingdocs init --path ${root}\n`); return 1; }
    const cfg = await loadConfig(p.config);
    const storage = await jsonStorage(p.state);
    const source = localProjectSource(root, cfg);

    if (command === "scan") {
      const report = await syncSources(storage, [source], Date.now());
      const inventory = artifactInventory(await storage.listArtifacts(cfg.sourcePolicy.maxFiles + 500));
      const result = { report, inventory, configProblems: validateConfig(cfg), state: p.state };
      out(args.json ? `${JSON.stringify(result, null, 2)}\n` : `Scanned ${inventory.total} active source artifacts (${report.inserted} new, ${report.changed} changed, ${report.deleted} deleted).\n${report.warnings.length ? `Warnings:\n${report.warnings.map((x) => `- ${x}`).join("\n")}\n` : ""}${result.configProblems.length ? `Config still needs attention:\n${result.configProblems.map((x) => `- ${x}`).join("\n")}\n` : ""}`);
      return 0;
    }

    const { models, label } = modelsFromEnv(env, typeof args.model === "string" ? args.model : undefined);
    const deps = { storage, sources: [source], models, config: cfg, dryRun: args.dry === true };

    if (command === "build") {
      if (!args.json) err(`${label ? `Building with ${label}` : "No AI provider detected"}…\n`);
      const result = await runBuild(deps);
      const doc = result.guide ?? result.draft;
      if (doc) await writeGuide(p.out, cfg, doc.markdown, doc.html);
      if (result.guide) {
        await writeFile(join(p.out, cfg.output.auditFile), guideAuditMarkdown(result.guide, result.findings), "utf8");
        await writeFile(join(p.out, cfg.output.verificationFile), verificationMarkdown(result.guide.verification), "utf8");
      }
      out(args.json ? `${JSON.stringify({ ...result, guide: result.guide ? { ...result.guide, markdown: undefined, html: undefined } : undefined, output: doc ? p.out : null }, null, 2)}\n` : `${result.reason}${doc ? `\nOutput: ${p.out}` : ""}\n${result.findings.length ? `Findings: ${result.findings.length}` : ""}\n`);
      return result.outcome === "error" || result.outcome === "tripped" ? 2 : result.outcome === "blocked" ? 1 : 0;
    }

    if (command === "audit") {
      const result = await runAudit(deps);
      await mkdir(p.out, { recursive: true });
      await writeFile(join(p.out, cfg.output.auditFile), auditStandalone(cfg.project.name, result.scores as unknown as Record<string, number>, result.findings), "utf8");
      await writeFile(join(p.out, cfg.output.verificationFile), verificationMarkdown(result.verification), "utf8");
      out(args.json ? `${JSON.stringify({ ...result, output: p.out }, null, 2)}\n` : `Audit complete: ${result.findings.length} finding(s). Truthfulness ${result.scores.truthfulness}/100; verification ${result.verification.score}/100.\nOutput: ${p.out}\n`);
      return result.findings.some((f) => f.severity === "critical") ? 1 : 0;
    }

    if (command === "verify") {
      const result = await runVerification({ storage, models });
      await mkdir(p.out, { recursive: true }); await writeFile(join(p.out, cfg.output.verificationFile), verificationMarkdown(result), "utf8");
      out(args.json ? `${JSON.stringify(result, null, 2)}\n` : `${verificationMarkdown(result)}\nSaved: ${join(p.out, cfg.output.verificationFile)}\n`);
      return result.passed ? 0 : 1;
    }

    if (command === "status") {
      const [arts, claims, guide, findings, receipts] = await Promise.all([storage.listArtifacts(100000), storage.listClaims(100000), storage.getLatestGuide(cfg.preset), storage.listFindings(1000, "open"), verifyStoredChain(storage)]);
      const status = { artifacts: arts.length, claims: claims.length, latestGuide: guide ? { version: guide.version, generated_at: guide.generated_at, scores: guide.audit_summary } : null, openFindings: findings.length, criticalFindings: findings.filter((f) => f.severity === "critical").length, receipts };
      out(args.json ? `${JSON.stringify(status, null, 2)}\n` : `Sources: ${status.artifacts}\nClaims: ${status.claims}\nDocs edition: ${guide ? `v${guide.version} (${guide.generated_at})` : "none"}\nOpen findings: ${status.openFindings} (${status.criticalFindings} critical)\nReceipt chain: ${receipts.valid ? "valid" : "BROKEN"} (${receipts.checked} checked)\n`);
      return receipts.valid ? 0 : 1;
    }

    err(`Unknown command "${command}". Try: livingdocs --help\n`); return 1;
  } catch (e) {
    err(`livingdocs: ${e instanceof Error ? e.message : String(e)}\n`); return 1;
  }
}

const invoked = process.argv[1] ?? "";
if (/livingdocs(\.js|\.ts)?$|cli[\\/]main\.(js|ts)$/.test(invoked)) {
  main(process.argv.slice(2), process.env).then((code) => { process.exitCode = code; }, (e: unknown) => { process.stderr.write(`livingdocs: ${e instanceof Error ? e.message : String(e)}\n`); process.exitCode = 1; });
}
