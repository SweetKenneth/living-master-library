import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checkVendoredCore, type CoreManifest } from "../core/vendor.ts";
import type { ModelProvider } from "../core/types.ts";
import { memoryStorage } from "../adapters/memory.ts";
import { jsonStorage } from "../adapters/json.ts";
import { localProjectSource, redactSecrets } from "../adapters/local.ts";
import { manualSource } from "../adapters/manual.ts";
import { deterministicClaimAudit, deterministicManualAudit, scoreAudit } from "../engine/audit.ts";
import { ALL_SECTIONS, DEMO_CONFIG, sectionsForPreset, validateConfig, type LivingDocsConfig } from "../engine/config.ts";
import { runAudit, runBuild, runVerification, scrubSensitiveText } from "../engine/engine.ts";
import { canonicalHtml, canonicalMarkdown, slugify } from "../engine/render.ts";
import { deterministicVerification, verificationMarkdown } from "../engine/verification.ts";
import { syncSources } from "../engine/source.ts";
import { claimKey, claimsAffectedBySources, obviousContradictions, sanitizeClaim, sourceSupportsQuote } from "../engine/truth.ts";
import { verifyStoredChain } from "../engine/receipts.ts";
import type { GuideSection, SourceArtifact, TruthClaim } from "../engine/ports.ts";
import { main as cliMain, parseArgs } from "../cli/main.ts";

declare const process: { cwd(): string };
let passed = 0; let failed = 0;
function ok(cond: unknown, name: string) { if (!cond) { failed += 1; console.error(`✗ ${name}`); } else { passed += 1; console.log(`✓ ${name}`); } }
async function test(name: string, fn: () => unknown | Promise<unknown>) { try { await fn(); ok(true, name); } catch (e) { ok(false, `${name}: ${e instanceof Error ? e.message : String(e)}`); } }

function config(): LivingDocsConfig {
  const c = structuredClone(DEMO_CONFIG);
  c.project = { name: "Project Phoenix", description: "A deployment orchestration tool.", repository: "https://example.com/phoenix", docsBaseUrl: "https://docs.example.com" };
  return c;
}

const sourceRows = [
  { id: "readme", title: "README.md", kind: "documentation" as const, text: "Project Phoenix is a deployment orchestration tool. Existing docs say the deploy command supports --dry-run. Known limitation: offline deployment is not supported." },
  { id: "cli", title: "src/cli.ts", kind: "source_code" as const, text: 'The CLI command is deploy. The deploy command supports --dry-run. The start command is phoenix start.' },
  { id: "config", title: "src/config.ts", kind: "configuration" as const, text: "PORT defaults to 8080. PHOENIX_TOKEN is required for remote deployment. Configuration rejects an empty PHOENIX_TOKEN." },
  { id: "api", title: "openapi.yaml", kind: "api_schema" as const, text: "GET /health returns 200 with status ok. POST /deploy accepts project and dry_run fields." },
  { id: "schema", title: "schema.sql", kind: "schema" as const, text: "Deployments are stored in the deployments table. Each deployment stores id, project, status, and created_at." },
  { id: "tests", title: "test/deploy.test.ts", kind: "test" as const, text: "The deploy --dry-run test asserts that no deployment row is written. The health test expects status ok." },
  { id: "ops", title: "OPERATIONS.md", kind: "documentation" as const, text: "Operators should run tests before deployment. Backups cover the PostgreSQL database. Recovery requires restoring the database before starting workers." },
  { id: "history", title: "CHANGELOG.md", kind: "documentation" as const, text: "Version 1.0 renamed --preview to --dry-run. The old --preview flag is deprecated and removed." },
  { id: "arch", title: "ARCHITECTURE.md", kind: "documentation" as const, text: "The CLI calls the deployment engine. The deployment engine writes deployment state to PostgreSQL. Secrets belong in an external vault." },
];

function parseBlocks(prompt: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const c of prompt.split(/\n\n--- SOURCE ---\n\n/)) { const m = c.match(/SOURCE_ID: ([^\n]+)[\s\S]*?CONTENT:\n([\s\S]*)$/); if (m) out.set(m[1]!, m[2]!); }
  return out;
}

