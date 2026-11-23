/** Prompt builders. All site specifics come from config; the engine invents nothing. */

import type { LivingPressConfig } from "./config.ts";
import type { Gap } from "./gaps.ts";
import type { Post, Topic } from "./ports.ts";

export function voiceSystem(cfg: LivingPressConfig, avoid: string[] = []): string {
  return `You write for ${cfg.site.name}'s blog, "${cfg.site.blogName}".
Your reader: ${cfg.audience}. They are skeptical and short on time. Earn the next paragraph every time.

Voice: ${cfg.voice}
${avoid.length ? `Do not open posts with: ${avoid.map((a) => `"${a}…"`).join(", ")}.` : ""}

Format: Markdown. NO level-1 heading (the page renders the title). Use "## " for sections.
No front matter, no meta commentary, never mention being an AI.

House facts you may rely on — and nothing beyond them:
${cfg.houseFacts}

Never claim:
${cfg.neverClaim.map((n) => `- ${n}`).join("\n")}`.trim();
}

/** Every existing title, grouped by cluster, newest first, within a character budget (the old version showed only the newest 60). */
export function titleIndex(cfg: LivingPressConfig, existing: { title: string; cluster: string }[], budget = 9000): string {
  if (!existing.length) return "- (nothing yet)";
  const groups = new Map<string, string[]>();
  for (const e of existing) groups.set(e.cluster, [...(groups.get(e.cluster) ?? []), e.title]);
  const perGroup = Math.max(10, Math.floor(budget / Math.max(1, groups.size) / 60));
  const out: string[] = [];
  for (const [cluster, titles] of groups) {
    const label = cfg.clusters.find((c) => c.id === cluster)?.label ?? cluster;
    out.push(`${label} (${titles.length}):`);
    for (const t of titles.slice(0, perGroup)) out.push(`  - ${t}`);
    if (titles.length > perGroup) out.push(`  - ...and ${titles.length - perGroup} older`);
  }
  return out.join("\n");
}

export function plannerPrompt(cfg: LivingPressConfig, gaps: Gap[], existing: { title: string; cluster: string }[], favor: string[]): string {
  return `You are planning the editorial backlog, not writing a post.

Content topics (clusters):
${cfg.clusters.map((c) => `- ${c.id}: ${c.label} — ${c.thesis} (terms: ${c.keywords.join(", ")})`).join("\n")}

What the site is missing, highest priority first (pay these debts first):
${gaps.slice(0, 8).map((g) => `- [${g.need}] ${g.cluster}: ${g.note}`).join("\n") || "- nothing urgent"}
${favor.length ? `\nReaders respond best to: ${favor.join(", ")}. Lean there when nothing is urgent.` : ""}

Reader problems to aim at:
${cfg.painPoints.map((p) => `- ${p}`).join("\n")}

Already written or queued, by topic (do not repeat or paraphrase ANY of these):
${titleIndex(cfg, existing)}

If several existing titles already make the same point (the same technique, the same failure, the same fix), that
theme is saturated: do not propose another post on it unless it reaches a conclusion none of them reach. Fewer topics
are better than a reworded one.

Propose 6 topics. Each: cluster (an id above), title (specific, searchable, under 70 chars, no clickbait),
angle (two sentences on the argument), role ("pillar" = long central argument, "support" = one narrow
concrete slice of a pillar), pain_point, keywords (3-5), gravity (1-100).
Return {"topics": [...]}.`;
}

export function linkMenu(cfg: LivingPressConfig, posts: Post[], cluster: string, pillarSlug: string | null): string {
  const site = cfg.siteLinks.map((l) => `- ${l.path} — ${l.label} (${l.note})`).join("\n");
  const related = posts.filter((p) => p.cluster === cluster).slice(0, 6).map((p) => `- ${cfg.site.blogPath}/${p.slug} — "${p.title}"`).join("\n");
  return `Internal links available (use 2-4 as inline markdown links, only where they help; NO other internal paths):
${site}${related ? `\nRelated posts:\n${related}` : ""}${pillarSlug ? `\nThis cluster's pillar is ${cfg.site.blogPath}/${pillarSlug} — link it once.` : ""}`;
}

