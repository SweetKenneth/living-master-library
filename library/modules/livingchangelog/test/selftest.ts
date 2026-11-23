import { memoryStorage } from "../adapters/memory.ts";
import { githubSource, staticSource } from "../adapters/github.ts";
import { type LivingChangelogConfig, validateConfig } from "../engine/config.ts";
import { auditOne } from "../engine/corrector.ts";
import { classifyAgent, gate, safeEqual } from "../engine/defense.ts";
import { deterministicIgnore, shippingProof, syncSources } from "../engine/evidence.ts";
import { runTick } from "../engine/engine.ts";
import { createHandler } from "../engine/http.ts";
import { screen } from "../engine/immune.ts";
import { renderMarkdown } from "../engine/markdown.ts";
import { renderAtom, renderJsonFeed } from "../engine/feed.ts";
import { Nexus } from "../engine/nexus.ts";
import { stream } from "../engine/oracle.ts";
import type { ChangeEvidence, ChangelogEntry, ModelProvider, Run } from "../engine/ports.ts";
import { sealRun, verifyChain, verifyStoredChain } from "../engine/receipts.ts";
import { VOICES, VOICE_NAMES } from "../engine/voice.ts";
import { composeAnnouncement, flushAnnouncements, graphemes, outboxSummary } from "../engine/announce.ts";
import { announcersFromEnv, bskyLinkFacet, discord, oauth1Signature, slack, webhook } from "../adapters/announce.ts";
import type { Announcer } from "../engine/ports.ts";
import { formatReport, preview, previewConfig, type PreviewResult } from "../cli/preview.ts";
import { detectModels, main as cliMain, normalizeRepo, parseArgs, parseSince } from "../cli/main.ts";

let passed = 0; let failed = 0;
const ok = (cond: unknown, name: string) => { if (cond) { passed++; console.log(`ok ${passed} - ${name}`); } else { failed++; console.error(`not ok - ${name}`); } };
const T0 = Date.parse("2026-10-01T18:00:00Z");

const cfg: LivingChangelogConfig = {
  site: { name: "Acme", url: "https://acme.test", changelogName: "Acme Changelog", changelogPath: "/changelog", tagline: "What changed" },
  audience: "Acme customers",
  voice: "Plain and factual.",
  productFacts: "Acme has a dashboard. Pro includes exports. The mobile app exists on iOS and Android.",
  neverClaim: ["A merge is deployed unless shipping evidence proves it"],
  retiredWords: [{ pattern: "\\brevolutionary\\b", replaceWith: "state what changed" }],
  siteLinks: [{ path: "/", label: "Home", note: "home" }],
  categories: ["added", "improved", "fixed", "changed", "removed", "security", "developer"],
  sourcePolicy: { shippingPolicy: "explicit-only", productionBranch: "main", productionEnvironments: ["production", "prod", "live"], bootstrapLookbackDays: 7, maxPendingEvidence: 100, maxEvidencePerEntry: 16, staleEvidenceDays: 30, ignoredLabels: ["no-changelog", "chore"], ignoredTitlePatterns: ["^chore:"], publishDeveloperOnly: false, publishableKinds: ["release", "deployment", "pull_request", "commit", "manual"] },
  wordTargets: { update: { min: 20, max: 180 }, release: { min: 30, max: 260 } },
  qualityFloor: { reader: 70, skeptic: 80, fitness: 0.7 },
  cadence: { minHoursBetweenEntries: 0, auditCooldownHours: 1, auditEveryNthTick: 99 },
  breaker: { maxConsecutiveFailures: 3, cooldownMinutes: 60, heartbeatStaleHours: 48 },
  defense: { publicReadsPerMinute: 10, adminCallsPerMinute: 20 },
  seed: "test",
};

function evidence(id: string, kind: ChangeEvidence["kind"], title: string, extra: Partial<ChangeEvidence> = {}): ChangeEvidence {
  return { id, source: "github:acme/app", external_id: id, kind, title, summary: `${title}. Customer-facing behavior is described here.`, url: `https://example.test/${id}`, author: "dev", labels: [], occurred_at: new Date(T0 - 60_000).toISOString(), ingested_at: new Date(T0).toISOString(), status: "pending", attempts: 0, ignore_reason: null, metadata: {}, ...extra };
}
function entry(id = "entry1", patch: Partial<ChangelogEntry> = {}): ChangelogEntry {
  return { id, slug: "exports-are-faster", title: "Exports are faster", excerpt: "Exports now finish with clearer progress.", body: "## Improved\n\nExports now show clearer progress while a file is prepared for download. This update is available in Pro.", role: "release", version: "v2.0.0", categories: ["improved"], evidence_ids: ["rel1", "pr1"], evidence_urls: [], audience: ["Pro users"], caveats: [], epistemic_status: "established", reader_score: 90, skeptic_score: 95, fitness: 0.9, published_at: new Date(T0 - 2 * 86400_000).toISOString(), last_audited_at: null, corrections: [], ...patch };
}