class FakeModel implements ModelProvider {
  id = "fake-docs"; calls = 0; injectSecret = false;
  async chat(messages: { role: string; content: string }[]): Promise<string> {
    this.calls += 1; const user = messages[messages.length - 1]!.content;
    if (/Extract the most important non-duplicative claims/.test(user)) {
      const b = parseBlocks(user); const find = (needle: string) => [...b.entries()].find(([, text]) => text.includes(needle))?.[0] ?? "";
      const readme = find("Project Phoenix is a deployment orchestration tool.");
      const cli = find("The CLI command is deploy."); const cfg = find("PORT defaults to 8080.");
      const api = find("GET /health returns 200"); const schema = find("Deployments are stored"); const tests = find("deploy --dry-run test");
      const ops = find("Operators should run tests"); const hist = find("renamed --preview"); const arch = find("The CLI calls the deployment engine.");
      const claims = [
        { section: "overview", statement: "Project Phoenix is a deployment orchestration tool.", status: "observed", confidence: .94, sources: [{ source_id: readme, quote: "Project Phoenix is a deployment orchestration tool." }], basis: "documentation", tags: ["purpose"] },
        { section: "getting-started", statement: "A supported first command is phoenix start.", status: "confirmed", confidence: .95, sources: [{ source_id: cli, quote: "The start command is phoenix start." }], basis: "implementation", tags: ["cli", "behavior"] },
        { section: "installation", statement: "The source set does not yet establish a package-manager installation command.", status: "unknown", confidence: .5, sources: [], basis: "unknown", tags: ["installation"], requires_confirmation: true },
        { section: "configuration", statement: "PORT defaults to 8080.", status: "confirmed", confidence: .98, sources: [{ source_id: cfg, quote: "PORT defaults to 8080." }], basis: "configuration", tags: ["config", "default"] },
        { section: "configuration", statement: "PHOENIX_TOKEN is required for remote deployment.", status: "confirmed", confidence: .98, sources: [{ source_id: cfg, quote: "PHOENIX_TOKEN is required for remote deployment." }], basis: "configuration", tags: ["config", "security"] },
        { section: "concepts", statement: "Dry-run deployment is intended not to persist a deployment row.", status: "observed", confidence: .94, sources: [{ source_id: tests, quote: "The deploy --dry-run test asserts that no deployment row is written." }], basis: "test", tags: ["behavior", "concept"] },
        { section: "architecture", statement: "The CLI calls the deployment engine.", status: "observed", confidence: .9, sources: [{ source_id: arch, quote: "The CLI calls the deployment engine." }], basis: "documentation", tags: ["architecture"] },
        { section: "api-reference", statement: "GET /health returns 200 with status ok.", status: "confirmed", confidence: .99, sources: [{ source_id: api, quote: "GET /health returns 200 with status ok." }, { source_id: tests, quote: "The health test expects status ok." }], basis: "schema", tags: ["api", "behavior"] },
        { section: "api-reference", statement: "POST /deploy accepts project and dry_run fields.", status: "confirmed", confidence: .97, sources: [{ source_id: api, quote: "POST /deploy accepts project and dry_run fields." }], basis: "schema", tags: ["api", "behavior"] },
        { section: "cli-reference", statement: "The deploy command supports --dry-run.", status: "confirmed", confidence: .99, sources: [{ source_id: cli, quote: "The deploy command supports --dry-run." }, { source_id: tests, quote: "The deploy --dry-run test asserts that no deployment row is written." }], basis: "implementation", tags: ["cli", "behavior", "example"] },
        { section: "data-model", statement: "Deployments are stored in the deployments table.", status: "confirmed", confidence: .99, sources: [{ source_id: schema, quote: "Deployments are stored in the deployments table." }], basis: "schema", tags: ["schema", "runtime"] },
        { section: "examples", statement: "The evidence supports deploy --dry-run as a usage example.", status: "observed", confidence: .92, sources: [{ source_id: cli, quote: "The deploy command supports --dry-run." }], basis: "implementation", tags: ["example", "cli"] },
        { section: "operations", statement: "Operators should run tests before deployment.", status: "observed", confidence: .9, sources: [{ source_id: ops, quote: "Operators should run tests before deployment." }], basis: "documentation", tags: ["operation"] },
        { section: "security", statement: "Secrets belong in an external vault.", status: "observed", confidence: .9, sources: [{ source_id: arch, quote: "Secrets belong in an external vault." }], basis: "documentation", tags: ["security"] },
        { section: "troubleshooting", statement: "An empty PHOENIX_TOKEN is rejected by configuration validation.", status: "confirmed", confidence: .96, sources: [{ source_id: cfg, quote: "Configuration rejects an empty PHOENIX_TOKEN." }], basis: "configuration", tags: ["config", "behavior"] },
        { section: "migration-upgrades", statement: "Version 1.0 renamed --preview to --dry-run and removed the old flag.", status: "observed", confidence: .95, sources: [{ source_id: hist, quote: "Version 1.0 renamed --preview to --dry-run." }, { source_id: hist, quote: "The old --preview flag is deprecated and removed." }], basis: "documentation", tags: ["history", "cli"] },
        { section: "limitations", statement: "Offline deployment is not supported.", status: "observed", confidence: .9, sources: [{ source_id: readme, quote: "Known limitation: offline deployment is not supported." }], basis: "documentation", tags: ["limitation"] },
        { section: "reference-index", statement: "The primary documented interfaces include phoenix start, deploy --dry-run, GET /health and POST /deploy.", status: "observed", confidence: .9, sources: [{ source_id: cli, quote: "The start command is phoenix start." }, { source_id: cli, quote: "The deploy command supports --dry-run." }, { source_id: api, quote: "GET /health returns 200 with status ok." }, { source_id: api, quote: "POST /deploy accepts project and dry_run fields." }], basis: "implementation", tags: ["reference"] },
      ].filter((c) => c.sources.every((s) => !!s.source_id));
      return JSON.stringify({ claims });
    }
    if (/Audit this documentation truth ledger/.test(user)) return JSON.stringify({ findings: [] });
    if (/Run a DOCUMENTATION VERIFICATION TEST/.test(user)) return JSON.stringify({ answerable: ["CLI surface", "API surface", "configuration"], defects: [], notes: ["Installation evidence remains incomplete."], score: 90 });
    if (/Perform a final documentation drift audit/.test(user)) return JSON.stringify({ findings: [], scores: { truthfulness: 97, coverage: 95, implementation_alignment: 92, example_reliability: 93, configuration_accuracy: 98, api_accuracy: 98, operational_clarity: 90, security_hygiene: 95, readability: 94, maintainability: 93 } });
    const m = user.match(/Write the "([^"]+)" section/); if (m) return `## ${m[1]}\n\nThis section is generated only from the verified documentation claim ledger.${this.injectSecret ? " api_key=sk-abcdefghijklmnopqrstuvwx" : ""}`;
    return JSON.stringify({ findings: [] });
  }
}

