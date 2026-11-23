import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checkVendoredCore, type CoreManifest } from "../core/vendor.ts";
import type { ModelProvider } from "../core/types.ts";
import { memoryStorage } from "../adapters/memory.ts";
import { jsonStorage } from "../adapters/json.ts";
import { localProjectSource, redactSecrets } from "../adapters/local.ts";
import { manualSource } from "../adapters/manual.ts";
import { deterministicClaimAudit, deterministicManualAudit, scoreAudit } from "../engine/audit.ts";
import { ALL_SECTIONS, DEMO_CONFIG, sectionsForPreset, validateConfig, type LivingGuideConfig } from "../engine/config.ts";
import { runAudit, runBuild, runResurrection, scrubSensitiveText } from "../engine/engine.ts";
import { canonicalHtml, canonicalMarkdown, slugify } from "../engine/render.ts";
import { deterministicResurrection, resurrectionMarkdown } from "../engine/resurrection.ts";
import { syncSources } from "../engine/source.ts";
import { claimKey, claimsAffectedBySources, obviousContradictions, sanitizeClaim, sourceSupportsQuote } from "../engine/truth.ts";
import { verifyStoredChain } from "../engine/receipts.ts";
import type { GuideSection, SourceArtifact, TruthClaim } from "../engine/ports.ts";
import { main as cliMain, parseArgs } from "../cli/main.ts";

declare const process: { cwd(): string };
let passed = 0; let failed = 0;
function ok(cond: unknown, name: string) { if (!cond) { failed += 1; console.error(`✗ ${name}`); } else { passed += 1; console.log(`✓ ${name}`); } }
async function test(name: string, fn: () => unknown | Promise<unknown>) { try { await fn(); ok(true, name); } catch (e) { ok(false, `${name}: ${e instanceof Error ? e.message : String(e)}`); } }

function config(): LivingGuideConfig {
  const c = structuredClone(DEMO_CONFIG);
  c.project = { name: "Project Phoenix", alternateNames: ["Phoenix"], description: "A deployment orchestration project.", domains: ["phoenix.example"], repository: "https://example.com/repo" };
  c.owner = { name: "Test Owner", role: "Founder", email: "owner@example.com", website: "https://example.com", location: "Test City" };
  return c;
}

const sources = [
  { id: "readme", title: "README", kind: "documentation" as const, text: "Project Phoenix is a deployment orchestrator. It exists to keep releases safe. PostgreSQL was chosen because receipt history must be durable. Do not edit receipt history." },
  { id: "architecture", title: "ARCHITECTURE", kind: "documentation" as const, text: "State is stored in PostgreSQL. The CLI runs with npm run start. Production is deployed to Cloudflare Workers. Engine module depends on Queue adapter. Production assumptions must be verified before resuming." },
  { id: "roadmap", title: "ROADMAP", kind: "documentation" as const, text: "Planned: add offline recovery tooling. Recovery guide: resume by running tests before deployment. Secrets are stored in an external vault." },
  { id: "package", title: "package.json", kind: "configuration" as const, text: '{"name":"phoenix","version":"1.0.0"}' },
];

function parseBlocks(prompt: string): Map<string, string> {
  const out = new Map<string, string>();
  const chunks = prompt.split(/\n\n--- SOURCE ---\n\n/);
  for (const c of chunks) { const m = c.match(/SOURCE_ID: ([^\n]+)[\s\S]*?CONTENT:\n([\s\S]*)$/); if (m) out.set(m[1]!, m[2]!); }
  return out;
}