function autoModel(opts: { reviewScore?: number; triage?: "publish" | "hold"; draft?: string } = {}): ModelProvider {
  return {
    id: "fake",
    async chat(messages, call) {
      const p = messages.map((m) => m.content).join("\n");
      if (p.includes("Decide whether the pending evidence")) {
        const ids = [...p.matchAll(/^\[([^\]]+)\] /gm)].map((m) => m[1]!);
        return JSON.stringify({ decision: opts.triage ?? "publish", reason: "Meaningful shipped change", selected_ids: ids.slice(0, 4), ignored_ids: [], title: "Exports are clearer and more reliable", version: "v2.0.0", categories: ["improved", "fixed"], audience: ["Pro users"], role: "release" });
      }
      if (p.includes("Write the changelog entry")) return opts.draft ?? "## Improved\n\nExports now show clearer progress while a file is prepared, so Pro users can see that the job is still moving.\n\n## Fixed\n\nThe release also fixes the export completion state described in the release evidence. The update is now available as part of v2.0.0.";
      if (p.includes("Review this proposed changelog entry")) {
        const n = opts.reviewScore ?? 95;
        return JSON.stringify({ reader_score: n, skeptic_score: n, verdict: n >= 80 ? "publish" : "silence", unsupported_claims: [], inflated_claims: [], caveats: [], epistemic_status: "established", excerpt: "Exports now show clearer progress and a corrected completion state.", title: "Exports are clearer and more reliable", revision_note: "" });
      }
      if (p.includes("Revise this changelog entry once")) return opts.draft ?? "## Improved\n\nExports now show clearer progress while a file is prepared.\n\n## Fixed\n\nThe release fixes the export completion state described in the release evidence.";
      if (p.includes("Audit one OLD changelog entry")) return JSON.stringify({ verdict: "fresh" });
      if (call.json) return "{}";
      return "ok";
    },
  };
}

// Config / deterministic gates
ok(validateConfig(cfg).length === 0, "test config valid");
ok(validateConfig({ ...cfg, site: { ...cfg.site, name: "[ENTER NAME HERE]" } }).some((x) => x.includes("placeholder")), "placeholder config rejected");
ok(deterministicIgnore(evidence("x", "commit", "chore: bump deps"), cfg)?.includes("pattern"), "deterministic title ignore");
ok(deterministicIgnore(evidence("x", "commit", "Useful", { labels: ["no-changelog"] }), cfg)?.includes("label"), "deterministic label ignore");
ok(!shippingProof([evidence("pr", "pull_request", "Merge", { metadata: { merged: true, base_branch: "main" } })], cfg).ok, "explicit-only policy does not equate merge with shipping");
ok(!shippingProof([evidence("pre", "release", "v2 beta", { metadata: { prerelease: true, shipped: false } })], cfg).ok, "prerelease does not prove production shipping");
ok(shippingProof([evidence("rel", "release", "v2")], cfg).ok, "release proves shipping under explicit-only");
ok(!shippingProof([evidence("dep", "deployment", "staging deployed", { metadata: { shipped: false, environment: "staging" } })], cfg).ok, "staging deployment does not prove production shipping");
ok(!shippingProof([evidence("dep2", "deployment", "prod deployed", { metadata: { shipped: true, environment: "production", ref: "other" } }), evidence("pr2", "pull_request", "Dark mode", { metadata: { merged: true, base_branch: "main", number: 22 } })], cfg).ok, "unrelated deployment cannot prove a different selected change");
ok(shippingProof([evidence("pr", "pull_request", "Merge", { metadata: { merged: true, base_branch: "main" } })], { ...cfg, sourcePolicy: { ...cfg.sourcePolicy, shippingPolicy: "merge-to-production-is-live" } }).ok, "configured production merge can prove shipping");

// Source sync + dedupe
{
  const s = memoryStorage();
  const source = staticSource("fixture", [{ source: "fixture", external_id: "1", kind: "release", title: "v1", summary: "ship", url: null, author: null, labels: [], occurred_at: new Date(T0).toISOString(), metadata: {} }]);
  const a = await syncSources(s, [source], cfg, T0); const b = await syncSources(s, [source], cfg, T0 + 60_000);
  ok(a.inserted === 1 && b.duplicates >= 1, "source sync is idempotent through evidence dedupe");
  ok((await s.listEvidence("pending", 10)).length === 1, "one evidence row survives duplicate pulls");
}

// Publish from release + PR evidence.
{
  const s = memoryStorage({ evidence: [evidence("rel1", "release", "v2.0.0 released", { metadata: { target: "main", shipped: true } }), evidence("pr1", "pull_request", "Improve export progress", { metadata: { merged: true, base_branch: "main", number: 7 } })] });
  const r = await runTick({ storage: s, models: [autoModel()], config: cfg, now: () => T0 });
  ok(r.outcome === "published", `verified release publishes (${r.outcome}: ${r.reason})`);
  const entries = await s.listEntries(5); ok(entries.length === 1 && entries[0]!.evidence_ids.length === 2, "published entry keeps source evidence ids");
  ok((await s.listEvidence("used", 10)).length === 2, "selected evidence marked used only after publish");
  ok((await verifyChain(await s.listRuns(20))).valid, "published tick receipt verifies");
}

// Merge alone must not publish under default truth policy.
{
  const s = memoryStorage({ evidence: [evidence("pr1", "pull_request", "Add dark mode", { metadata: { merged: true, base_branch: "main" } })] });
  const r = await runTick({ storage: s, models: [autoModel()], config: cfg, now: () => T0 });
  ok(r.outcome === "silent" && /shipping is proven/i.test(r.reason), "code-only evidence held until deployment proof");
  ok((await s.listEntries(5)).length === 0, "shipping gate prevents premature changelog entry");
}

// Low reviewer score -> silence.
{
  const s = memoryStorage({ evidence: [evidence("rel1", "release", "v2") ] });
  const r = await runTick({ storage: s, models: [autoModel({ reviewScore: 20 })], config: cfg, now: () => T0 });
  ok(r.outcome === "silent", "weak entry is silent, not forced out");
  ok((await s.listEntries(5)).length === 0, "weak entry not persisted");
}

// Dry run preview.
{
  const s = memoryStorage({ evidence: [evidence("rel1", "release", "v2") ] });
  const r = await runTick({ storage: s, models: [autoModel()], config: cfg, now: () => T0, dryRun: true });
  ok(r.outcome === "drafted" && !!r.draft?.body, "dry run returns complete changelog draft");
  ok((await s.listEntries(5)).length === 0 && (await s.listEvidence("used", 5)).length === 0, "dry run publishes and consumes nothing");
}

