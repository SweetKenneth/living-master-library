/**
 * EVOLUTION — fitness scoring and adaptive strategy.
 *
 * fitness(draft) blends the two brains, the immune gate and structural gates
 * into one 0..1 number, and a draft must pass all seven gates to publish.
 * strategy() chooses how the next topic is picked:
 *   exploit — stay in the cluster that has been earning the best fitness
 *   explore — try the least-covered cluster
 *   mutate  — the last draft failed: retry the same topic with a new angle
 */

import type { LivingPressConfig } from "./config.ts";
import type { Antigen } from "./immune.ts";
import { stream } from "./oracle.ts";
import type { Post, Role, Run } from "./ports.ts";

export type Gates = Record<string, boolean>;

export function fitness(input: {
  reader: number;
  skeptic: number;
  words: number;
  role: Role;
  antigens: Antigen[];
  links: number;
  readsAsAd: boolean;
  cfg: LivingPressConfig;
}): { score: number; gates: Gates; passed: boolean } {
  const t = input.cfg.wordTargets[input.role];
  const gates: Gates = {
    reader: input.reader >= input.cfg.qualityFloor.reader,
    skeptic: input.skeptic >= input.cfg.qualityFloor.skeptic,
    immune: !input.antigens.some((a) => a.severity === "block"),
    length: input.words >= t.min * 0.85 && input.words <= t.max * 1.1,
    links: input.links >= 1,
    notAnAd: !input.readsAsAd,
    clean: input.antigens.length === 0,
  };
  const lengthFit = 1 - Math.min(1, Math.abs(input.words - (t.min + t.max) / 2) / t.max);
  const score =
    0.35 * (input.reader / 100) +
    0.35 * (input.skeptic / 100) +
    0.1 * lengthFit +
    0.1 * Math.min(1, input.links / 3) +
    0.1 * (input.antigens.length ? Math.max(0, 1 - input.antigens.length * 0.25) : 1);
  const rounded = Math.round(score * 1000) / 1000;
  return { score: rounded, gates, passed: Object.values(gates).every(Boolean) && rounded >= input.cfg.qualityFloor.fitness };
}

export type Strategy = { mode: "exploit" | "explore" | "mutate"; cluster?: string; topicTitle?: string };

/** `tick` should be a durable tick counter; without it the roll falls back to the post count (which stalls once the post list is capped). */
export function strategy(posts: Post[], runs: Run[], cfg: LivingPressConfig, tick?: number): Strategy {
  const last = runs[0];
  const attempt = Number(last?.detail?.["attempt"] ?? 1);
  if (last && (last.outcome === "silent" || last.outcome === "blocked") && last.topic_title && attempt < 2) {
    return { mode: "mutate", topicTitle: last.topic_title };
  }
  const byCluster = cfg.clusters.map((c) => {
    const own = posts.filter((p) => p.cluster === c.id);
    const avg = own.length ? own.reduce((s, p) => s + (p.fitness || 0), 0) / own.length : 0;
    return { id: c.id, n: own.length, avg };
  });
  // Deterministic exploration: ~1 in 4 ticks, seeded by the tick counter.
  const roll = stream(cfg.seed, `explore:${tick ?? posts.length}`)();
  if (roll < 0.25 || posts.length < cfg.clusters.length) {
    const least = [...byCluster].sort((a, b) => a.n - b.n || a.id.localeCompare(b.id))[0];
    return { mode: "explore", cluster: least?.id };
  }
  const best = [...byCluster].filter((c) => c.n > 0).sort((a, b) => b.avg - a.avg || a.id.localeCompare(b.id))[0];
  return { mode: "exploit", cluster: best?.id };
}