class FakeModel implements ModelProvider {
  id = "fake-guide";
  calls = 0;
  injectSecret = false;
  async chat(messages: { role: string; content: string }[]): Promise<string> {
    this.calls += 1; const user = messages[messages.length - 1]!.content;
    if (/Extract the most important/.test(user)) {
      const b = parseBlocks(user); const find = (needle: string) => [...b.entries()].find(([, text]) => text.includes(needle))?.[0] ?? "";
      const readme = find("Project Phoenix is a deployment orchestrator."); const arch = find("State is stored in PostgreSQL."); const road = find("Planned: add offline recovery tooling."); const pkg = find('{"name":"phoenix"');
      const claims = [
        { section: "executive-summary", statement: "Project Phoenix is a deployment orchestrator built to keep releases safe.", status: "observed", confidence: .95, sources: [{ source_id: readme, quote: "Project Phoenix is a deployment orchestrator." }, { source_id: readme, quote: "It exists to keep releases safe." }], basis: "project_file", tags: ["purpose"] },
        { section: "canonical-identity", statement: "The project package identifies itself as phoenix version 1.0.0.", status: "observed", confidence: .95, sources: [{ source_id: pkg, quote: '{"name":"phoenix","version":"1.0.0"}' }], basis: "project_file", tags: ["identity"] },
        { section: "project-classification", statement: "The project is implemented as a deployment orchestrator.", status: "inferred", confidence: .8, sources: [{ source_id: readme, quote: "Project Phoenix is a deployment orchestrator." }], basis: "strategic_inference", tags: ["classification"] },
        { section: "core-concept", statement: "The documented purpose is to keep releases safe.", status: "observed", confidence: .94, sources: [{ source_id: readme, quote: "It exists to keep releases safe." }], basis: "project_file", tags: ["purpose"] },
        { section: "feature-inventory", statement: "A deployment orchestration capability is documented.", status: "observed", confidence: .9, sources: [{ source_id: readme, quote: "Project Phoenix is a deployment orchestrator." }], basis: "project_file", tags: ["feature"] },
        { section: "architecture-analysis", statement: "Project state is stored in PostgreSQL.", status: "confirmed", confidence: .95, sources: [{ source_id: arch, quote: "State is stored in PostgreSQL." }], basis: "project_file", tags: ["storage", "architecture"] },
        { section: "architecture-analysis", statement: "The engine module depends on a Queue adapter.", status: "observed", confidence: .9, sources: [{ source_id: arch, quote: "Engine module depends on Queue adapter." }], basis: "project_file", tags: ["dependency"] },
        { section: "architecture-analysis", statement: "PostgreSQL was chosen because receipt history must be durable.", status: "observed", confidence: .92, sources: [{ source_id: readme, quote: "PostgreSQL was chosen because receipt history must be durable." }], basis: "project_file", tags: ["decision", "rationale"] },
        { section: "current-state-assessment", statement: "Production is deployed to Cloudflare Workers.", status: "observed", confidence: .92, sources: [{ source_id: arch, quote: "Production is deployed to Cloudflare Workers." }], basis: "project_file", tags: ["deployment"] },
        { section: "future-vision", statement: "Offline recovery tooling is planned.", status: "planned", confidence: .9, sources: [{ source_id: road, quote: "Planned: add offline recovery tooling." }], basis: "project_file", tags: ["roadmap"] },
        { section: "priority-roadmap", statement: "The next documented roadmap item is offline recovery tooling.", status: "planned", confidence: .88, sources: [{ source_id: road, quote: "Planned: add offline recovery tooling." }], basis: "project_file", tags: ["roadmap", "next"] },
        { section: "preservation-continuity", statement: "The documented local run procedure uses npm run start.", status: "observed", confidence: .94, sources: [{ source_id: arch, quote: "The CLI runs with npm run start." }], basis: "project_file", tags: ["runbook"] },
        { section: "preservation-continuity", statement: "Receipt history is a protected invariant and must not be edited casually.", status: "observed", confidence: .9, sources: [{ source_id: readme, quote: "Do not edit receipt history." }], basis: "project_file", tags: ["invariant"] },
        { section: "preservation-continuity", statement: "Production assumptions must be re-verified before resuming the project.", status: "observed", confidence: .9, sources: [{ source_id: arch, quote: "Production assumptions must be verified before resuming." }], basis: "project_file", tags: ["stale", "continuity"] },
        { section: "preservation-continuity", statement: "Secrets are documented as living in an external vault.", status: "observed", confidence: .9, sources: [{ source_id: road, quote: "Secrets are stored in an external vault." }], basis: "project_file", tags: ["access", "secrets"] },
        { section: "preservation-continuity", statement: "Recovery guidance says to resume by running tests before deployment.", status: "observed", confidence: .9, sources: [{ source_id: road, quote: "Recovery guide: resume by running tests before deployment." }], basis: "project_file", tags: ["recovery", "resume"] },
      ].filter((c) => c.sources.every((s) => !!s.source_id));
      return JSON.stringify({ claims });
    }
    if (/Audit this claim ledger/.test(user)) return JSON.stringify({ findings: [] });
    if (/Run a RESURRECTION TEST/.test(user)) return JSON.stringify({ answerable: ["core architecture", "run procedure"], defects: [], notes: ["Re-verify external services after long absence."], score: 92 });
    if (/Perform the final enterprise audit/.test(user)) return JSON.stringify({ findings: [], scores: { truthfulness: 97, completeness: 94, continuity_readiness: 92, enterprise_polish: 95, readability: 94, technical_clarity: 95, strategic_clarity: 90, future_maintainability: 93, acquisition_readiness: 84, archival_quality: 96 } });
    const m = user.match(/Write the "([^"]+)" section/); if (m) return `## ${m[1]}\n\n**Status: Evidence-backed with explicit uncertainty where required.** This section is derived from the canonical claim ledger.${this.injectSecret ? " api_key=sk-abcdefghijklmnopqrstuvwx" : ""}`;
    return JSON.stringify({ findings: [] });
  }
}