// Immune screen.
ok(screen("Certainly! This revolutionary release is 99% faster.", cfg, "").some((a) => a.kind === "assistant leakage" && a.severity === "block"), "immune gate blocks assistant leakage");
ok(screen("This revolutionary release is live.", cfg, "").some((a) => a.kind === "marketing hype"), "immune gate flags hype");
ok(screen("Exports are 99% faster.", cfg, "Evidence says 99% faster.").every((a) => a.kind !== "number not in evidence"), "evidenced number passes deterministic number check");

// Correction skeptic rejects unsupported rewrite, accepts grounded one.
{
  const s = memoryStorage({ entries: [entry()], evidence: [evidence("rel1", "release", "v2 released", { status: "used" }), evidence("pr1", "pull_request", "Improve export progress", { status: "used" })] });
  let n = 0;
  const model: ModelProvider = { id: "corr", async chat() { n++; return n === 1 ? JSON.stringify({ verdict: "amend", note: "Clarified sourcing", corrections: ["Added sourcing claim"], body: `${entry().body}\n\nAll exports are processed locally on device.` }) : JSON.stringify({ verdict: "reject", unsupported_claims: ["processed locally on device"], evidence: [], note: "not proven" }); } };
  const r = await auditOne(s, new Nexus([model], s, () => T0), cfg, T0);
  ok(!!r && !r.amended && /correction skeptic/.test(r.note), "correction skeptic refuses invented historical claim");
  ok((await s.listEntries(1))[0]!.corrections.length === 0, "rejected correction leaves public history untouched");
}
{
  const s = memoryStorage({ entries: [entry()], evidence: [evidence("rel1", "release", "v2 released", { status: "used" }), evidence("pr1", "pull_request", "Improve export progress", { status: "used" })] });
  let n = 0;
  const model: ModelProvider = { id: "corr", async chat() { n++; return n === 1 ? JSON.stringify({ verdict: "amend", note: "Clarified Pro scope", corrections: ["Clarified Pro scope"], body: `${entry().body}\n\nThis applies to Pro exports.` }) : JSON.stringify({ verdict: "accept", unsupported_claims: [], evidence: [{ claim: "Pro scope", support: "Pro includes exports" }], note: "grounded" }); } };
  const r = await auditOne(s, new Nexus([model], s, () => T0), cfg, T0);
  ok(!!r?.amended, "grounded changelog amendment accepted");
  ok((await s.listEntries(1))[0]!.corrections.length === 1, "accepted amendment appends correction diary");
}

// Receipt chain: tamper + full-history + genesis anchor.
{
  const s = memoryStorage();
  for (let i = 0; i < 7; i++) await sealRun(s, { at: new Date(T0 + i).toISOString(), outcome: "silent", reason: `r${i}`, entry_title: null, entry_slug: null, model: null, reader_score: null, skeptic_score: null, fitness: null, strategy: null, detail: {} });
  const v = await verifyStoredChain(s, 3); ok(v.valid && v.complete === true && v.checked === 7, "paged receipt verifier reaches genesis");
  const runs = await s.listRuns(20); runs[2]!.reason = "tampered"; ok(!(await verifyChain(runs)).valid, "tampered receipt detected");
  const cut = memoryStorage({ runs: (await s.listRuns(20)).slice(0, 5).reverse() as Run[] });
  const cv = await verifyStoredChain(cut, 3); ok(!cv.valid && cv.complete === true, "deleting ledger genesis is detected");
}

// NEXUS failover.
{
  const s = memoryStorage(); let calls = 0;
  const bad: ModelProvider = { id: "bad", async chat() { calls++; throw new Error("429 quota exhausted"); } };
  const good: ModelProvider = { id: "good", async chat() { calls++; return "works"; } };
  const n = new Nexus([bad, good], s, () => T0); const r = await n.chat([{ role: "user", content: "x" }]);
  ok(r.model === "good" && calls === 2, "NEXUS falls through failed provider");
  ok(((await s.getState<Record<string, { until: number }>>("nexus.bench"))?.bad?.until ?? 0) > T0, "failed provider is benched");
}

// DEFENSE.
ok(classifyAgent("GPTBot/1.0") === "ai-crawler" && classifyAgent("Mozilla/5.0") === "human", "agent classification works");
ok(safeEqual("abc", "abc") && !safeEqual("abc", "abd"), "constant-time secret comparison");
{
  const s = memoryStorage();
  const verdicts = await Promise.all(Array.from({ length: 20 }, () => gate(s, { surface: "admin", ip: "1.2.3.4", userAgent: "Mozilla/5.0", now: T0, limitPerMinute: 10 })));
  ok(verdicts.filter((v) => v.decision === "allow").length === 10 && verdicts.filter((v) => v.decision === "throttle").length === 10, "atomic shared limiter counts concurrent calls");
}

// HTTP: auth and generic evidence ingest.
{
  const s = memoryStorage(); const deps = { storage: s, models: [autoModel()], config: cfg, now: () => T0 };
  const secrets = { cronSecret: "c".repeat(40), ownerSecret: "o".repeat(40), ingestSecret: "i".repeat(40) };
  const h = createHandler(deps, secrets);
  ok((await h(new Request("https://x/api/livingchangelog/health", { headers: { "user-agent": "Mozilla/5.0" } }))).status === 401, "owner endpoints require owner secret");
  const ingest = await h(new Request("https://x/api/livingchangelog/evidence", { method: "POST", headers: { authorization: `Bearer ${secrets.ingestSecret}`, "content-type": "application/json", "user-agent": "curl" }, body: JSON.stringify({ source: "deploy", external_id: "d1", kind: "deployment", title: "Production deploy", summary: "Exports update deployed", labels: [], metadata: { shipped: true } }) }));
  ok(ingest.status === 200 && (await s.listEvidence("pending", 10)).length === 1, "ingest secret can submit generic deployment evidence");
  const health = await h(new Request("https://x/api/livingchangelog/health", { headers: { authorization: `Bearer ${secrets.ownerSecret}`, "user-agent": "Mozilla/5.0" } }));
  ok(health.status === 200 && (await health.json() as { receipts: { valid: boolean } }).receipts.valid, "health reports receipt integrity");
}