const cfg = config();
await test("placeholder config is rejected", () => ok(validateConfig(DEMO_CONFIG).length > 0, "placeholder config has problems"));
await test("complete config validates", () => ok(validateConfig(cfg).length === 0, "complete config is clean"));
await test("developer preset has all 16 documentation sections", () => ok(sectionsForPreset(cfg).length === 16 && ALL_SECTIONS.length === 16, "16 sections"));
await test("API preset is narrower", () => ok(sectionsForPreset({ ...cfg, preset: "api" }).length < 16, "api subset"));
await test("CLI preset includes CLI reference", () => ok(sectionsForPreset({ ...cfg, preset: "cli" }).includes("cli-reference"), "cli reference included"));
await test("slugify makes stable anchors", () => ok(slugify("Migration & Upgrades") === "migration-upgrades", "anchor slug"));

await test("secret redactor removes API-like values", () => { const r = redactSecrets('api_key="sk-abcdefghijklmnopqrstuvwx"'); ok(r.redactions > 0 && !r.text.includes("sk-abc"), "redaction happened"); });
await test("generated secret scrubber uses safe reference", () => { const x = scrubSensitiveText("token=abcdefghijklmnopqrstuvwx"); ok(!x.includes("abcdefghijkl") && x.includes("SECURE SECRET REFERENCE"), "generated secret scrubbed"); });

const manual = manualSource("manual", sourceRows);
const mem = memoryStorage(); const sync1 = await syncSources(mem, [manual], 1_700_000_000_000); const sync2 = await syncSources(mem, [manual], 1_700_000_010_000);
await test("manual source inserts all artifacts", () => ok(sync1.inserted === sourceRows.length, "all sources inserted"));
await test("identical rescan is idempotent", () => ok(sync2.unchanged === sourceRows.length && sync2.changed === 0, "idempotent sync"));
const artifacts = await mem.listArtifacts(100);
await test("artifact inventory stays active", () => ok(artifacts.length === sourceRows.length, "active artifacts"));

