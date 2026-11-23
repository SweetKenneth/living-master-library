/**
 * Circuit breaker + MEDIC heartbeat.
 *
 * Trips after N consecutive failed ticks (model errors, source failures,
 * repeated publishing failures). While open the engine does not call any model
 * and does not publish; it records "tripped" and goes quiet until the cooldown
 * passes (half-open: one probe tick) or an owner resets it.
 *
 * MEDIC: every tick writes a heartbeat. health() reports stale heartbeat,
 * open breaker, failure streak and silence streak so the site owner (or the
 * agent that installed it) can see the engine's pulse at a glance.
 */

import type { StateStore as Storage } from "./types.ts";

export type BreakerState = {
  status: "closed" | "open" | "half-open";
  failures: number;
  openedAt: number | null;
  lastError: string | null;
  heartbeat: number | null;
};

const KEY = "breaker";
const EMPTY: BreakerState = { status: "closed", failures: 0, openedAt: null, lastError: null, heartbeat: null };

export class Breaker {
  private storage: Storage;
  private now: () => number;
  private opts: { maxConsecutiveFailures: number; cooldownMinutes: number; heartbeatStaleHours: number };
  constructor(storage: Storage, now: () => number, opts: { maxConsecutiveFailures: number; cooldownMinutes: number; heartbeatStaleHours: number }) {
    this.storage = storage;
    this.now = now;
    this.opts = opts;
  }

  async state(): Promise<BreakerState> {
    return { ...EMPTY, ...((await this.storage.getState<BreakerState>(KEY)) ?? {}) };
  }

  /** May this tick run? Moves open -> half-open once the cooldown elapses. */
  async admit(): Promise<{ ok: boolean; state: BreakerState }> {
    const s = await this.state();
    s.heartbeat = this.now();
    if (s.status === "open" && s.openedAt !== null && this.now() - s.openedAt >= this.opts.cooldownMinutes * 60_000) {
      s.status = "half-open";
    }
    await this.storage.setState(KEY, s);
    return { ok: s.status !== "open", state: s };
  }

  async success(): Promise<void> {
    const s = await this.state();
    await this.storage.setState(KEY, { ...s, status: "closed", failures: 0, openedAt: null, lastError: null, heartbeat: this.now() });
  }

  async failure(error: string): Promise<BreakerState> {
    const s = await this.state();
    s.failures += 1;
    s.lastError = error.slice(0, 300);
    s.heartbeat = this.now();
    if (s.status === "half-open" || s.failures >= this.opts.maxConsecutiveFailures) {
      s.status = "open";
      s.openedAt = this.now();
    }
    await this.storage.setState(KEY, s);
    return s;
  }

  async reset(): Promise<void> {
    await this.storage.setState(KEY, { ...EMPTY, heartbeat: this.now() });
  }

  /** MEDIC report. */
  async health(silenceStreak: number): Promise<{ healthy: boolean; findings: string[]; state: BreakerState }> {
    const s = await this.state();
    const findings: string[] = [];
    if (s.status === "open") findings.push(`Breaker OPEN since ${new Date(s.openedAt ?? 0).toISOString()}: ${s.lastError}`);
    if (s.failures > 0 && s.status !== "open") findings.push(`${s.failures} consecutive failure(s); last: ${s.lastError}`);
    if (!s.heartbeat) findings.push("No heartbeat yet — the scheduler has never called the engine.");
    else if (this.now() - s.heartbeat > this.opts.heartbeatStaleHours * 3600_000)
      findings.push(`Heartbeat stale (${Math.round((this.now() - s.heartbeat) / 3600_000)}h) — check the scheduled trigger.`);
    if (silenceStreak >= 10) findings.push(`${silenceStreak} silent ticks in a row: nothing new may be coming in, or the quality floor may be too high.`);
    return { healthy: findings.length === 0, findings, state: s };
  }
}
