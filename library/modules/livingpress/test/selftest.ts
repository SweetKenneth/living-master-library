/**
 * Zero-dependency self-test. Run: node --experimental-strip-types test/selftest.ts
 * Uses a scripted fake model, so it needs no keys and no network.
 */
declare const process: { exit(code: number): never; env: Record<string, string | undefined> }; // no @types/node needed
import { DEMO_CONFIG, validateConfig, type LivingPressConfig } from "../engine/config.ts";
import { runTick } from "../engine/engine.ts";
import { sealRun, verifyChain } from "../engine/receipts.ts";
import { screen } from "../engine/immune.ts";
import { classifyAgent, gate, safeEqual } from "../engine/defense.ts";
import { stream } from "../engine/oracle.ts";
import { renderMarkdown } from "../engine/markdown.ts";
import { Nexus } from "../engine/nexus.ts";
import { auditOne } from "../engine/corrector.ts";
import { createHandler } from "../engine/http.ts";
import { nearDuplicate } from "../engine/similar.ts";
import { titleIndex } from "../engine/prompts.ts";
import { memoryStorage } from "../adapters/memory.ts";
import type { ModelProvider, Post, Run, Storage } from "../engine/ports.ts";

let pass = 0, fail = 0;
const ok = (c: unknown, m: string) => { if (c) pass += 1; else { fail += 1; console.error("FAIL:", m); } };
const section = async (name: string, fn: () => Promise<void>) => {
  try { await fn(); } catch (e) { fail += 1; console.error(`FAIL: ${name} threw:`, e); }
};

const cfg: LivingPressConfig = {
  ...DEMO_CONFIG,
  site: { name: "Acme Bakery", url: "https://acme.example", blogName: "Crumbs", blogPath: "/blog", tagline: "Bread, honestly" },
  audience: "home bakers who are short on time",
  houseFacts: "Acme Bakery sells sourdough. Open 7am-3pm.",
  clusters: [{ id: "bread", label: "Bread", thesis: "Slow bread is better", keywords: ["sourdough"] }],
  painPoints: ["store bread goes stale"],
  siteLinks: [{ path: "/", label: "Home", note: "home" }, { path: "/menu/", label: "Menu", note: "what we bake" }],
  wordTargets: { pillar: { min: 100, max: 400 }, support: { min: 100, max: 400 } },
  cadence: { ...DEMO_CONFIG.cadence, auditEveryNthTick: 1000 },
};
const prose = "## Why\n\n" + "Bread goes stale because starch retrogrades and nobody tells you. ".repeat(25) + "\n\nSee [home](/).";
const reviewJson = (reader: number) => JSON.stringify({ reader_score: reader, skeptic_score: 90, verdict: "publish", title: "Why your bread goes stale", excerpt: "Stale.", keywords: ["sourdough"] });
const topicsJson = JSON.stringify({ topics: [{ cluster: "bread", title: "Why your bread goes stale", angle: "a. b.", role: "pillar", keywords: ["sourdough"], gravity: 80 }] });
const fake = (reader = 90, calls = { n: 0 }): ModelProvider => ({
  id: "fake",
  async chat(m, o) {
    calls.n += 1;
    const u = m[m.length - 1]!.content;
    if (u.includes("Propose 6 topics")) return topicsJson;
    if (u.includes("Re-read this published post")) return JSON.stringify({ verdict: "fresh" });
    if (o.json) return reviewJson(reader);
    return prose;
  },
});
const broken: ModelProvider = { id: "broken", async chat() { throw new Error("429 quota exhausted"); } };
const images = { async imageFor() { return { url: "https://x/img.jpg", alt: "bread" }; } };
const T0 = Date.parse("2026-01-01T00:00:00Z");
const hours = (h: number) => h * 3600_000;
const samplePost = (over: Partial<Post> = {}): Omit<Post, "id"> => ({
  slug: "old-post", title: "Old post", excerpt: "x", body: prose, role: "pillar", cluster: "bread", pillar_slug: null,
  image_url: "https://x/a.jpg", image_alt: "a", advocacy: "implicit", keywords: [], caveats: [], epistemic_status: "inference",
  reader_score: 90, skeptic_score: 90, fitness: 0.9, published_at: new Date(T0 - hours(24 * 30)).toISOString(), last_audited_at: null, corrections: [], ...over,
});