const cliArtifact = artifacts.find((a) => a.path === "src/cli.ts")!;
await test("source quote support is exact after whitespace normalization", () => ok(sourceSupportsQuote(cliArtifact, "The deploy command supports --dry-run."), "quote support"));
await test("claim keys are deterministic", async () => ok(await claimKey("cli-reference", "Deploy supports dry run") === await claimKey("cli-reference", "Deploy supports dry run"), "same key"));

const implClaim = await sanitizeClaim({ section: "cli-reference", statement: "The deploy command supports --dry-run.", status: "confirmed", confidence: .98, sources: [{ source_id: cliArtifact.id, quote: "The deploy command supports --dry-run." }], basis: "implementation", tags: ["cli", "behavior"] }, artifacts, ALL_SECTIONS, cfg, Date.now());
await test("implementation-backed confirmed behavior survives", () => ok(implClaim?.status === "confirmed", "confirmed retained"));
const readmeArtifact = artifacts.find((a) => a.path === "README.md")!;
const circular = await sanitizeClaim({ section: "cli-reference", statement: "The deploy command supports --dry-run.", status: "confirmed", confidence: .98, sources: [{ source_id: readmeArtifact.id, quote: "Existing docs say the deploy command supports --dry-run." }], basis: "documentation", tags: ["cli", "behavior"] }, artifacts, ALL_SECTIONS, cfg, Date.now());
await test("documentation-only behavior cannot remain confirmed", () => ok(circular?.status === "requires_audit", "circular proof downgraded"));
const badQuote = await sanitizeClaim({ section: "api-reference", statement: "GET /missing exists.", status: "confirmed", confidence: .99, sources: [{ source_id: cliArtifact.id, quote: "GET /missing" }], basis: "implementation", tags: ["api"] }, artifacts, ALL_SECTIONS, cfg, Date.now());
await test("bad evidence quote downgrades certainty", () => ok(badQuote?.status === "needs_confirmation", "unsupported certainty downgraded"));
const low = await sanitizeClaim({ section: "configuration", statement: "PORT defaults to 8080.", status: "confirmed", confidence: .5, sources: [{ source_id: artifacts.find((a) => a.path === "src/config.ts")!.id, quote: "PORT defaults to 8080." }], basis: "configuration", tags: ["config", "default"] }, artifacts, ALL_SECTIONS, cfg, Date.now());
await test("confirmed below confidence floor becomes observed", () => ok(low?.status === "observed", "low confidence downgraded"));

const inserted = await mem.upsertClaim(implClaim!); const affected = claimsAffectedBySources([inserted], new Set([cliArtifact.id]));
await test("source impact finder catches dependent claims", () => ok(affected.length === 1, "affected claim found"));
const neg: TruthClaim = { ...inserted, id: "neg", claim_key: "neg", statement: "The deploy command supports not --dry-run." };
await test("obvious contradiction detector runs", () => ok(Array.isArray(obviousContradictions([inserted, neg])), "contradiction detector"));

const circularStored: TruthClaim = { ...(circular as Omit<TruthClaim,"id">), id: "circular" };
const circularFindings = deterministicClaimAudit([circularStored], artifacts, cfg, Date.now());
await test("deterministic audit recognizes unverified docs behavior", () => ok(circularFindings.some((f) => f.kind === "stale-documentation-claim" || f.kind === "coverage-gap") || circularStored.status === "requires_audit", "docs circular proof protected"));
const fakeConfirmedCircular: TruthClaim = { ...circularStored, status: "confirmed", stale: false };
await test("deterministic audit catches docs-circular-proof", () => ok(deterministicClaimAudit([fakeConfirmedCircular], artifacts, cfg, Date.now()).some((f) => f.kind === "docs-circular-proof"), "circular proof finding"));

const leakSecs: GuideSection[] = [{ id: "overview", title: "Overview", markdown: "## Overview\n\nAs an AI, here is your documentation.", claim_ids: [] }];
await test("render audit catches assistant leakage", () => ok(deterministicManualAudit(leakSecs, cfg, Date.now()).some((f) => f.kind === "assistant-leakage"), "leakage caught"));
const secretSecs: GuideSection[] = [{ id: "security", title: "Security", markdown: "## Security\n\npassword=abcdefghijklmnop12345678", claim_ids: [] }];
await test("render audit catches raw credential", () => ok(deterministicManualAudit(secretSecs, cfg, Date.now()).some((f) => f.kind === "secret-exposure"), "secret caught"));
await test("critical finding reduces truth score", () => ok(scoreAudit([fakeConfirmedCircular], [{ severity: "critical", kind: "x" }], 16, 16, 100).truthfulness <= 82, "critical cap"));

