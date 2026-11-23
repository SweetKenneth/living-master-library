/**
 * DEFENSE — the front gate.
 * Classifies the caller, buckets it by a day-rotating signature (no raw IPs
 * stored), and rate-gates the product's public reads and the engine's admin
 * endpoints. Also tells analytics which hits count as human, so bot traffic
 * never steers what DREAM thinks readers want.
 */

import { sha256 } from "./oracle.ts";
import type { AtomicStore } from "./types.ts";

export type AgentClass = "human" | "search-crawler" | "ai-crawler" | "scripted" | "empty";

export function classifyAgent(ua: string | null | undefined): AgentClass {
  const s = (ua ?? "").trim();
  if (!s) return "empty";
  if (/googlebot|bingbot|duckduckbot|yandex|baiduspider|applebot|slurp|petalbot/i.test(s)) return "search-crawler";
  if (/gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|anthropic|perplexity|ccbot|bytespider|google-extended|cohere|amazonbot|meta-externalagent|diffbot|imagesift/i.test(s)) return "ai-crawler";
  if (/bot\b|crawler|spider|monitor|uptime|pingdom|lighthouse/i.test(s) && !/cubot/i.test(s)) return "scripted";
  if (/curl|wget|python|go-http|httpclient|node-fetch|axios|scrapy|headless|phantom|java\//i.test(s)) return "scripted";
  return "human";
}

export const countsAsHuman = (a: AgentClass) => a === "human";

export function saltDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export async function signature(ip: string, ua: string, now: number): Promise<string> {
  return (await sha256(`${saltDay(now)}|${ip}|${ua}`)).slice(0, 24);
}

export type Verdict = { decision: "allow" } | { decision: "throttle"; retryAfterSec: number } | { decision: "refuse"; reason: string };

/** Constant-time string compare for owner/cron secrets. */
export function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** Anything with getState/setState can hold rate buckets; durable stores may also provide an atomic increment. */
export type BucketStore = Pick<AtomicStore, "getState" | "setState" | "incrementRateBucket">;

/** Per-isolate bucket store for high-volume public reads: zero database round trips per page view. */
export function memoryBuckets(maxKeys = 5000): BucketStore {
  const m = new Map<string, unknown>();
  return {
    async getState<T>(key: string) { return (m.has(key) ? (m.get(key) as T) : null); },
    async setState(key: string, value: unknown) {
      m.delete(key);
      m.set(key, value);
      if (m.size > maxKeys) m.delete(m.keys().next().value as string); // oldest first
    },
  };
}

type Window = { minute: number; counts: Record<string, number> };

/**
 * Rate gate. One state row per surface holding only the current minute's
 * counts (it resets every minute), so the table never grows with visitors.
 */
export async function gate(
  store: BucketStore,
  input: { surface: "public" | "admin"; ip: string; userAgent: string; now: number; limitPerMinute: number },
): Promise<Verdict> {
  const agent = classifyAgent(input.userAgent);
  if (input.surface === "admin" && agent !== "human" && agent !== "scripted") return { decision: "refuse", reason: "crawler on admin surface" };
  const sig = await signature(input.ip, input.userAgent, input.now);
  const minute = Math.floor(input.now / 60_000);
  const key = `defense.${input.surface}`;
  let n: number;
  if (store.incrementRateBucket) {
    // Database-backed admin gates use one atomic SQL upsert, so concurrent requests cannot lose increments.
    n = await store.incrementRateBucket(input.surface, sig, minute);
  } else {
    // Public reads intentionally use per-isolate memory: free, fast, and good enough for abuse damping.
    const prev = await store.getState<Window>(key);
    const win: Window = prev && prev.minute === minute && prev.counts ? prev : { minute, counts: {} };
    n = (win.counts[sig] ?? 0) + 1;
    win.counts[sig] = n;
    await store.setState(key, win);
  }
  const limit = agent === "search-crawler" ? input.limitPerMinute * 2 : agent === "human" ? input.limitPerMinute : Math.ceil(input.limitPerMinute / 4);
  if (n > limit) return { decision: "throttle", retryAfterSec: Math.max(1, 60 - Math.floor((input.now % 60_000) / 1000)) };
  return { decision: "allow" };
}