await section("publish + cadence + receipts", async () => {
  const s = memoryStorage();
  const r = await runTick({ storage: s, models: [broken, fake()], images, config: cfg, now: () => T0 });
  ok(r.outcome === "published", `publish (got ${r.outcome}: ${r.reason})`);
  ok(r.model === "fake", "NEXUS fell through to working rung");
  const posts = await s.listPosts(10);
  ok(posts[0]?.image_url, "post has an image");
  const r2 = await runTick({ storage: s, models: [fake()], images, config: cfg, now: () => T0 + hours(2) });
  ok(r2.outcome === "silent", "silent when posted recently");
  ok((await verifyChain(await s.listRuns(100))).valid, "receipt chain valid");
  const runs = await s.listRuns(100);
  runs[1]!.reason = "edited";
  ok(!(await verifyChain(runs)).valid, "tampered receipt detected");
});

await section("low quality", async () => {
  const s = memoryStorage();
  const r = await runTick({ storage: s, models: [fake(30)], images, config: cfg, now: () => 1e12 });
  ok(r.outcome === "silent", "low reader score => silence");
  ok((await s.listPosts(5)).length === 0, "nothing published");
});

await section("no image + breaker", async () => {
  const s = memoryStorage();
  const noImg = { async imageFor() { return { url: "", alt: "" }; } };
  let last;
  for (let i = 0; i < 4; i += 1) last = await runTick({ storage: s, models: [fake()], images: noImg, config: cfg, now: () => 1e12 + i * 864e5 });
  ok((await s.listPosts(5)).length === 0, "never publishes without an image");
  ok(last!.outcome === "tripped", `breaker tripped (got ${last!.outcome})`);
});

// ---- 1.1 regressions ----

await section("config gate", async () => {
  const calls = { n: 0 };
  const r = await runTick({ storage: memoryStorage(), models: [fake(90, calls)], images, config: DEMO_CONFIG, now: () => T0 });
  ok(r.outcome === "blocked" && calls.n === 0, `placeholder config refuses to run and calls no model (got ${r.outcome}, ${calls.n} calls)`);
  ok(validateConfig(cfg).length === 0, `test config is valid (${validateConfig(cfg).join("; ")})`);
  ok(validateConfig({ ...cfg, retiredWords: [{ pattern: "(", replaceWith: "x" }] }).some((p) => p.includes("regular expression")), "bad retired-word regex caught");
});

await section("receipts survive Postgres round trip", async () => {
  const s = memoryStorage();
  await sealRun(s, { at: new Date(T0).toISOString(), outcome: "silent", reason: "x", fitness: 0.733, detail: { b: 1, a: [1, 2] } });
  const runs = await s.listRuns(5);
  const asPostgres: Run[] = runs.map((r) => ({ ...r, at: r.at.replace(".000Z", "+00:00"), fitness: String(r.fitness) as unknown as number, detail: { a: [1, 2], b: 1 } }));
  ok((await verifyChain(asPostgres)).valid, "chain verifies with +00:00 timestamps, string numerics and reordered jsonb");
});

await section("no forks under concurrency", async () => {
  const s = memoryStorage();
  // Every listRuns resolves before any insert: the worst case for a race.
  const slow: Storage = { ...s, listRuns: async (n) => { const r = await s.listRuns(n); await new Promise((res) => setTimeout(res, 5)); return r; } };
  await Promise.all([1, 2, 3, 4].map((i) => sealRun(slow, { at: new Date(T0 + i).toISOString(), outcome: "silent", reason: `r${i}`, detail: {} })));
  const runs = await s.listRuns(10);
  ok(runs.length === 4 && (await verifyChain(runs)).valid, `4 concurrent seals form one valid chain (got ${runs.length})`);
});

await section("overlapping ticks", async () => {
  const s = memoryStorage();
  const [a, b] = await Promise.all([
    runTick({ storage: s, models: [fake()], images, config: cfg, now: () => T0 }),
    runTick({ storage: s, models: [fake()], images, config: cfg, now: () => T0 + 1 }),
  ]);
  ok((await s.listPosts(10)).length === 1, `overlapping ticks publish once (outcomes ${a.outcome}/${b.outcome})`);
  ok((await verifyChain(await s.listRuns(10))).valid, "chain still valid after overlap");
});

await section("durable tick counter", async () => {
  const s = memoryStorage();
  await s.insertPost(samplePost());
  // 99 prior ticks: the old code read runs.length (max 50) and would never audit again.
  await s.setState("engine.counters", { ticks: 99, published: 1 });
  const r = await runTick({ storage: s, models: [fake()], images, config: { ...cfg, cadence: { ...cfg.cadence, auditEveryNthTick: 3 } }, now: () => T0 });
  ok(r.outcome === "audited", `audit fires on tick 99 (got ${r.outcome}: ${r.reason})`);
  ok(((await s.getState<{ ticks: number }>("engine.counters"))?.ticks ?? 0) === 100, "tick counter advanced");
});