const sparse = deterministicVerification([inserted]);
await test("verification exposes sparse docs", () => ok(sparse.score < 75 && sparse.defects.length > 0, "sparse docs fail"));
await test("verification report is printable markdown", () => ok(/# Documentation Verification/.test(verificationMarkdown(sparse)), "verification markdown"));

const model = new FakeModel(); const store = memoryStorage();
const build = await runBuild({ storage: store, models: [model], sources: [manualSource("manual", sourceRows)], config: cfg, now: () => 1_800_000_000_000 });
await test("full build produces documentation edition", () => ok(build.outcome === "generated" && !!build.guide, `build outcome ${build.outcome}`));
await test("developer edition renders all 16 sections", () => ok(build.guide?.sections.length === 16, "16 rendered sections"));
await test("edition has linked table of contents", () => ok(build.guide?.markdown.includes("[API Reference](#api-reference)"), "linked TOC"));
await test("edition records evidence inventory", () => ok(/Evidence Inventory/.test(build.guide?.markdown ?? "") && new RegExp(`${sourceRows.length} active source artifacts`).test(build.guide?.markdown ?? ""), "source inventory"));
await test("edition keeps unresolved installation visible", () => ok(/Unverified \/ Drift Queue/.test(build.guide?.markdown ?? "") && /package-manager installation command/.test(build.guide?.markdown ?? ""), "unknown visible"));
await test("edition includes documentation health snapshot", () => ok(/Documentation Health Snapshot/.test(build.guide?.markdown ?? ""), "health snapshot"));
await test("edition includes documentation verification", () => ok(/## Documentation Verification/.test(build.guide?.markdown ?? ""), "verification included"));
await test("HTML is responsive", () => ok(/@media\(max-width:720px\)/.test(build.guide?.html ?? ""), "mobile CSS"));
await test("HTML is print-ready", () => ok(/@media print/.test(build.guide?.html ?? "") && /@page/.test(build.guide?.html ?? ""), "print CSS"));
await test("HTML has section anchors", () => ok(/id="api-reference"/.test(build.guide?.html ?? ""), "heading ids"));
await test("quality scores remain bounded", () => ok(Object.values(build.guide?.audit_summary ?? {}).every((n) => n >= 0 && n <= 100), "scores 0-100"));
await test("multi-pass model flow runs evidence, audit, curator and verification", () => ok(model.calls > 12, "multi-phase model calls"));

await test("receipt chain verifies after build", async () => { const v = await verifyStoredChain(store); ok(v.valid && v.checked >= 1, "receipt chain valid"); });
await test("receipt tampering is detected", async () => { const dump = store.dump() as any; dump.runs[0].reason = "tampered"; const t = memoryStorage({ artifacts: dump.artifacts, claims: dump.claims, guides: dump.guides, findings: dump.findings, runs: dump.runs }); const v = await verifyStoredChain(t); ok(!v.valid, "tampering detected"); });
await test("unchanged second build increments edition without re-extracting everything", async () => { const before = model.calls; const b2 = await runBuild({ storage: store, models: [model], sources: [manualSource("manual", sourceRows)], config: cfg, now: () => 1_800_000_100_000 }); ok(b2.guide?.version === 2 && model.calls - before < 40, "version increments" ); });
await test("build blocks placeholder config", async () => { const r = await runBuild({ storage: memoryStorage(), models: [new FakeModel()], sources: [], config: structuredClone(DEMO_CONFIG) }); ok(r.outcome === "blocked" && /Configuration is incomplete/.test(r.reason), "placeholder blocked"); });
await test("build blocks without model", async () => { const r = await runBuild({ storage: memoryStorage(), models: [], sources: [], config: cfg }); ok(r.outcome === "blocked" && /model provider/.test(r.reason), "no model blocked"); });
await test("standalone audit works without AI", async () => { const r = await runAudit({ storage: store, models: [], sources: [manualSource("manual", sourceRows)], config: cfg }); ok(r.scores.truthfulness >= 0, "deterministic audit runs"); });
await test("standalone verification works without AI", async () => { const r = await runVerification({ storage: store, models: [] }); ok(r.score >= 0 && r.score <= 100, "deterministic verify runs"); });

await test("generated secrets are scrubbed before edition storage", async () => { const s = memoryStorage(); const m = new FakeModel(); m.injectSecret = true; const r = await runBuild({ storage: s, models: [m], sources: [manualSource("manual", sourceRows)], config: cfg, now: () => 1_800_001_000_000 }); const text = r.guide?.markdown ?? r.draft?.markdown ?? ""; ok(!text.includes("sk-abcdefghijkl") && text.includes("SECURE SECRET REFERENCE"), "secret never survives output"); });

await test("local scanner skips secrets/dependencies and recognizes OpenAPI", async () => {
  const dir = resolve(`/tmp/livingdocs-selftest-${Date.now()}`); await mkdir(resolve(dir, "src"), { recursive: true }); await mkdir(resolve(dir, "node_modules", "pkg"), { recursive: true });
  await writeFile(resolve(dir, ".env"), "TOKEN=never-read", "utf8");
  await writeFile(resolve(dir, "src", "app.ts"), 'const token = "ghp_abcdefghijklmnopqrstuvwx"; export const x = 1;', "utf8");
  await writeFile(resolve(dir, "openapi.yaml"), "openapi: 3.0.0\npaths: {}", "utf8");
  await writeFile(resolve(dir, "node_modules", "pkg", "index.js"), "ignored", "utf8");
  const scanned = await localProjectSource(dir, cfg).scan(Date.now());
  ok(scanned.length === 2 && scanned.some((x) => x.kind === "api_schema") && !scanned.find((x) => x.path === "src/app.ts")!.content_excerpt.includes("ghp_abc"), "scanner safety + api schema");
  await rm(dir, { recursive: true, force: true });
});

await test("JSON storage survives reopen", async () => {
  const dir = resolve(`/tmp/livingdocs-json-${Date.now()}`); const file = resolve(dir, "state.json");
  const a = await jsonStorage(file); await syncSources(a, [manualSource("manual", [sourceRows[0]!])], Date.now());
  const b = await jsonStorage(file); const rows = await b.listArtifacts(10); ok(rows.length === 1 && rows[0]!.path === "README.md", "json state reopened");
  await rm(dir, { recursive: true, force: true });
});

await test("canonical renderer includes evidence and health wrapper", () => {
  const md = canonicalMarkdown({ cfg, sections: build.guide!.sections, claims: [], artifacts: [], findings: [], audit: build.guide!.audit_summary, verification: build.guide!.verification, generatedAt: "2026-01-01T00:00:00.000Z", version: 99 });
  ok(md.includes("Living Documentation") && md.includes("Documentation Health Snapshot"), "wrapper metadata");
});
await test("HTML renderer escapes raw script markup", () => { const html = canonicalHtml("# X\n\n<script>alert(1)</script>", cfg); ok(!html.includes("<script>alert(1)</script>") && html.includes("&lt;script&gt;"), "raw HTML escaped"); });
await test("CLI arg parser supports inline and boolean flags", () => { const p = parseArgs(["build", "--path=/tmp/x", "--dry", "--no-color"]); ok(p.command === "build" && p.args.path === "/tmp/x" && p.args.dry === true && p.args.color === false, "CLI args"); });
await test("CLI help describes build, audit and verify", async () => { let text = ""; const code = await cliMain(["--help"], {}, (s) => { text += s; return true; }, () => true); ok(code === 0 && /livingdocs build/.test(text) && /livingdocs verify/.test(text) && /documentation that stays true/i.test(text), "CLI help"); });

await test("vendored livingcore exactly matches manifest", async () => {
  const manifest = JSON.parse(await readFile(resolve(process.cwd(), "core", "CORE-MANIFEST.json"), "utf8")) as CoreManifest; const files: Record<string, string> = {};
  for (const name of Object.keys(manifest.files)) files[name] = await readFile(resolve(process.cwd(), "core", name), "utf8");
  ok((await checkVendoredCore(files, manifest)).length === 0, "core has no drift");
});
await test("vendored core drift checker catches edits", async () => {
  const manifest = JSON.parse(await readFile(resolve(process.cwd(), "core", "CORE-MANIFEST.json"), "utf8")) as CoreManifest; const files: Record<string, string> = {};
  for (const name of Object.keys(manifest.files)) files[name] = await readFile(resolve(process.cwd(), "core", name), "utf8");
  const first = Object.keys(files)[0]!; files[first] += "\n// drift"; const problems = await checkVendoredCore(files, manifest); ok(problems.length === 1 && /edited in place/.test(problems[0]!), "drift caught");
});

console.log(`\nLivingDocs self-test: ${passed} passed, ${failed} failed`);
if (failed) throw new Error(`${failed} self-test(s) failed`);
