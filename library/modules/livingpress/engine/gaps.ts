/**
 * Gap ledger — topic aiming. Instead of "what should I write?", the planner
 * is told exactly what the site is missing, in priority order. Mechanical.
 */

import type { LivingPressConfig } from "./config.ts";
import type { Post, Topic } from "./ports.ts";

export type Gap = { priority: number; cluster: string; need: "pillar" | "support" | "freshness" | "depth"; note: string };

export function gapLedger(posts: Post[], topics: Topic[], cfg: LivingPressConfig, now: number): Gap[] {
  const gaps: Gap[] = [];
  for (const c of cfg.clusters) {
    const own = posts.filter((p) => p.cluster === c.id);
    const pillars = own.filter((p) => p.role === "pillar");
    if (!pillars.length) gaps.push({ priority: 100, cluster: c.id, need: "pillar", note: `"${c.label}" has no pillar post.` });
    for (const pillar of pillars) {
      const supports = own.filter((p) => p.role === "support" && p.pillar_slug === pillar.slug).length;
      if (supports < 2) gaps.push({ priority: 90 - supports * 10, cluster: c.id, need: "support", note: `Pillar "${pillar.title}" has ${supports} support post(s); needs 2.` });
    }
    const newest = own.map((p) => Date.parse(p.published_at)).sort((a, b) => b - a)[0];
    if (newest && now - newest > 30 * 86400_000) gaps.push({ priority: 60, cluster: c.id, need: "freshness", note: `"${c.label}" has had nothing new in 30+ days.` });
    const queued = topics.filter((t) => t.cluster === c.id).length;
    if (queued === 0) gaps.push({ priority: 50, cluster: c.id, need: "depth", note: `No queued topics for "${c.label}".` });
  }
  return gaps.sort((a, b) => b.priority - a.priority || a.cluster.localeCompare(b.cluster));
}
