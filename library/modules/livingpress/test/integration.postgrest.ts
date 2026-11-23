/**
 * Optional integration test against a REAL database (no keys to an AI needed).
 *   LIVINGPRESS_DB_URL=... LIVINGPRESS_DB_SERVICE_KEY=... node --experimental-strip-types test/integration.postgrest.ts
 * Point it at a scratch project: it writes posts, topics and runs, and the runs table is append-only.
 */
declare const process: { exit(code: number): never; env: Record<string, string | undefined> }; // no @types/node needed
import { DEMO_CONFIG, type LivingPressConfig } from "../engine/config.ts";
import { runTick } from "../engine/engine.ts";
import { verifyChain } from "../engine/receipts.ts";
import { postgrestStorage } from "../adapters/postgrest.ts";
import type { ModelProvider } from "../engine/ports.ts";

const url = process.env.LIVINGPRESS_DB_URL, key = process.env.LIVINGPRESS_DB_SERVICE_KEY;
if (!url || !key) { console.log("skipped: set LIVINGPRESS_DB_URL and LIVINGPRESS_DB_SERVICE_KEY"); process.exit(0); }

let pass = 0, fail = 0;
const ok = (c: unknown, m: string) => { if (c) pass += 1; else { fail += 1; console.error("FAIL:", m); } };
const run = Date.now().toString(36);
const cfg: LivingPressConfig = {
  ...DEMO_CONFIG,
  site: { name: "Acme", url: "https://acme.example", blogName: "Crumbs", blogPath: "/blog", tagline: "t" },
  audience: "bakers", houseFacts: "Acme sells sourdough.", painPoints: ["stale bread"],
  clusters: [{ id: "bread", label: "Bread", thesis: "Slow bread wins", keywords: ["sourdough"] }],
  siteLinks: [{ path: "/", label: "Home", note: "home" }],
  wordTargets: { pillar: { min: 100, max: 400 }, support: { min: 100, max: 400 } },
  cadence: { ...DEMO_CONFIG.cadence, minHoursBetweenPosts: 0, auditEveryNthTick: 1000 },
};
const prose = "## Why\n\n" + "Bread goes stale because starch retrogrades. ".repeat(30) + "\n\nSee [home](/).";
let topicN = 0;
const subjects = ["Freezing loaves without freezer burn", "Scoring patterns that open cleanly", "Hydration math for beginners", "Choosing flour by protein content", "Reviving a neglected starter", "Proofing in a cold kitchen"];
const fake: ModelProvider = {
  id: "fake",
  async chat(m, o) {
    const u = m[m.length - 1]!.content;
    if (u.includes("Propose 6 topics")) { topicN += 1; return JSON.stringify({ topics: [{ cluster: "bread", title: `${subjects[(topicN - 1) % subjects.length]} (itest-${run}${topicN > subjects.length ? `-${topicN}` : ""})`, angle: "a", role: "pillar", keywords: ["sourdough"], gravity: 90 }] }); }
    if (o.json) return JSON.stringify({ reader_score: 92, skeptic_score: 91, verdict: "publish", excerpt: "e", keywords: ["sourdough"] });
    return prose;
  },
};
const storage = postgrestStorage({ url, serviceKey: key });
// Clean up earlier runs of THIS test (titles carry an "itest" tag), so the near-duplicate guard
// sees a fresh scratch database every time. Runs are append-only and are left alone.
{
  const base = `${url.replace(/\/+$/, "")}/rest/v1`;
  const headers: Record<string, string> = { apikey: key, prefer: "return=minimal" };
  if (key.split(".").length === 3) headers.authorization = `Bearer ${key}`;
  for (const table of ["livingpress_posts", "livingpress_topics"]) {
    const res = await fetch(`${base}/${table}?title=like.*itest-*`, { method: "DELETE", headers });
    if (!res.ok) console.log(`note: could not clean ${table} (${res.status}); re-runs may hit the near-duplicate guard`);
  }
}
const images = { async imageFor() { return { url: "https://x/img.jpg", alt: "bread" }; } };
// Start after the newest existing post, so re-running on the same scratch database is safe.
const newest = (await storage.listPosts(1))[0];
let t = Math.max(Date.now(), newest ? Date.parse(newest.published_at) + 1000 : 0);
const r1 = await runTick({ storage, models: [fake], images, config: cfg, now: () => (t += 1000) });
ok(r1.outcome === "published", `published on a real database (${r1.outcome}: ${r1.reason})`);
const both = await Promise.all([1, 2].map(() => runTick({ storage, models: [fake], images, config: cfg, now: () => (t += 1000) })));
ok(both.some((r) => r.outcome === "silent" && /Another tick/.test(r.reason)), `overlapping ticks: one skipped (${both.map((r) => r.outcome).join("/")})`);
const runs = await storage.listRuns(500);
const v = await verifyChain(runs);
ok(v.valid, `receipt chain valid after round trip through Postgres (${JSON.stringify(v)})`);
ok(await storage.insertTopic({ cluster: "bread", title: `${subjects[0]} (itest-${run})`, angle: "a", role: "pillar", pain_point: "", keywords: [], gravity: 1, status: "queued", attempts: 0 }) === false, "duplicate topic title is a clean false");
console.log(`LivingPress integration: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