await section("advocacy counter", async () => {
  const s = memoryStorage();
  await s.setState("engine.counters", { ticks: 5, published: 2 });
  await runTick({ storage: s, models: [fake()], images, config: cfg, now: () => T0 });
  ok((await s.listPosts(1))[0]?.advocacy === "explicit", "3rd post may advocate (counter, not capped list)");
});

await section("malformed model output", async () => {
  const s = memoryStorage();
  const messy: ModelProvider = {
    id: "messy",
    async chat(m, o) {
      const u = m[m.length - 1]!.content;
      if (u.includes("Propose 6 topics")) return JSON.stringify({ topics: [null, "x", { cluster: "bread", title: 42 }, { cluster: "bread", title: "Real one", angle: "ok", keywords: "a, b", gravity: "high" }] });
      if (o.json) return JSON.stringify({ reader_score: "lots", skeptic_score: null, verdict: 7, caveats: "one", keywords: 3, title: { x: 1 } });
      return prose;
    },
  };
  const r = await runTick({ storage: s, models: [messy], images, config: cfg, now: () => T0 });
  ok(r.outcome === "silent", `garbage JSON is a silent outcome, not a crash (got ${r.outcome}: ${r.reason})`);
  const topics = await s.listTopics("queued", 10);
  ok(topics.length === 1 && Array.isArray(topics[0]!.keywords) && topics[0]!.keywords.length === 2, "only the valid topic was queued, keywords normalized");
});

await section("JSON retry", async () => {
  const s = memoryStorage();
  let reviews = 0;
  const chatty: ModelProvider = {
    id: "chatty",
    async chat(m, o) {
      const u = m[m.length - 1]!.content;
      if (u.includes("Propose 6 topics")) return topicsJson;
      if (o.json) { reviews += 1; return reviews % 2 === 1 ? "Sure, here's my review: it's great." : reviewJson(90); }
      return prose;
    },
  };
  const r = await runTick({ storage: s, models: [chatty], images, config: cfg, now: () => T0 });
  ok(r.outcome === "published", `unparseable review is retried once (got ${r.outcome}: ${r.reason})`);
});

await section("immune gate", async () => {
  ok(screen("As an AI, trusted by 5000 customers", cfg, []).some((a) => a.severity === "block"), "immune blocks leakage/fake proof");
  ok(screen("Certainly! Bread is good.", cfg, []).some((a) => a.kind === "assistant leakage"), "'Certainly!' leakage caught");
  const links = screen("See [all posts](/blog), [menu](/menu) and [menu again](/menu/).", cfg, []);
  ok(!links.some((a) => a.kind === "dead internal link"), `blog index and trailing-slash site links are live (${JSON.stringify(links)})`);
  ok(screen("Use `50%` hydration in code only:\n\n```\n90% of users\n```", cfg, []).length === 0, "code is not scanned as claims");
  ok(screen("We bake 50 % more", { ...cfg, houseFacts: "We bake 50% more" }, []).length === 0, "number spacing matches house facts");
});

await section("markdown", async () => {
  const html = renderMarkdown("## Head\nText\n\n```\na\n\nb\n```\n\n[x](//evil.com) <script>x</script> `*no*`");
  ok(html.includes("<h2>Head</h2>\n<p>Text</p>"), "heading directly above a paragraph");
  ok((html.match(/<pre>/g) ?? []).length === 1 && html.includes("a\n\nb"), "fenced code keeps its blank line");
  ok(!html.includes('href="//evil.com"') && !html.includes("<script>"), "no protocol-relative links, no raw HTML");
  ok(html.includes("<code>*no*</code>"), "no emphasis inside inline code");
});

await section("corrector safety", async () => {
  const s = memoryStorage();
  await s.insertPost(samplePost());
  const evil: ModelProvider = { id: "e", async chat() { return JSON.stringify({ verdict: "amend", note: "fixed", body: `As an AI, I fixed this. ${prose}` }); } };
  const r = await auditOne(s, new Nexus([evil], s, () => T0), cfg, T0);
  const post = (await s.listPosts(1))[0]!;
  ok(r && !r.amended && post.body === prose && !post.corrections.length, "amendment that adds leakage is refused");
});