// Markdown safety.
{
  const html = renderMarkdown("## Fixed\n\nText with `*literal*`.\n\n<script>x</script>\n\n[bad](//evil.com)");
  ok(html.includes("<h2>Fixed</h2>") && html.includes("<code>*literal*</code>"), "markdown renders changelog structure and inline code");
  ok(!html.includes("<script>") && !html.includes('href="//evil.com"'), "markdown strips raw HTML and protocol-relative links");
}

// GitHub adapter maps release/deployment/PR/commit evidence without an SDK.
{
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const u = String(input);
    const body = u.endsWith("/repos/acme/app") ? { default_branch: "main" }
      : u.includes("/releases?") ? [{ id: 1, tag_name: "v3", name: "v3", body: "Ship exports", html_url: "https://gh/r", published_at: new Date(T0).toISOString(), draft: false }]
      : u.includes("/deployments/9/statuses?") ? [{ id: 91, state: "success", description: "Production is live", environment: "production", environment_url: "https://acme.test", updated_at: new Date(T0).toISOString() }]
      : u.includes("/deployments?") ? [{ id: 9, ref: "main", sha: "abc", environment: "production", updated_at: new Date(T0).toISOString(), creator: { login: "dev" }, production_environment: true }]
      : u.includes("/pulls?") ? [{ id: 2, number: 2, title: "Fix export state", body: "Fix", html_url: "https://gh/p", merged_at: new Date(T0).toISOString(), base: { ref: "main" }, head: { ref: "fix", sha: "abc" }, merge_commit_sha: "abc", labels: [{ name: "bug" }] }]
      : [{ sha: "def", html_url: "https://gh/c", commit: { message: "Improve copy\nDetails", committer: { date: new Date(T0).toISOString() } }, author: { login: "dev" } }];
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const rows = await githubSource({ owner: "acme", repo: "app" }).pull(T0 - 1000, T0);
    ok(rows.some((x) => x.kind === "release") && rows.some((x) => x.kind === "deployment") && rows.some((x) => x.kind === "pull_request") && rows.some((x) => x.kind === "commit"), "GitHub adapter ingests releases, successful deployments, merged PRs and commits");
    ok(rows.find((x) => x.kind === "deployment")?.metadata.shipped === true, "GitHub successful deployment is explicit shipping evidence");
    ok(rows.find((x) => x.kind === "pull_request")?.metadata.base_branch === "main", "GitHub evidence preserves production-branch metadata");
  } finally { globalThis.fetch = oldFetch; }
}

// Public feed renderers are deterministic and escape entry metadata.
{
  const e = entry("feed-entry", { title: "<Fix> & release" });
  e.categories = ["fixed"];
  e.excerpt = "Safer <exports> & imports.";
  const atom = renderAtom([e], cfg);
  const feed = JSON.parse(renderJsonFeed([e], cfg));
  ok(atom.includes("&lt;Fix&gt; &amp; release") && atom.includes('category term="fixed"'), "Atom feed renders escaped changelog entries");
  ok(feed.items?.[0]?.title === "<Fix> & release" && feed.items?.[0]?.tags?.[0] === "fixed", "JSON Feed renders changelog entries");
}

