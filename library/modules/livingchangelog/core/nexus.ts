/**
 * NEXUS — adaptive free-tier routing. A ladder of model providers,
 * cheapest/free first.
 * A provider that rate-limits or runs out of quota is benched for a cooldown
 * that doubles on repeat; the call falls through to the next rung. If every
 * rung is exhausted the tick aborts cleanly — it never publishes half a job.
 */

import type { ChatMessage, ChatOptions, ModelProvider, StateStore as Storage } from "./types.ts";

export class LadderExhausted extends Error {
  attempts: { id: string; error: string }[];
  constructor(attempts: { id: string; error: string }[]) {
    super(`All model providers failed: ${attempts.map((a) => `${a.id}: ${a.error}`).join(" | ")}`);
    this.attempts = attempts;
  }
}

type Bench = Record<string, { until: number; strikes: number }>;

const QUOTA = /\b(429|402|529|quota|rate.?limit|insufficient|credits|exhausted|overloaded)\b/i;
/** Timeouts, network failures and 5xx: the provider is sick, not out of money. Bench briefly so the ladder moves on fast. */
const TRANSIENT = /\b(5\d\d|timeout|timed out|aborted|fetch failed|network|ECONNRESET|ECONNREFUSED|ENOTFOUND|socket)\b/i;

export class Nexus {
  calls = 0;
  lastModel = "";
  private providers: ModelProvider[];
  private storage: Storage;
  private now: () => number;
  constructor(providers: ModelProvider[], storage: Storage, now: () => number) {
    this.providers = providers;
    this.storage = storage;
    this.now = now;
    if (!providers.length) throw new Error("NEXUS needs at least one model provider");
  }

  private cache: Bench | null = null;
  /** Read once per tick (a Nexus lives for one tick), then kept in memory. */
  private async bench(): Promise<Bench> {
    if (!this.cache) this.cache = (await this.storage.getState<Bench>("nexus.bench").catch(() => null)) ?? {};
    return this.cache;
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<{ text: string; model: string }> {
    const bench = await this.bench();
    const attempts: { id: string; error: string }[] = [];
    const t = this.now();
    // Benched providers are tried last rather than never — a ladder that is all benched still gets one try.
    const order = [...this.providers].sort((a, b) => Number((bench[a.id]?.until ?? 0) > t) - Number((bench[b.id]?.until ?? 0) > t));
    for (const provider of order) {
      try {
        this.calls += 1;
        const text = await provider.chat(messages, opts);
        if (!text || !text.trim()) throw new Error("empty response");
        if (bench[provider.id]) {
          delete bench[provider.id];
          await this.storage.setState("nexus.bench", bench).catch(() => undefined);
        }
        this.lastModel = provider.id;
        return { text, model: provider.id };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        attempts.push({ id: provider.id, error: message.slice(0, 200) });
        const base = QUOTA.test(message) ? 5 * 60_000 : TRANSIENT.test(message) ? 2 * 60_000 : 0;
        if (base) {
          const strikes = (bench[provider.id]?.strikes ?? 0) + 1;
          bench[provider.id] = { strikes, until: t + Math.min(24 * 3600_000, base * 2 ** (strikes - 1)) };
          await this.storage.setState("nexus.bench", bench).catch(() => undefined);
        }
      }
    }
    throw new LadderExhausted(attempts);
  }

  /**
   * JSON call. If the reply does not parse, ask once more for JSON only
   * before falling back — a parse failure used to look like a zero score.
   */
  async json<T>(messages: ChatMessage[], fallback: T, opts: ChatOptions = {}): Promise<{ value: T; model: string; parsed: boolean }> {
    const first = await this.chat(messages, { ...opts, json: true });
    const value = tryParseJson<T>(first.text);
    if (value !== undefined) return { value, model: first.model, parsed: true };
    const retry = await this.chat(
      [...messages, { role: "assistant", content: first.text.slice(0, 4000) }, { role: "user", content: "That was not valid JSON. Reply again with the JSON object only: no prose, no code fences." }],
      { ...opts, json: true, temperature: 0 },
    );
    const second = tryParseJson<T>(retry.text);
    return second !== undefined ? { value: second, model: retry.model, parsed: true } : { value: fallback, model: retry.model, parsed: false };
  }
}

export function tryParseJson<T>(text: string): T | undefined {
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const attempt = (t: string): T | undefined => {
    try {
      const v = JSON.parse(t) as unknown;
      return v !== null && typeof v === "object" ? (v as T) : undefined;
    } catch {
      return undefined;
    }
  };
  const direct = attempt(cleaned);
  if (direct !== undefined) return direct;
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? attempt(cleaned.slice(start, end + 1)) : undefined;
}

export function parseJson<T>(text: string, fallback: T): T {
  return tryParseJson<T>(text) ?? fallback;
}