await test("placeholder config is rejected", () => ok(validateConfig(DEMO_CONFIG).length > 0, "placeholder config has problems"));
await test("complete config validates", () => ok(validateConfig(config()).length === 0, "complete config is clean"));
await test("founder preset contains all 18 canonical sections", () => ok(sectionsForPreset(config()).length === 18 && ALL_SECTIONS.length === 18, "founder has 18 sections"));
await test("operator preset is intentionally smaller", () => { const c = config(); c.preset = "operator"; ok(sectionsForPreset(c).length < 18, "operator subset"); });
await test("slugify makes stable anchors", () => ok(slugify("Preservation & Continuity") === "preservation-continuity", "anchor slug"));
await test("secret redactor removes API-like values", () => { const r = redactSecrets("token=abcdefghijklmnop12345678 sk-abcdefghijklmnopqrstuvwx"); ok(!r.text.includes("abcdefghijklmnop") && r.redactions >= 2, "redaction happened"); });
await test("generated secret scrubber uses secure reference", () => { const r = scrubSensitiveText("api_key=sk-abcdefghijklmnopqrstuvwx"); ok(!r.includes("sk-abc") && r.includes("SECURE SECRET REFERENCE"), "generated secret scrubbed"); });

const cfg = config(); const mem = memoryStorage(); const src = manualSource("manual", sources);
const sync = await syncSources(mem, [src], Date.now());
await test("manual source inserts all artifacts", () => ok(sync.inserted === sources.length, "all sources inserted"));
await test("second identical sync is unchanged", async () => { const s = await syncSources(mem, [src], Date.now() + 1000); ok(s.changed === 0 && s.unchanged === sources.length, "idempotent sync"); });
const arts = await mem.listArtifacts(100);
await test("artifact inventory has stable active rows", () => ok(arts.length === 4 && arts.every((a) => a.status === "active"), "active artifacts"));
await test("source quote support is exact after whitespace normalization", () => ok(sourceSupportsQuote(arts[0]!, arts[0]!.content_excerpt.split(".")[0] + "."), "quote support"));
await test("claim keys are deterministic", async () => ok(await claimKey("core-concept", "Hello world") === await claimKey("core-concept", "Hello   world"), "same normalized claim key"));