export function draftPrompt(cfg: LivingPressConfig, topic: Topic, posts: Post[], pillarSlug: string | null, explicit: boolean, mutateNote?: string): string {
  const b = cfg.wordTargets[topic.role];
  const cluster = cfg.clusters.find((c) => c.id === topic.cluster);
  return `Write a ${topic.role} post.

Title: ${topic.title}
Topic: ${cluster?.label ?? topic.cluster} — ${cluster?.thesis ?? ""}
Angle: ${topic.angle}${mutateNote ? `\nThe previous attempt failed review: ${mutateNote}. Take a genuinely different angle.` : ""}
Reader problem: ${topic.pain_point}
Search terms (use naturally, never stuffed): ${topic.keywords.join(", ")}
Length: ${b.min}-${b.max} words.

${explicit
    ? `You MAY make the case for ${cfg.site.name} explicitly — ONE short section near the end (max 150 words), house facts only. If it doesn't fit honestly, leave it out.`
    : `Do NOT pitch ${cfg.site.name}. One reference link as a source is the maximum. The post must stand on its own.`}

${linkMenu(cfg, posts, topic.cluster, pillarSlug)}

Open with the problem, not a definition. Close with something the reader can do this week. Markdown body only.`;
}

export function reviewSystem(cfg: LivingPressConfig): string {
  return `You are two brains reviewing one draft. You do not flatter it.

READER BRAIN: ${cfg.audience}, with no stake in ${cfg.site.name}. Score 0-100: is the problem real, the argument concrete,
did it say something new, would they send it to someone? Generic content-marketing prose scores below 50.

SKEPTIC BRAIN: an adversarial fact-checker. Score 0-100 on honesty. Deduct hard for any claim not supported by the
house facts, invented numbers, customers or testimonials, implied services that do not exist, and anything on the never-claim list.
Also deduct hard when the title promises something the body does not deliver, and for any technical statement that is
imprecise or wrong (how a tool, format or algorithm actually works). An expert reader will check those first.

House facts (the only ground truth):
${cfg.houseFacts}

Never claim:
${cfg.neverClaim.map((n) => `- ${n}`).join("\n")}`;
}

export function reviewPrompt(title: string, body: string, antigens: string[]): string {
  return `Draft title: ${title}
${antigens.length ? `The safety gate already flagged: ${antigens.join(" | ")}\n` : ""}
--- DRAFT ---
${body}
--- END ---

Return JSON:
{"reader_score":0-100,"skeptic_score":0-100,"verdict":"publish"|"revise"|"silence",
 "unsupported_claims":["exact phrases"],"caveats":["0-3 reader-facing limits"],
 "epistemic_status":"established"|"inference"|"opinion"|"contested",
 "excerpt":"one sentence under 165 chars","title":"kept or sharpened, under 70 chars",
 "keywords":["3-6"],"advocacy_reads_as_ad":true|false,"revision_note":"the single most important fix"}
"silence" is correct when the draft says nothing the reader couldn't have written. Prefer silence to filler.`;
}

export function revisePrompt(body: string, note: string, claims: string[], antigens: string[], readsAsAd: boolean): string {
  return `Revise this draft. Keep structure and length; fix the specific problems.
Most important fix: ${note || "tighten the argument and cut filler"}
Remove or soften (unsupported): ${claims.join(" | ") || "none"}
Safety gate flags to fix: ${antigens.join(" | ") || "none"}
${readsAsAd ? "The brand mention reads as an ad — cut it to one factual sentence with one link, or remove it." : ""}
Return the full revised markdown body only.

--- DRAFT ---
${body}`;
}

export function auditPrompt(cfg: LivingPressConfig, post: Post, mechanical: string[]): string {
  return `Re-read this published post against TODAY's house facts. Has anything become untrue, outdated, or overclaimed?

Today's house facts:
${cfg.houseFacts}

Mechanical findings already detected: ${mechanical.join(" | ") || "none"}

--- POST "${post.title}" ---
${post.body}
--- END ---

Return JSON: {"verdict":"fresh"|"amend","note":"one sentence for readers explaining what changed",
"corrections":["each specific change"],"body":"full corrected markdown if amend, else empty","excerpt":"updated excerpt if needed"}
Change only what is wrong. Do not rewrite for style.`;
}