// ---- 1.0.1 regressions ----
{
  // Triage keeps the meaningful PR and discards the "boring" deploy that proves it shipped.
  const s = memoryStorage();
  await s.insertEvidence({ source: "gh", external_id: "pr:12", kind: "pull_request", title: "Show export progress bar", summary: "Users see progress while exports build.", url: "https://example.test/pr/12", author: null, labels: [], occurred_at: new Date(T0 - 3600e3).toISOString(), metadata: { merged: true, base_branch: "main", number: 12 } });
  await s.insertEvidence({ source: "gh", external_id: "deploy:9", kind: "deployment", title: "Successful deployment to production", summary: "Deployment main completed successfully.", url: "https://example.test/deploy/9", author: null, labels: [], occurred_at: new Date(T0 - 1800e3).toISOString(), metadata: { environment: "production", ref: "main", shipped: true } });
  const picky: ModelProvider = { id: "picky", async chat(messages) {
    const p = messages.map((m) => m.content).join("\n");
    const idOf = (k: string) => [...p.matchAll(/^\[([^\]]+)\] (\w+)/gm)].find((m) => m[2] === k)?.[1];
    if (p.includes("Decide whether the pending evidence")) return JSON.stringify({ decision: "publish", reason: "progress bar", selected_ids: [idOf("pull_request")], ignored_ids: [idOf("deployment")], title: "Exports show progress", version: "v9.9.9", categories: ["improved"], role: "update" });
    if (p.includes("Write the changelog entry") || p.includes("Revise this changelog")) return "## Improved\n\nExports now show a progress bar while the file is prepared, so you can see the job is still moving before the download starts.";
    if (p.includes("Review this proposed")) return JSON.stringify({ reader_score: 92, skeptic_score: 92, verdict: "publish", unsupported_claims: [], inflated_claims: [], caveats: [], epistemic_status: "established", excerpt: "Exports show progress.", title: "Exports show progress" });
    return "{}";
  } };
  const r = await runTick({ storage: s, models: [picky], config: cfg, now: () => T0 });
  const e = (await s.listEntries(5))[0];
  ok(r.outcome === "published", `PR publishes even when triage discards its deploy (${r.outcome}: ${r.reason})`);
  ok(e && e.evidence_urls.includes("https://example.test/deploy/9"), "the discarded deploy is attached as shipping provenance");
  ok(e && e.version === null, "a version the evidence never mentions is dropped");
}
{
  // A webhook that says shipped:true for staging is not production proof.
  const pr = evidence("pr7", "pull_request", "Faster search", { metadata: { merged: true, base_branch: "main", number: 7 }, occurred_at: new Date(T0 - 7200e3).toISOString() });
  const staging = evidence("dep-stg", "deployment", "Deploy", { metadata: { environment: "staging", ref: "main", shipped: true } });
  const prod = evidence("dep-prd", "deployment", "Deploy", { metadata: { environment: "production", ref: "main", shipped: true } });
  ok(!shippingProof([pr, staging], cfg).ok, "staging deployment never proves a change is live");
  ok(shippingProof([pr, prod], cfg).ok, "production deployment of the merged branch does");
}
{
  // Ingest validation: bad kinds are refused before the database, and DB errors are not echoed.
  const s = memoryStorage();
  const secrets = { cronSecret: "c".repeat(40), ownerSecret: "o".repeat(40), ingestSecret: "i".repeat(40) };
  const h = createHandler({ storage: s, models: [autoModel()], config: cfg, now: () => T0 }, secrets);
  const post = (body: unknown) => h(new Request("https://acme.test/api/livingchangelog/evidence", { method: "POST", headers: { authorization: `Bearer ${secrets.ingestSecret}`, "user-agent": "deploy-bot", "content-type": "application/json" }, body: JSON.stringify(body) }));
  const bad = await (await post({ kind: "tweet", title: "x" })).json() as { inserted: number; errors: string[] };
  ok(bad.inserted === 0 && /kind must be one of/.test(bad.errors[0] ?? ""), "unknown evidence kind is refused with a clear message");
  const broken = { ...s, insertEvidence: async () => { throw new Error("storage 400: violates check constraint secret_internal_name"); } };
  const h2 = createHandler({ storage: broken, models: [autoModel()], config: cfg, now: () => T0 }, secrets);
  const res = await (await h2(new Request("https://acme.test/api/livingchangelog/evidence", { method: "POST", headers: { authorization: `Bearer ${secrets.ingestSecret}`, "user-agent": "deploy-bot" }, body: JSON.stringify({ kind: "manual", title: "x" }) }))).json() as { errors: string[] };
  ok(!JSON.stringify(res).includes("secret_internal_name"), "database errors are not echoed to webhook callers");
}
{
  // Audits must see the NEWEST evidence and must not re-read an entry the minute it ships.
  const s = memoryStorage();
  for (let i = 0; i < 70; i++) {
    await s.insertEvidence({ source: "gh", external_id: `old${i}`, kind: "commit", title: `Old change ${i}`, summary: "", url: null, author: null, labels: [], occurred_at: new Date(T0 - (100 - i) * 86400e3).toISOString(), metadata: {} });
  }
  const olds = await s.listEvidence("pending", 100);
  for (const e of olds) await s.updateEvidence(e.id, { status: "used" });
  await s.insertEvidence({ source: "gh", external_id: "rollback", kind: "manual", title: "Export progress bar rolled back", summary: "Removed after a bug.", url: null, author: null, labels: [], occurred_at: new Date(T0 - 3600e3).toISOString(), metadata: {} });
  const newest = await s.listEvidence("pending", 1);
  await s.updateEvidence(newest[0]!.id, { status: "used" });
  await s.insertEntry({ ...entry(), published_at: new Date(T0 - 5 * 86400e3).toISOString() });
  let seen = "";
  const spy: ModelProvider = { id: "spy", async chat(m) { seen = m.map((x) => x.content).join("\n"); return JSON.stringify({ verdict: "fresh" }); } };
  await auditOne(s, new Nexus([spy], s, () => T0), cfg, T0);
  ok(seen.includes("Export progress bar rolled back"), "audit sees the latest evidence, not the oldest 60 rows");
  const fresh = memoryStorage();
  await fresh.insertEntry({ ...entry(), published_at: new Date(T0 - 60_000).toISOString() });
  ok((await auditOne(fresh, new Nexus([spy], fresh, () => T0), { ...cfg, cadence: { ...cfg.cadence, auditCooldownHours: 24 } }, T0)) === null, "a just-published entry is not audited immediately");
}
{
  // GitHub: a commit dated before the cursor but newly on main is still picked up.
  const calls: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL) => {
    const u = String(url); calls.push(u);
    const body = u.includes("/commits") ? [{ sha: "abc123", commit: { message: "Add CSV export", committer: { date: new Date(T0 - 40 * 3600e3).toISOString() } } }] : u.endsWith("/repos/acme/app") ? { default_branch: "main" } : [];
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  try {
    const src = githubSource({ owner: "acme", repo: "app", kinds: ["commits"] });
    const got = await src.pull(T0 - 3600e3, T0);
    ok(got.some((e) => e.external_id === "commit:abc123"), "commits dated before the cursor are re-read within the lookback window");
  } finally { globalThis.fetch = realFetch; }
  globalThis.fetch = (async () => new Response("API rate limit exceeded", { status: 403, headers: { "x-ratelimit-remaining": "0" } })) as typeof fetch;
  try {
    let msg = "";
    try { await githubSource({ owner: "acme", repo: "app", kinds: ["releases"] }).pull(T0 - 3600e3, T0); } catch (e) { msg = (e as Error).message; }
    ok(/rate limit.*token/i.test(msg), "GitHub rate limiting says to set a token");
  } finally { globalThis.fetch = realFetch; }
}
{
  // Feeds: Atom needs an author; readers should get full content including corrections.
  const e = { ...entry(), corrections: [{ at: new Date(T0).toISOString(), note: "Pro only, not all plans.", changes: [] }] };
  const atom = renderAtom([e], cfg);
  const feed = JSON.parse(renderJsonFeed([e], cfg));
  ok(atom.includes("<author><name>Acme</name></author>") && atom.includes('<content type="html">'), "Atom feed has the required author and full HTML content");
  ok(String(feed.items?.[0]?.content_html ?? "").includes("Pro only, not all plans."), "feed content includes public corrections");
}