const sampleArt = arts.find((a) => a.path === "README")!;
const supported = await sanitizeClaim({ section: "core-concept", statement: "Phoenix is a deployment orchestrator.", status: "confirmed", confidence: .95, sources: [{ source_id: sampleArt.id, quote: "Project Phoenix is a deployment orchestrator." }], basis: "project_file" }, arts, ALL_SECTIONS, cfg, Date.now());
await test("confirmed claim survives with real evidence quote", () => ok(supported?.status === "confirmed" && supported.sources.length === 1, "confirmed retained"));
const unsupported = await sanitizeClaim({ section: "core-concept", statement: "Phoenix has ten million users.", status: "confirmed", confidence: .99, sources: [{ source_id: sampleArt.id, quote: "ten million users" }], basis: "project_file" }, arts, ALL_SECTIONS, cfg, Date.now());
await test("bad evidence quote downgrades certainty", () => ok(unsupported?.status === "needs_confirmation" && unsupported.sources.length === 0, "unsupported certainty downgraded"));
const low = await sanitizeClaim({ section: "core-concept", statement: "Phoenix has a documented purpose.", status: "confirmed", confidence: .5, sources: [{ source_id: sampleArt.id, quote: "It exists to keep releases safe." }], basis: "project_file" }, arts, ALL_SECTIONS, cfg, Date.now());
await test("confirmed below confidence floor becomes observed", () => ok(low?.status === "observed", "low confidence downgraded"));

if (supported) await mem.upsertClaim(supported);
const insertedClaim = (await mem.listClaims(10))[0]!;
await test("claim upsert creates a durable claim id", () => ok(!!insertedClaim.id, "claim id exists"));
await test("claim upsert by key preserves identity", async () => { const again = await mem.upsertClaim({ ...supported!, last_verified_at: new Date(Date.now() + 1000).toISOString() }); ok(again.id === insertedClaim.id, "same claim id"); });
await test("source impact finder catches dependent claims", () => ok(claimsAffectedBySources([insertedClaim], new Set([sampleArt.id])).length === 1, "affected claim found"));

const opposite: TruthClaim = { ...insertedClaim, id: "other", claim_key: "other", statement: "Phoenix is not a deployment orchestrator." };
await test("obvious contradiction detector catches direct negation", () => ok(obviousContradictions([insertedClaim, opposite]).length >= 1, "contradiction found"));

const badClaim: TruthClaim = { ...insertedClaim, id: "bad", sources: [], status: "confirmed" };
await test("deterministic audit catches unsupported confirmed claims", () => ok(deterministicClaimAudit([badClaim], arts, cfg, Date.now()).some((f) => f.kind === "unsupported-certainty" && f.severity === "critical"), "unsupported certainty finding"));
await test("manual audit catches assistant leakage", () => { const secs: GuideSection[] = [{ id: "executive-summary", title: "Executive Summary", markdown: "## Executive Summary\n\nAs an AI language model, here is the guide.", claim_ids: [] }]; ok(deterministicManualAudit(secs, cfg, Date.now()).some((f) => f.kind === "assistant-leakage"), "leakage caught"); });
await test("manual audit catches raw credentials", () => { const secs: GuideSection[] = [{ id: "executive-summary", title: "Executive Summary", markdown: "## Executive Summary\n\npassword=abcdefghijklmnop12345678", claim_ids: [] }]; ok(deterministicManualAudit(secs, cfg, Date.now()).some((f) => f.kind === "secret-exposure"), "secret caught"); });
await test("audit score is capped by critical findings", () => ok(scoreAudit([badClaim], [{ severity: "critical", kind: "x" }], 18, 18, 100).truthfulness <= 82, "critical cap"));

