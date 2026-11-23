/**
 * DREAM — pattern discovery over the engine's own history. Pure code, no
 * model. Reads published posts and sealed runs, finds patterns, and emits
 * PROPOSALS (never silent self-modification). Proposals the owner accepts
 * are stored as heuristics the planner reads on the next tick.
 *
 * Optional reader signal: if the site passes human-only view counts
 * (filtered by DEFENSE), DREAM weighs clusters by what people actually read.
 */

import type { LivingPressConfig } from "./config.ts";
import type { Post, Run, Storage } from "./ports.ts";

export type Proposal = { id: string; kind: "favor-cluster" | "retire-angle" | "raise-floor" | "lower-floor" | "add-topic-area"; detail: string; evidence: string };
export type Heuristics = { favorClusters: string[]; avoidPhrases: string[]; accepted: string[] };

export function dream(posts: Post[], runs: Run[], cfg: LivingPressConfig, views: Record<string, number> = {}): Proposal[] {
  const out: Proposal[] = [];
  const recent = runs.slice(0, 50);
  const silent = recent.filter((r) => r.outcome === "silent").length;
  const published = recent.filter((r) => r.outcome === "published").length;

  if (recent.length >= 15 && silent / recent.length > 0.7)
    out.push({ id: "lower-floor", kind: "lower-floor", detail: "Lower the reader floor by 5 points or add new content topics.", evidence: `${silent}/${recent.length} recent ticks were silent.` });
  const avgFit = posts.length ? posts.reduce((s, p) => s + p.fitness, 0) / posts.length : 0;
  if (posts.length >= 8 && avgFit > cfg.qualityFloor.fitness + 0.15)
    out.push({ id: "raise-floor", kind: "raise-floor", detail: "Raise the fitness floor by 0.05 — the engine is consistently clearing it.", evidence: `Average fitness ${avgFit.toFixed(2)} across ${posts.length} posts.` });

  for (const c of cfg.clusters) {
    const own = posts.filter((p) => p.cluster === c.id);
    const v = own.reduce((s, p) => s + (views[p.slug] ?? 0), 0);
    const perPost = own.length ? v / own.length : 0;
    const sitePer = posts.length ? Object.values(views).reduce((a, b) => a + b, 0) / posts.length : 0;
    if (own.length >= 2 && sitePer > 0 && perPost > sitePer * 1.5)
      out.push({ id: `favor:${c.id}`, kind: "favor-cluster", detail: `Favor "${c.label}" when exploiting.`, evidence: `${Math.round(perPost)} human views/post vs site ${Math.round(sitePer)}.` });
  }

  // Repeated opening phrases = a tic the writer has fallen into.
  const openers = new Map<string, number>();
  for (const p of posts.slice(0, 30)) {
    const first = p.body.split(/\s+/).slice(0, 4).join(" ").toLowerCase();
    openers.set(first, (openers.get(first) ?? 0) + 1);
  }
  for (const [phrase, n] of openers) if (n >= 3) out.push({ id: `avoid:${phrase}`, kind: "retire-angle", detail: `Stop opening posts with "${phrase}…".`, evidence: `${n} recent posts open the same way.` });

  if (published === 0 && recent.length >= 20)
    out.push({ id: "add-topics", kind: "add-topic-area", detail: "Add at least one new content topic; the current ones look exhausted.", evidence: "No posts in the last 20 ticks." });
  return out;
}

export async function heuristics(storage: Storage): Promise<Heuristics> {
  return (await storage.getState<Heuristics>("dream.heuristics")) ?? { favorClusters: [], avoidPhrases: [], accepted: [] };
}

/** Owner accepts a proposal. Only favor/avoid change engine behavior automatically; floors are config edits the owner makes. */
export async function accept(storage: Storage, p: Proposal, now: number = Date.now()): Promise<Heuristics> {
  const h = await heuristics(storage);
  if (p.kind === "favor-cluster") h.favorClusters = [...new Set([...h.favorClusters, p.id.slice(6)])];
  if (p.kind === "retire-angle") h.avoidPhrases = [...new Set([...h.avoidPhrases, p.id.slice(6)])];
  if (!h.accepted.some((a) => a.endsWith(` ${p.id}`))) h.accepted.push(`${new Date(now).toISOString()} ${p.id}`);
  await storage.setState("dream.heuristics", h);
  return h;
}