// ---- 1.1.0: voices + preview CLI ----
{
  const meta = { fullName: "acme/shop", name: "shop", description: "Storefront for small makers", defaultBranch: "main", htmlUrl: "https://github.com/acme/shop" };
  for (const v of VOICE_NAMES) {
    ok(validateConfig(previewConfig(meta, { sinceDays: 14, voice: v, policy: "explicit-only" })).length === 0, `preview config is valid in the ${v} voice`);
  }
  ok(VOICE_NAMES.every((v) => screen(VOICES[v].writing, cfg).length === 0), "voice instructions themselves trip no safety gate");
  ok(normalizeRepo("https://github.com/vercel/next.js") === "vercel/next.js" && normalizeRepo("a/b.git") === "a/b" && normalizeRepo("nope") === null, "repo argument accepts owner/name and GitHub URLs");
  ok(parseSince("2w") === 14 && parseSince(undefined) === 14 && parseSince("365d") === null && parseSince("x") === null, "--since parses days and weeks within 1..90");
  const a = parseArgs(["preview", "--repo", "a/b", "--voice=dry", "--no-color", "--json"]);
  ok(a.command === "preview" && a.args.repo === "a/b" && a.args.voice === "dry" && a.args.color === false && a.args.json === true, "argument parser handles flags, = values and --no-");
  ok(detectModels({}).models.length === 0 && detectModels({ ANTHROPIC_API_KEY: "k" }).label === "claude-haiku-4-5" && detectModels({ OPENAI_API_KEY: "k" }, "gpt-x").label === "gpt-x", "AI key detection picks the right provider and honors --model");
  ok(detectModels({ LIVINGCHANGELOG_AI_KEY: "k" }).models.length === 2, "LIVINGCHANGELOG_AI_KEY without a URL uses the Lovable gateway ladder (as the server always did)");
  let threw = false; try { detectModels({ LIVINGCHANGELOG_AI_KEY: "k", LIVINGCHANGELOG_AI_URL: "https://x/v1" }); } catch { threw = true; }
  ok(threw, "a custom endpoint without a model name is a clear error");
  ok(detectModels({ ANTHROPIC_API_KEY: "k", LIVINGCHANGELOG_BACKUP_AI_KEY: "b" }).models.length === 2, "a backup key adds a second rung for any primary provider");

  // Preview against an injected source: release proves two PRs; a later PR is held; deps and chores skipped.
  const d = (days: number) => new Date(T0 - days * 86400e3).toISOString();
  const items = [
    { source: "gh", external_id: "release:1", kind: "release" as const, title: "v2.4.0", summary: "* Add CSV export for orders in #101\n* Fix rounding in checkout in #102", url: "https://x/rel", author: null, labels: [], occurred_at: d(3), metadata: { tag: "v2.4.0", target: "main", prerelease: false, shipped: true } },
    { source: "gh", external_id: "pr:101", kind: "pull_request" as const, title: "Add CSV export for orders", summary: "", url: "https://x/101", author: null, labels: [], occurred_at: d(4), metadata: { number: 101, merged: true, base_branch: "main" } },
    { source: "gh", external_id: "pr:102", kind: "pull_request" as const, title: "Fix rounding in checkout", summary: "", url: "https://x/102", author: null, labels: [], occurred_at: d(4), metadata: { number: 102, merged: true, base_branch: "main" } },
    { source: "gh", external_id: "pr:103", kind: "pull_request" as const, title: "chore(deps): bump eslint from 8 to 9", summary: "", url: null, author: null, labels: ["dependencies"], occurred_at: d(5), metadata: { number: 103, merged: true, base_branch: "main" } },
    { source: "gh", external_id: "pr:105", kind: "pull_request" as const, title: "Add dark mode", summary: "", url: "https://x/105", author: null, labels: [], occurred_at: d(1), metadata: { number: 105, merged: true, base_branch: "main" } },
  ];
  const source = staticSource("gh", items);
  const evidenceOnly = await preview({ repo: "acme/shop", sinceDays: 14, voice: "dry", policy: "explicit-only", maxEntries: 5, includeCommits: false, models: [], meta, source, now: T0 });
  ok(evidenceOnly.mode === "evidence-only" && evidenceOnly.provable.some((p) => p.title === "Add CSV export for orders") && !evidenceOnly.provable.some((p) => p.title === "Add dark mode"), "evidence-only preview separates provable changes from merged-but-unshipped ones");
  ok(evidenceOnly.skipped.dependencies === 1 && evidenceOnly.held.unproven === 1, "evidence-only preview counts skipped deps and held changes");
  const scripted: ModelProvider = { id: "s", async chat(messages) {
    const p = messages.map((m) => m.content).join("\n");
    const ids = [...p.matchAll(/^\[([^\]]+)\] (\w+) · [^\n]*\nTITLE: ([^\n]*)/gm)].map((m) => ({ id: m[1]!, kind: m[2]!, title: m[3]! }));
    if (p.includes("Decide whether the pending evidence")) {
      const pick = ids.filter((e) => e.kind === "release" || /CSV|rounding/.test(e.title));
      return JSON.stringify(pick.length ? { decision: "publish", reason: "shipped", selected_ids: pick.map((e) => e.id), ignored_ids: [], title: "CSV export and a checkout fix", version: "v2.4.0", categories: ["added", "fixed"], role: "release" } : { decision: "hold", reason: "nothing proven", selected_ids: [], ignored_ids: [] });
    }
    if (p.includes("Write the changelog entry") || p.includes("Revise this changelog")) return "## Added\n\n- Orders export to CSV from the Orders page.\n\n## Fixed\n\n- Checkout totals with discounted items are no longer off by one cent.";
    if (p.includes("Review this proposed")) return JSON.stringify({ reader_score: 91, skeptic_score: 93, verdict: "publish", unsupported_claims: [], inflated_claims: [], caveats: [], epistemic_status: "established", excerpt: "CSV export and a checkout fix.", title: "v2.4.0: CSV export and a checkout fix" });
    return "{}";
  } };
  const full = await preview({ repo: "acme/shop", sinceDays: 14, voice: "dry", policy: "explicit-only", maxEntries: 5, includeCommits: false, models: [scripted], meta, source, now: T0 });
  ok(full.entries.length === 1 && full.entries[0]!.version === "v2.4.0", `full preview drafts one short release and keeps its evidenced version (${full.decisions.join(" | ")})`);
  ok(full.held.unproven === 1, "the dark mode PR merged after the release stays held");
  for (const v of VOICE_NAMES) {
    const text = formatReport({ ...full, voice: v } as PreviewResult);
    ok(text.includes("v2.4.0") && !/\b1 (?:changes|entries|chores)\b/.test(text) && !/\bthat only matter to\b/.test(text.replace(/matters/g, "")), `report reads correctly in the ${v} voice`);
  }
  let outText = ""; let errText = "";
  const code = await cliMain(["preview"], {}, (s) => { outText += s; return true; }, (s) => { errText += s; return true; });
  ok(code === 1 && /--repo/.test(errText), "CLI explains a missing --repo");
  outText = "";
  ok((await cliMain(["--help"], {}, (s) => { outText += s; return true; }, () => true)) === 0 && /npx livingchangelog preview/.test(outText) && VOICE_NAMES.every((v) => outText.includes(v)), "CLI help lists usage and every voice");
}