await section("defense", async () => {
  ok(classifyAgent("GPTBot/1.0") === "ai-crawler" && classifyAgent("") === "empty", "defense classifies agents");
  ok(classifyAgent("Mozilla/5.0 (compatible; UptimeRobot/2.0)") === "scripted", "monitors are not humans");
  ok(safeEqual("abc", "abc") && !safeEqual("abc", "abd"), "constant-time compare");
  const s = memoryStorage();
  for (let i = 0; i < 20; i += 1) await gate(s, { surface: "public", ip: `10.0.0.${i}`, userAgent: "Mozilla/5.0", now: T0, limitPerMinute: 100 });
  const keys = Object.keys((s.dump() as { state: Record<string, unknown> }).state);
  ok(keys.length === 1, `rate buckets use one row, not one per visitor (got ${keys.length})`);
});

await section("nexus", async () => {
  const s = memoryStorage();
  const slow: ModelProvider = { id: "slow", async chat() { throw new Error("The operation was aborted due to timeout"); } };
  const n = new Nexus([slow, fake()], s, () => T0);
  await n.chat([{ role: "user", content: "hi" }]);
  const bench = await s.getState<Record<string, { until: number }>>("nexus.bench");
  ok((bench?.slow?.until ?? 0) > T0, "timed-out provider is benched so the ladder moves on");
});

await section("http", async () => {
  const s = memoryStorage();
  const secrets = { cronSecret: "c".repeat(40), ownerSecret: "o".repeat(40) };
  const h = createHandler({ storage: s, models: [fake()], images, config: cfg, now: () => T0 }, secrets);
  const req = (path: string, init: RequestInit = {}, token?: string) =>
    h(new Request(`https://site/api/livingpress/${path}`, { ...init, headers: { "user-agent": "Mozilla/5.0", ...(token ? { authorization: `Bearer ${token}` } : {}) } }));
  ok((await req("tick", { method: "POST" })).status === 401, "tick without secret is 401");
  ok((await req("tick", {}, secrets.cronSecret)).status === 405, "GET tick is 405");
  ok((await req("health", {}, secrets.cronSecret)).status === 401, "cron secret cannot read health");
  ok((await req("tick", { method: "POST" }, secrets.cronSecret)).status === 200, "cron can tick");
  const health = await (await req("health", {}, secrets.ownerSecret)).json() as { receipts: { valid: boolean }; counters: unknown };
  ok(health.receipts.valid && health.counters, "health reports receipts + counters");
  const bad = createHandler({ storage: { ...s, listRuns: async () => { throw new Error("db down"); } }, models: [fake()], images, config: cfg }, secrets);
  const res = await bad(new Request("https://site/api/livingpress/health", { headers: { authorization: `Bearer ${secrets.ownerSecret}`, "user-agent": "x" } }));
  ok(res.status === 500 && (await res.json() as { error: string }).error === "internal error", "storage failure is a clean 500 JSON");
});

await section("dry run", async () => {
  const s = memoryStorage();
  let imageCalls = 0;
  const countingImages = { async imageFor() { imageCalls += 1; return { url: "https://x/i.jpg", alt: "i" }; } };
  const r = await runTick({ storage: s, models: [fake()], images: countingImages, config: cfg, now: () => T0, dryRun: true });
  ok(r.outcome === "drafted" && r.draft?.body.includes("starch"), `dry run returns the draft (got ${r.outcome})`);
  ok((await s.listPosts(5)).length === 0 && imageCalls === 0, "dry run publishes nothing and generates no image");
  ok((await s.listTopics("queued", 5)).length === 1, "planned topic is kept for the real run");
  const h = createHandler({ storage: s, models: [fake()], images, config: cfg, now: () => T0 }, { cronSecret: "c".repeat(40), ownerSecret: "o".repeat(40) });
  const res = await h(new Request("https://site/api/livingpress/tick?dry=1", { method: "POST", headers: { authorization: `Bearer ${"c".repeat(40)}`, "user-agent": "x" } }));
  ok(res.status === 401, "cron secret cannot trigger a dry run");
});

