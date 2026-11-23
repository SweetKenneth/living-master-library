/** livingcore self-test. No keys, no network. Run: npm test */
declare const process: { exitCode?: number };
import { Breaker } from "../src/breaker.ts";
import { classifyAgent, gate, memoryBuckets, safeEqual } from "../src/defense.ts";
import { acquireLease, releaseLease } from "../src/lease.ts";
import { demoteH1, renderMarkdown } from "../src/markdown.ts";
import { modelsFromEnv } from "../src/models.ts";
import { LadderExhausted, Nexus } from "../src/nexus.ts";
import { canonical, sha256, stream } from "../src/oracle.ts";
import { createReceipts, GENESIS, iso, num, type SealedRow } from "../src/receipts.ts";
import type { AtomicStore, ModelProvider } from "../src/types.ts";
import { checkVendoredCore } from "../src/vendor.ts";

let passed = 0; let failed = 0;
const ok = (c: unknown, m: string) => { if (c) passed++; else { failed++; console.error("not ok -", m); } };
const T0 = Date.parse("2026-10-01T12:00:00Z");

function memState(): AtomicStore & { map: Map<string, unknown> } {
  const map = new Map<string, unknown>();
  return {
    map,
    async getState<T>(k: string) { return (map.has(k) ? JSON.parse(JSON.stringify(map.get(k))) : null) as T | null; },
    async setState(k: string, v: unknown) { map.set(k, JSON.parse(JSON.stringify(v))); },
  };
}

// ORACLE
ok(canonical({ b: 1, a: [2, { d: 1, c: undefined }] }) === '{"a":[2,{"d":1}],"b":1}', "canonical JSON sorts keys and drops undefined");
ok((await sha256("abc")) === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "sha256 matches the standard test vector");
ok(stream("s", "p")() === stream("s", "p")() && stream("s", "p")() !== stream("s", "q")(), "seeded streams are reproducible and purpose-separated");

// NEXUS
{
  const s = memState();
  const quota: ModelProvider = { id: "quota", async chat() { throw new Error("429 rate limit"); } };
  const good: ModelProvider = { id: "good", async chat() { return '{"ok":true}'; } };
  const n = new Nexus([quota, good], s, () => T0);
  const r = await n.json<{ ok?: boolean }>([{ role: "user", content: "x" }], {});
  ok(r.value.ok === true && r.model === "good", "NEXUS falls through a rate-limited rung");
  const bench = await s.getState<Record<string, { until: number }>>("nexus.bench");
  ok((bench?.quota?.until ?? 0) > T0, "the rate-limited rung is benched");
  let threw = false; try { await new Nexus([quota], s, () => T0).chat([{ role: "user", content: "x" }]); } catch (e) { threw = e instanceof LadderExhausted; }
  ok(threw, "an exhausted ladder throws LadderExhausted");
}

// Breaker
{
  const s = memState();
  const b = new Breaker(s, () => T0, { maxConsecutiveFailures: 2, cooldownMinutes: 10, heartbeatStaleHours: 48 });
  await b.failure("x"); const st = await b.failure("y");
  ok(st.status === "open", "breaker opens after N consecutive failures");
  ok(!(await b.admit()).ok, "an open breaker refuses ticks");
  const later = new Breaker(s, () => T0 + 11 * 60_000, { maxConsecutiveFailures: 2, cooldownMinutes: 10, heartbeatStaleHours: 48 });
  ok((await later.admit()).state.status === "half-open", "after the cooldown it lets one probe through");
}

// Markdown
{
  const html = renderMarkdown("## Head\nText\n\n```\na\n\nb\n```\n\n[x](//evil.com) <script>x</script> `*no*`");
  ok(html.includes("<h2>Head</h2>") && html.includes("a\n\nb") && !html.includes("<script>") && !html.includes('href="//evil.com"'), "Markdown is safe and keeps fenced blank lines");
  ok(demoteH1("# T\n```\n# not a heading\n```") === "## T\n```\n# not a heading\n```", "H1 demotion skips fenced code");
}

// DEFENSE
{
  ok(classifyAgent("GPTBot/1.0") === "ai-crawler" && classifyAgent("Mozilla/5.0 UptimeRobot/2.0") === "scripted" && classifyAgent("") === "empty", "agents are classified");
  ok(safeEqual("abc", "abc") && !safeEqual("abc", "abd"), "constant-time secret compare");
  const mem = memoryBuckets();
  let last = { decision: "allow" } as { decision: string };
  for (let i = 0; i < 4; i++) last = await gate(mem, { surface: "public", ip: "1.1.1.1", userAgent: "Mozilla/5.0", now: T0, limitPerMinute: 3 });
  ok(last.decision === "throttle", "the rate gate throttles past the limit");
  let atomicCalls = 0;
  const atomic = { ...memState(), async incrementRateBucket() { return ++atomicCalls; } };
  await gate(atomic, { surface: "admin", ip: "1.1.1.1", userAgent: "curl/8", now: T0, limitPerMinute: 10 });
  ok(atomicCalls === 1 && !atomic.map.size, "an atomic store is used instead of read-modify-write state");
}