const sparseRes = deterministicResurrection([insertedClaim]);
await test("resurrection test exposes continuity defects", () => ok(sparseRes.score < 75 && sparseRes.defects.length > 0, "sparse archive fails"));
await test("resurrection report is printable markdown", () => ok(/# Resurrection Test/.test(resurrectionMarkdown(sparseRes)), "resurrection markdown"));

const model = new FakeModel(); const store = memoryStorage();
const build = await runBuild({ storage: store, models: [model], sources: [manualSource("manual", sources)], config: cfg, now: () => 1_800_000_000_000 });
await test("full build produces canonical guide", () => ok(build.outcome === "generated" && !!build.guide, `build outcome ${build.outcome}`));
await test("guide uses all founder sections", () => ok(build.guide?.sections.length === 18, "18 rendered sections"));
await test("guide has linked table of contents", () => ok(build.guide?.markdown.includes("[Architecture Analysis](#architecture-analysis)"), "linked TOC"));
await test("guide records source inventory", () => ok(/Source Inventory/.test(build.guide?.markdown ?? "") && /4 active source artifacts/.test(build.guide?.markdown ?? ""), "source inventory"));
await test("guide preserves unknown sections instead of inventing them", () => ok(/Unknown \/ requires further audit/.test(build.guide?.markdown ?? ""), "unknown preserved"));
await test("HTML is responsive", () => ok(/@media\(max-width:720px\)/.test(build.guide?.html ?? ""), "mobile CSS"));
await test("HTML is print ready", () => ok(/@media print/.test(build.guide?.html ?? "") && /@page/.test(build.guide?.html ?? ""), "print CSS"));
await test("HTML has heading anchors", () => ok(/id="architecture-analysis"/.test(build.guide?.html ?? ""), "heading ids"));
await test("quality scores are bounded", () => ok(Object.values(build.guide?.audit_summary ?? {}).every((n) => n >= 0 && n <= 100), "scores 0-100"));
await test("resurrection is included in guide", () => ok(/## Resurrection Test/.test(build.guide?.markdown ?? ""), "resurrection section included"));
await test("model is used for archive, auditor, curator and resurrection passes", () => ok(model.calls > 10, "multi-phase model calls"));

await test("receipt chain verifies after generated build", async () => { const v = await verifyStoredChain(store); ok(v.valid && v.checked >= 1, "receipt chain valid"); });
await test("receipt tampering is detected", async () => { const dump = store.dump() as any; dump.runs[0].reason = "tampered"; const tampered = memoryStorage({ artifacts: dump.artifacts, claims: dump.claims, guides: dump.guides, findings: dump.findings, runs: dump.runs }); const v = await verifyStoredChain(tampered); ok(!v.valid, "tampering detected"); });

await test("second unchanged build increments guide version without re-extracting sources", async () => { const before = model.calls; const b2 = await runBuild({ storage: store, models: [model], sources: [manualSource("manual", sources)], config: cfg, now: () => 1_800_000_100_000 }); ok(b2.guide?.version === 2 && model.calls - before < model.calls, "version increments"); });
await test("build refuses incomplete placeholder configuration", async () => { const r = await runBuild({ storage: memoryStorage(), models: [new FakeModel()], sources: [], config: structuredClone(DEMO_CONFIG) }); ok(r.outcome === "blocked" && /Configuration is incomplete/.test(r.reason), "placeholder blocked"); });
await test("build refuses to hallucinate without a model", async () => { const r = await runBuild({ storage: memoryStorage(), models: [], sources: [], config: cfg }); ok(r.outcome === "blocked" && /model provider/.test(r.reason), "no model blocked"); });

await test("standalone audit works without AI", async () => { const r = await runAudit({ storage: store, models: [], sources: [manualSource("manual", sources)], config: cfg }); ok(r.findings.length >= 0 && r.scores.truthfulness >= 0, "deterministic audit runs"); });
await test("standalone resurrection works without AI", async () => { const r = await runResurrection({ storage: store, models: [] }); ok(r.score >= 0 && r.score <= 100, "deterministic resurrection runs"); });

await test("generated secret text is scrubbed before a section is stored", async () => { const s = memoryStorage(); const m = new FakeModel(); m.injectSecret = true; const r = await runBuild({ storage: s, models: [m], sources: [manualSource("manual", sources)], config: cfg, now: () => 1_800_001_000_000 }); const text = r.guide?.markdown ?? r.draft?.markdown ?? ""; ok(!text.includes("sk-abcdefghijkl") && text.includes("SECURE SECRET REFERENCE"), "secret never survives output"); });

await test("local scanner skips .env and node_modules and redacts inline secrets", async () => {
  const dir = resolve(`/tmp/livingguide-selftest-${Date.now()}`); await mkdir(resolve(dir, "src"), { recursive: true }); await mkdir(resolve(dir, "node_modules", "pkg"), { recursive: true });
  await writeFile(resolve(dir, ".env"), "TOKEN=should-never-be-read", "utf8");
  await writeFile(resolve(dir, "src", "app.ts"), 'const token = "ghp_abcdefghijklmnopqrstuvwx"; export const x = 1;', "utf8");
  await writeFile(resolve(dir, "node_modules", "pkg", "index.js"), "secret package", "utf8");
  const scanned = await localProjectSource(dir, cfg).scan(Date.now());
  ok(scanned.length === 1 && scanned[0]!.path === "src/app.ts" && !scanned[0]!.content_excerpt.includes("ghp_abc") && Number(scanned[0]!.metadata.redactions) >= 1, "scanner safety");
  await rm(dir, { recursive: true, force: true });
});

await test("JSON storage survives process-style reopen", async () => {
  const dir = resolve(`/tmp/livingguide-json-${Date.now()}`); const file = resolve(dir, "state.json");
  const a = await jsonStorage(file); await syncSources(a, [manualSource("manual", [sources[0]!])], Date.now());
  const b = await jsonStorage(file); const rows = await b.listArtifacts(10); ok(rows.length === 1 && rows[0]!.path === "README", "json state reopened");
  await rm(dir, { recursive: true, force: true });
});

await test("canonical renderer includes attribution and audit snapshot", () => {
  const md = canonicalMarkdown({ cfg, sections: build.guide!.sections, claims: [], artifacts: [], findings: [], audit: build.guide!.audit_summary, resurrection: build.guide!.resurrection, generatedAt: "2026-01-01T00:00:00.000Z", version: 99 });
  ok(md.includes("Test Owner") && md.includes("Canonical Audit Snapshot"), "wrapper metadata");
});
await test("HTML renderer escapes raw script text from Markdown", () => { const html = canonicalHtml("# X\n\n<script>alert(1)</script>", cfg); ok(!html.includes("<script>alert(1)</script>") && html.includes("&lt;script&gt;"), "raw HTML escaped"); });

await test("CLI arg parser supports inline and boolean flags", () => { const p = parseArgs(["build", "--path=/tmp/x", "--dry", "--no-color"]); ok(p.command === "build" && p.args.path === "/tmp/x" && p.args.dry === true && p.args.color === false, "CLI args" ); });
await test("CLI help describes canonical commands", async () => { let text = ""; const code = await cliMain(["--help"], {}, (s) => { text += s; return true; }, () => true); ok(code === 0 && /livingguide build/.test(text) && /resurrection/.test(text), "CLI help"); });

await test("vendored livingcore exactly matches its manifest", async () => {
  const manifest = JSON.parse(await readFile(resolve(process.cwd(), "core", "CORE-MANIFEST.json"), "utf8")) as CoreManifest;
  const files: Record<string, string> = {};
  for (const name of Object.keys(manifest.files)) files[name] = await readFile(resolve(process.cwd(), "core", name), "utf8");
  const problems = await checkVendoredCore(files, manifest); ok(problems.length === 0, "core has no drift");
});
await test("vendored core drift checker catches edits", async () => {
  const manifest = JSON.parse(await readFile(resolve(process.cwd(), "core", "CORE-MANIFEST.json"), "utf8")) as CoreManifest;
  const files: Record<string, string> = {};
  for (const name of Object.keys(manifest.files)) files[name] = await readFile(resolve(process.cwd(), "core", name), "utf8");
  const first = Object.keys(files)[0]!; files[first] += "\n// drift"; const problems = await checkVendoredCore(files, manifest); ok(problems.length === 1 && /edited in place/.test(problems[0]!), "drift caught");
});

console.log(`\nLivingGuide self-test: ${passed} passed, ${failed} failed`);
if (failed) throw new Error(`${failed} self-test(s) failed`);
