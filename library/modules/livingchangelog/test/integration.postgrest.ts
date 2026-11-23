/**
 * Optional end-to-end test against a REAL database (no AI key needed: a scripted model is used).
 *   LIVINGCHANGELOG_DB_URL=... LIVINGCHANGELOG_DB_SERVICE_KEY=... npm run test:db
 * Use a scratch project: it writes entries, evidence and runs, and runs are append-only.
 */
import { postgrestStorage } from "../adapters/postgrest.ts";
import { runTick } from "../engine/engine.ts";
import { verifyStoredChain } from "../engine/receipts.ts";
import type { LivingChangelogConfig } from "../engine/config.ts";
import type { Announcer, ModelProvider } from "../engine/ports.ts";

const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const url = env.LIVINGCHANGELOG_DB_URL;
const serviceKey = env.LIVINGCHANGELOG_DB_SERVICE_KEY;
if (!url || !serviceKey) {
  console.log("SKIP: set LIVINGCHANGELOG_DB_URL and LIVINGCHANGELOG_DB_SERVICE_KEY after running schema.sql");
} else {
  let passed = 0; let failed = 0;
  const ok = (c: unknown, m: string) => { if (c) passed++; else { failed++; console.error("not ok -", m); } };
  const storage = postgrestStorage({ url, serviceKey });
  const tag = Date.now().toString(36);
  const cfg: LivingChangelogConfig = {
    site: { name: "Acme", url: "https://acme.test", changelogName: "Acme Changelog", changelogPath: "/changelog", tagline: "What changed" },
    audience: "Acme customers", voice: "Plain.", productFacts: "Acme has a dashboard with exports.",
    neverClaim: ["A merge is live without shipping evidence"], retiredWords: [], siteLinks: [{ path: "/", label: "Home", note: "home" }],
    categories: ["added", "improved", "fixed", "changed", "removed", "security", "developer"],
    sourcePolicy: { shippingPolicy: "explicit-only", productionBranch: "main", productionEnvironments: ["production"], bootstrapLookbackDays: 7, maxPendingEvidence: 100, maxEvidencePerEntry: 16, staleEvidenceDays: 30, ignoredLabels: [], ignoredTitlePatterns: [], publishDeveloperOnly: false, publishableKinds: ["release", "deployment", "pull_request", "commit", "manual"] },
    wordTargets: { update: { min: 20, max: 180 }, release: { min: 30, max: 260 } },
    qualityFloor: { reader: 70, skeptic: 80, fitness: 0.7 },
    cadence: { minHoursBetweenEntries: 0, auditCooldownHours: 72, auditEveryNthTick: 999 },
    breaker: { maxConsecutiveFailures: 3, cooldownMinutes: 60, heartbeatStaleHours: 48 },
    defense: { publicReadsPerMinute: 60, adminCallsPerMinute: 20 }, seed: "itest",
  };
  const now = Date.now();
  await storage.insertEvidence({ source: "itest", external_id: `pr-${tag}`, kind: "pull_request", title: `Export progress bar ${tag}`, summary: "Users see progress while exports build.", url: `https://example.test/pr/${tag}`, author: null, labels: [], occurred_at: new Date(now - 3600e3).toISOString(), metadata: { merged: true, base_branch: "main", number: 4242 } });
  await storage.insertEvidence({ source: "itest", external_id: `deploy-${tag}`, kind: "deployment", title: "Successful deployment to production", summary: "main deployed.", url: `https://example.test/deploy/${tag}`, author: null, labels: [], occurred_at: new Date(now - 1800e3).toISOString(), metadata: { environment: "production", ref: "main", shipped: true } });
  ok(!(await storage.insertEvidence({ source: "itest", external_id: `pr-${tag}`, kind: "pull_request", title: "dup", summary: "", url: null, author: null, labels: [], occurred_at: new Date(now).toISOString(), metadata: {} })), "duplicate evidence is a clean false");

  const model: ModelProvider = { id: "scripted", async chat(messages) {
    const p = messages.map((m) => m.content).join("\n");
    const ids = [...p.matchAll(/^\[([^\]]+)\] (\w+) · itest/gm)];
    const pr = ids.find((m) => m[2] === "pull_request")?.[1]; const dep = ids.find((m) => m[2] === "deployment")?.[1];
    if (p.includes("Decide whether the pending evidence")) return JSON.stringify({ decision: pr ? "publish" : "hold", reason: "shipped", selected_ids: pr ? [pr] : [], ignored_ids: dep ? [dep] : [], title: `Exports show progress ${tag}`, categories: ["improved"], role: "update" });
    if (p.includes("Write the changelog entry") || p.includes("Revise this changelog")) return "## Improved\n\nExports now show a progress bar while the file is prepared, so you can see the job is still moving before the download starts.";
    if (p.includes("Review this proposed")) return JSON.stringify({ reader_score: 92, skeptic_score: 92, verdict: "publish", unsupported_claims: [], inflated_claims: [], caveats: [], epistemic_status: "established", excerpt: "Exports show progress.", title: `Exports show progress ${tag}` });
    return "{}";
  } };
  let t = now;
  const posts: string[] = [];
  const announcer: Announcer = { id: `itest-${tag}`, maxChars: 280, urlCost: 23, async post(a) { posts.push(a.text); return { url: "https://social.test/p" }; } };
  const r = await runTick({ storage, models: [model], announcers: [announcer], config: cfg, now: () => (t += 1000) });
  ok(r.outcome === "published", `published on a real database (${r.outcome}: ${r.reason})`);
  const entry = (await storage.listEntries(20)).find((e) => e.title.includes(tag));
  // The earliest production deploy after the merge is attached. On a reused scratch database that can be
  // an earlier run's deploy, which is correct: that deploy really did ship this branch after the merge.
  ok(entry?.evidence_urls.some((u) => u.includes("/deploy/")) && entry?.evidence_urls.some((u) => u.includes(`pr/${tag}`)), "a production deploy discarded by triage is attached as proof in Postgres");
  ok(posts.length === 1 && posts[0]!.includes(`progress-${tag}`), `announcement posted once from the Postgres-backed outbox (${posts.length})`);
  const both = await Promise.all([1, 2].map(() => runTick({ storage, models: [model], announcers: [announcer], config: cfg, now: () => (t += 1000) })));
  ok(posts.length === 1, "later and overlapping ticks never re-post it");
  ok(both.some((x) => /Another tick/.test(x.reason)), `overlapping ticks: one skipped (${both.map((x) => x.outcome).join("/")})`);
  const chain = await verifyStoredChain(storage);
  ok(chain.valid && chain.complete, `full receipt chain valid back to GENESIS (${JSON.stringify(chain)})`);
  console.log(`LivingChangelog integration: ${passed} passed, ${failed} failed`);
  if (failed) throw new Error(`${failed} integration check(s) failed`);
}