// Receipts (generic): a product supplies its own payload; Postgres-shaped rows still verify; forks are refused.
{
  type Row = SealedRow & { outcome: string; reason: string; score?: number | null; detail: Record<string, unknown> };
  const payload = (r: Omit<Row, "receipt_hash" | "id">) => ({ at: iso(r.at), outcome: r.outcome, reason: r.reason, score: num(r.score), detail: r.detail ?? {}, prev_hash: r.prev_hash });
  const R = createReceipts<Row>(payload);
  const rows: Row[] = [];
  const store = {
    async listRuns(n: number) { return [...rows].reverse().slice(0, n); },
    async listRunsPage(n: number, off: number) { return [...rows].reverse().slice(off, off + n); },
    async insertRun(r: Row) { if (rows.some((x) => x.prev_hash === r.prev_hash)) throw new Error("409 duplicate prev_hash"); rows.push(r); },
  };
  for (let i = 0; i < 3; i++) await R.sealRun(store, { at: new Date(T0 + i).toISOString(), outcome: "silent", reason: `r${i}`, score: 0.5, detail: { i } });
  ok((await R.verifyStoredChain(store)).valid && rows[0]!.prev_hash === GENESIS, "chain seals and verifies back to GENESIS");
  const pg = rows.map((r) => ({ ...r, at: r.at.replace(".000Z", "+00:00"), score: String(r.score) as unknown as number }));
  ok((await R.verifyChain([...pg].reverse())).valid, "rows shaped the way Postgres returns them still verify");
  const tampered = [...rows].reverse().map((r, i) => (i === 1 ? { ...r, reason: "edited" } : r));
  ok(!(await R.verifyChain(tampered)).valid, "an edited row breaks the chain");
  const slow = { ...store, async listRuns(n: number) { const x = await store.listRuns(n); await new Promise((res) => setTimeout(res, 5)); return x; } };
  await Promise.all([1, 2, 3].map((i) => R.sealRun(slow, { at: new Date(T0 + 100 + i).toISOString(), outcome: "silent", reason: `c${i}`, detail: {} })));
  ok(rows.length === 6 && (await R.verifyStoredChain(store)).valid, "concurrent seals retry instead of forking");
}

// Lease
{
  const s = memState();
  ok(await acquireLease(s, "tick", "a", T0) && !(await acquireLease(s, "tick", "b", T0 + 1)), "a held lease blocks a second owner");
  await releaseLease(s, "tick", "a");
  ok(await acquireLease(s, "tick", "b", T0 + 2), "a released lease can be taken");
  ok(await acquireLease(s, "tick", "c", T0 + 11 * 60_000), "an expired lease can be taken over");
}

// Models from env, per product prefix
{
  ok(modelsFromEnv({ LIVINGPRESS_AI_KEY: "k" }, { prefix: "LIVINGPRESS" }).models.length === 2, "a product prefix key without a URL uses the Lovable gateway ladder");
  ok(modelsFromEnv({ LIVINGCHANGELOG_AI_KEY: "k" }, { prefix: "LIVINGPRESS" }).models.length === 0, "prefixes don't leak between products");
  ok(modelsFromEnv({ ANTHROPIC_API_KEY: "k", LIVINGPRESS_BACKUP_AI_KEY: "b" }, { prefix: "LIVINGPRESS" }).models.map((m) => m.id).join() === "anthropic:claude-haiku-4-5,backup", "provider keys plus a prefixed backup form the ladder");
}

// Vendoring drift check
{
  const text = "export const x = 1;\n";
  const manifest = { name: "livingcore" as const, version: "1.0.0", files: { "x.ts": await sha256(text) } };
  ok((await checkVendoredCore({ "x.ts": text }, manifest)).length === 0, "an untouched vendored copy passes");
  ok((await checkVendoredCore({ "x.ts": text + "// tweak\n" }, manifest)).some((p) => p.includes("edited in place")), "an edited vendored file is caught");
  ok((await checkVendoredCore({ "x.ts": text, "y.ts": "" }, manifest)).some((p) => p.includes("not part of livingcore")), "an extra file in core/ is caught");
}

console.log(`livingcore self-test: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
