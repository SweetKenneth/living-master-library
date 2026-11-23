/** DREAM: observes publishing behavior, proposes; never self-modifies silently. */

import type { LivingChangelogConfig } from "./config.ts";
import type { ChangelogEntry, Run, Storage } from "./ports.ts";

export type Proposal = { id: string; kind: "raise-floor" | "lower-floor" | "retire-opener" | "adjust-cadence"; detail: string; evidence: string };
export type Heuristics = { avoidPhrases: string[]; accepted: string[] };

export function dream(entries: ChangelogEntry[], runs: Run[], cfg: LivingChangelogConfig): Proposal[] {
  const out: Proposal[] = [];
  const recent = runs.slice(0, 50);
  const silent = recent.filter((r) => r.outcome === "silent").length;
  if (recent.length >= 20 && silent / recent.length > 0.85)
    out.push({ id: "lower-floor", kind: "lower-floor", detail: "Review significance/quality floors or source coverage; the engine is almost always silent.", evidence: `${silent}/${recent.length} recent ticks were silent.` });
  const avgFit = entries.length ? entries.reduce((s, e) => s + e.fitness, 0) / entries.length : 0;
  if (entries.length >= 8 && avgFit > cfg.qualityFloor.fitness + 0.12)
    out.push({ id: "raise-floor", kind: "raise-floor", detail: "Consider raising the fitness floor by 0.05.", evidence: `Average fitness ${avgFit.toFixed(2)} across ${entries.length} entries.` });

  const openers = new Map<string, number>();
  for (const e of entries.slice(0, 30)) {
    const first = e.body.replace(/^#+\s.*$/gm, " ").trim().split(/\s+/).slice(0, 5).join(" ").toLowerCase();
    if (first) openers.set(first, (openers.get(first) ?? 0) + 1);
  }
  for (const [phrase, n] of openers) if (n >= 3) out.push({ id: `avoid:${phrase}`, kind: "retire-opener", detail: `Stop opening entries with "${phrase}…".`, evidence: `${n} recent entries share it.` });

  if (entries.length >= 5) {
    const diffs = entries.slice(0, 5).slice(0, -1).map((e, i) => Math.abs(Date.parse(e.published_at) - Date.parse(entries[i + 1]!.published_at)) / 3600_000);
    if (diffs.length && diffs.every((h) => h < cfg.cadence.minHoursBetweenEntries * 1.2))
      out.push({ id: "cadence", kind: "adjust-cadence", detail: "Consider a slightly longer bundling window; recent entries are landing right at the cadence floor.", evidence: `${diffs.map((x) => x.toFixed(1)).join(", ")} hours between recent entries.` });
  }
  return out;
}

export async function heuristics(storage: Storage): Promise<Heuristics> {
  return (await storage.getState<Heuristics>("dream.heuristics")) ?? { avoidPhrases: [], accepted: [] };
}

export async function accept(storage: Storage, p: Proposal, now = Date.now()): Promise<Heuristics> {
  const h = await heuristics(storage);
  if (p.kind === "retire-opener") h.avoidPhrases = [...new Set([...h.avoidPhrases, p.id.slice(6)])];
  if (!h.accepted.some((a) => a.endsWith(` ${p.id}`))) h.accepted.push(`${new Date(now).toISOString()} ${p.id}`);
  await storage.setState("dream.heuristics", h);
  return h;
}