{
  // Typed locally so the type-check needs no @types/node.
  const { readFileSync } = await import("node:fs" as string) as { readFileSync(path: URL, enc: "utf8"): string };
  const wizard = readFileSync(new URL("../install/wizard.mjs", import.meta.url), "utf8");
  ok(VOICE_NAMES.every((v) => wizard.includes(JSON.stringify(VOICES[v].writing).slice(1, -1))), "install wizard voice presets match engine/voice.ts");
}

// ---- 1.2.0: announcements ----
{
  const e = { slug: "csv-export", title: "CSV export for orders", excerpt: "Orders can now be exported as a CSV file from the Orders page, including refunds, partial shipments and every custom field you have set up on your store.", version: null, categories: ["added" as const] };
  const xPost = composeAnnouncement(e, cfg, { maxChars: 280, urlCost: 23 });
  const urlAt = xPost.text.lastIndexOf(xPost.url);
  ok(xPost.text.endsWith("https://acme.test/changelog/csv-export") && urlAt > 0, "announcement ends with the entry link, never shortened");
  ok(graphemes(xPost.text) - graphemes(xPost.url) + 23 <= 280, "X post fits 280 with links counted as 23");
  const tight = composeAnnouncement(e, cfg, { maxChars: 120 });
  ok(graphemes(tight.text) <= 120 && tight.text.includes("…") && tight.text.startsWith("CSV export for orders"), `a tight channel trims the excerpt at a word, keeps the title (${tight.text})`);
  const tpl = composeAnnouncement({ ...e, excerpt: "Short." }, { ...cfg, announce: { template: "{product} ({version}) {title}: {excerpt}", hashtags: ["changelog"] } }, { maxChars: 300 });
  ok(tpl.text.startsWith("Acme CSV export for orders: Short. #changelog https://"), `template tokens fill in and an empty version leaves no stray brackets (${tpl.text})`);
  ok(graphemes("Fix ✨ für café 👩‍💻") === 16 && [..."Fix ✨ für café 👩‍💻"].length === 18, "length is counted in graphemes (16), not code points (18), as Bluesky does");
  const text = "Neu ✨ für Café-Besitzer https://acme.test/changelog/x";
  const f = bskyLinkFacet(text, "https://acme.test/changelog/x")!;
  ok(new TextDecoder().decode(new TextEncoder().encode(text).slice(f.index.byteStart, f.index.byteEnd)) === "https://acme.test/changelog/x", "Bluesky link facet uses UTF-8 byte offsets, correct after emoji and accents");
  ok(validateConfig({ ...cfg, announce: { template: "no tokens here" } }).some((p) => p.includes("announce.template")) && validateConfig({ ...cfg, announce: { hashtags: ["two words"] } }).length > 0, "announce config is validated");
  ok(await oauth1Signature("POST", "https://api.twitter.com/1.1/statuses/update.json", { include_entities: "true", oauth_consumer_key: "xvz1evFS4wEEPTGEFPHBog", oauth_nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg", oauth_signature_method: "HMAC-SHA1", oauth_timestamp: "1318622958", oauth_token: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb", oauth_version: "1.0", status: "Hello Ladies + Gentlemen, a signed OAuth request!" }, "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw", "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE") === "hCtSmYh+iHYCEqBWrE7C7hYmtUk=", "X OAuth 1.0a signature matches X's documented example");
  const env = announcersFromEnv({ LIVINGCHANGELOG_DISCORD_WEBHOOK_URL: "https://d", LIVINGCHANGELOG_BLUESKY_HANDLE: "me.bsky.social" });
  ok(env.announcers.map((a) => a.id).join() === "discord" && /Bluesky.*APP_PASSWORD/.test(env.problems.join()), "half-configured channels are reported, not silently skipped");
}
{
  // Wire formats, with fetch captured.
  const calls: { url: string; init: RequestInit }[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => { calls.push({ url: String(url), init: init ?? {} }); return new Response("{}", { status: 200 }); }) as typeof fetch;
  try {
    const a = { text: "Fix <script> & @everyone https://acme.test/changelog/x", url: "https://acme.test/changelog/x", title: "t", excerpt: "e", version: null, slug: "x" };
    await discord({ webhookUrl: "https://discord.test/hook" }).post(a);
    const d = JSON.parse(String(calls[0]!.init.body));
    ok(calls[0]!.url.endsWith("?wait=true") && Array.isArray(d.allowed_mentions?.parse) && d.allowed_mentions.parse.length === 0, "Discord posts can never ping @everyone");
    await slack({ webhookUrl: "https://slack.test/hook" }).post(a);
    ok(JSON.parse(String(calls[1]!.init.body)).text.includes("&lt;script&gt; &amp; @everyone"), "Slack text is escaped as Slack requires");
    await webhook({ url: "https://hook.test", secret: "s3cret" }).post(a);
    const body = String(calls[2]!.init.body);
    const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("s3cret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const expect = `sha256=${[...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body)))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
    ok((calls[2]!.init.headers as Record<string, string>)["x-livingchangelog-signature"] === expect, "generic webhook is HMAC-signed so receivers can verify it");
  } finally { globalThis.fetch = realFetch; }
}
{
  // The outbox: publish -> post once; retries with backoff; gives up after 5; never double-posts; dry runs post nothing.
  const release = { source: "gh", external_id: "release:77", kind: "release" as const, title: "v3.0.0", summary: "Adds CSV export for orders.", url: "https://example.test/rel/77", author: null, labels: [], occurred_at: new Date(T0 - 3600e3).toISOString(), metadata: { tag: "v3.0.0", target: "main", prerelease: false, shipped: true } };
  const posted: string[] = [];
  let failNext = 0;
  const fake: Announcer = { id: "fake", maxChars: 280, urlCost: 23, async post(a) { if (failNext > 0) { failNext--; throw new Error("503 try later"); } posted.push(a.text); return { url: "https://social.test/1" }; } };

  const dry = memoryStorage();
  const d = await runTick({ storage: dry, models: [autoModel()], sources: [staticSource("gh", [release])], announcers: [fake], config: cfg, now: () => T0, dryRun: true });
  ok(d.outcome === "drafted" && d.draft?.announcements[0]?.channel === "fake" && posted.length === 0, "dry run shows the post it would send and sends nothing");

  const s = memoryStorage();
  failNext = 1;
  const r1 = await runTick({ storage: s, models: [autoModel()], sources: [staticSource("gh", [release])], announcers: [fake], config: cfg, now: () => T0 });
  ok(r1.outcome === "published" && posted.length === 0, "a failing channel never fails the publish");
  await runTick({ storage: s, models: [autoModel()], announcers: [fake], config: cfg, now: () => T0 + 30_000 });
  ok(posted.length === 0, "retry waits for its backoff window");
  await runTick({ storage: s, models: [autoModel()], announcers: [fake], config: cfg, now: () => T0 + 3 * 60_000 });
  ok(posted.length === 1 && posted[0]!.includes("/changelog/"), "the post goes out on a later tick once due");
  for (let i = 4; i < 8; i++) await runTick({ storage: s, models: [autoModel()], announcers: [fake], config: cfg, now: () => T0 + i * 3600e3 });
  ok(posted.length === 1, "a sent post is never sent again");
  const runs = await s.listRuns(20);
  ok(runs.some((r) => JSON.stringify(r.detail).includes("announcementsQueued")) && runs.some((r) => JSON.stringify(r.detail).includes("social.test")), "queued text and the delivered post link are both in the receipts");

  const s2 = memoryStorage();
  failNext = 99;
  await runTick({ storage: s2, models: [autoModel()], sources: [staticSource("gh", [release])], announcers: [fake], config: cfg, now: () => T0 });
  for (let i = 1; i <= 6; i++) await flushAnnouncements(s2, [fake], cfg, T0 + i * 3600e3);
  const sum = await outboxSummary(s2);
  ok(sum.failed.length === 1 && sum.failed[0]!.attempts === 5 && sum.pending === 0, "a channel that keeps failing is given up on after 5 attempts");
  const h = createHandler({ storage: s2, models: [autoModel()], announcers: [fake], config: cfg, now: () => T0 }, { cronSecret: "c".repeat(40), ownerSecret: "o".repeat(40) });
  const health = await (await h(new Request("https://acme.test/api/livingchangelog/health", { headers: { authorization: `Bearer ${"o".repeat(40)}`, "user-agent": "curl/8" } }))).json() as { findings: string[]; announcements: { failed: number } };
  ok(health.announcements.failed === 1 && health.findings.some((f) => /Announcement to fake/.test(f)), "health reports the failed announcement in plain words");
  failNext = 0;

  const s3 = memoryStorage();
  await runTick({ storage: s3, models: [autoModel()], sources: [staticSource("gh", [release])], announcers: [fake], config: { ...cfg, announce: { delayMinutes: 30 } }, now: () => T0 });
  const before = posted.length;
  await flushAnnouncements(s3, [fake], cfg, T0 + 10 * 60_000);
  const mid = posted.length;
  await flushAnnouncements(s3, [fake], cfg, T0 + 31 * 60_000);
  ok(mid === before && posted.length === before + 1, "delayMinutes holds the post back as a window to pull an entry");
}

{
  // core/ is a vendored copy of livingcore: an in-place edit must fail the build.
  const fs = await import("node:fs" as string) as { readFileSync(p: URL, e: "utf8"): string; readdirSync(p: URL): string[] };
  const { checkVendoredCore } = await import("../core/vendor.ts");
  const dir = new URL("../core/", import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL("CORE-MANIFEST.json", dir), "utf8"));
  const files = Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => [f, fs.readFileSync(new URL(f, dir), "utf8")]));
  const problems = await checkVendoredCore(files, manifest);
  ok(problems.length === 0, `vendored livingcore ${manifest.version} is unmodified${problems.length ? ` (${problems.join("; ")})` : ""}`);
}

ok(stream("s", "p")() === stream("s", "p")(), "ORACLE remains deterministic");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) throw new Error(`${failed} self-test(s) failed`);