await section("near-duplicates", async () => {
  ok(nearDuplicate("Linking SBOM Entries to Exact Source Commits", ["Link SBOM entries to exact source commits"]), "reworded twin titles collide");
  ok(nearDuplicate("How to Price a Wedding Cake", ["Pricing Wedding Cakes"]), "stems fold price/pricing and cake/cakes");
  ok(!nearDuplicate("Vendoring Code Without a Paper Trail Is Unsecured Debt", ["Auditing Vendored Dependencies Beyond the LICENSE File"]), "related but distinct titles do not");
  const many = Array.from({ length: 80 }, (_, i) => ({ title: `Post number ${i}`, cluster: "bread" }));
  ok(titleIndex(cfg, many).includes("Post number 79") || titleIndex(cfg, many).includes("older"), "planner sees beyond the newest 60 titles (or is told how many it cannot see)");
  ok(titleIndex(cfg, Array.from({ length: 80 }, (_, i) => ({ title: `T${i}`, cluster: "bread" }))).includes("T79"), "80 short titles all fit the index");

  // Planner proposes a reworded twin of a published post: it never reaches the queue.
  const s = memoryStorage();
  await s.insertPost(samplePost({ title: "Link SBOM entries to exact source commits", slug: "link-sbom", published_at: new Date(T0 - hours(48)).toISOString() }));
  const twinPlanner: ModelProvider = {
    id: "twin",
    async chat(m, o) {
      const u = m[m.length - 1]!.content;
      if (u.includes("Propose 6 topics")) return JSON.stringify({ topics: [{ cluster: "bread", title: "Linking SBOM Entries to Exact Source Commits", angle: "same", role: "support", gravity: 99 }] });
      if (o.json) return reviewJson(90);
      return prose;
    },
  };
  const r = await runTick({ storage: s, models: [twinPlanner], images, config: cfg, now: () => T0 });
  ok((await s.listTopics("queued", 10)).length === 0 && (await s.listPosts(10)).length === 1, `reworded twin never queued or published (${r.outcome}: ${r.reason})`);

  // Reviewer "sharpens" a fresh topic's title into an existing one: the planned title is used instead.
  const s2 = memoryStorage();
  await s2.insertPost(samplePost({ title: "Why your bread goes stale", slug: "why-stale", published_at: new Date(T0 - hours(48)).toISOString() }));
  await s2.insertTopic({ cluster: "bread", title: "Freezing sourdough without ruining the crust", angle: "a", role: "support", pain_point: "", keywords: [], gravity: 90, status: "queued", attempts: 0 });
  await s2.insertTopic({ cluster: "bread", title: "Scoring patterns that actually open", angle: "a", role: "support", pain_point: "", keywords: [], gravity: 10, status: "queued", attempts: 0 });
  await s2.insertTopic({ cluster: "bread", title: "Hydration for beginners", angle: "a", role: "support", pain_point: "", keywords: [], gravity: 10, status: "queued", attempts: 0 });
  const sharpener: ModelProvider = { id: "sharp", async chat(m, o) { const u = m[m.length - 1]!.content; if (u.includes("Propose 6 topics")) return JSON.stringify({ topics: [] }); return o.json ? reviewJson(90) : prose; } };
  const r2 = await runTick({ storage: s2, models: [sharpener], images, config: cfg, now: () => T0 });
  const titles = (await s2.listPosts(10)).map((p) => p.title);
  ok(r2.outcome === "published" && titles.includes("Freezing sourdough without ruining the crust"), `twin title from reviewer replaced by planned title (${r2.outcome}: ${titles.join(" | ")})`);
});

await section("livingcore", async () => {
  const fs = await import("node:fs" as string) as { readFileSync(p: URL, e: "utf8"): string; readdirSync(p: URL): string[] };
  // Receipts sealed by LivingPress 1.1.1 (and returned the way Postgres returns them) still verify on the shared core.
  const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/receipts-v1.1.json", import.meta.url), "utf8"));
  ok((await verifyChain(fixture)).valid, "receipts sealed before the move to livingcore still verify");
  const { verifyStoredChain } = await import("../engine/receipts.ts");
  const s = memoryStorage();
  for (let i = 0; i < 3; i++) await runTick({ storage: s, models: [fake()], images, config: cfg, now: () => T0 + i * hours(30) });
  const full = await verifyStoredChain(s);
  ok(full.valid && full.complete, "health can now verify the whole chain back to GENESIS");
  const { modelsFromEnv } = await import("../adapters/models.ts");
  ok(modelsFromEnv({ ANTHROPIC_API_KEY: "k" }).label === "claude-haiku-4-5" && modelsFromEnv({ LIVINGPRESS_AI_KEY: "k" }).models.length === 2, "server accepts Anthropic/OpenAI keys, not only the Lovable gateway");
  const { checkVendoredCore } = await import("../core/vendor.ts");
  const dir = new URL("../core/", import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL("CORE-MANIFEST.json", dir), "utf8"));
  const files = Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => [f, fs.readFileSync(new URL(f, dir), "utf8")]));
  const problems = await checkVendoredCore(files, manifest);
  ok(problems.length === 0, `vendored livingcore ${manifest.version} is unmodified${problems.length ? ` (${problems.join("; ")})` : ""}`);
});

ok(stream("s", "p")() === stream("s", "p")(), "oracle deterministic");

console.log(`LivingPress self-test: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
