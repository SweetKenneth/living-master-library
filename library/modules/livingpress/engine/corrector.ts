/**
 * Correction of old posts + correction diary. A blog that only appends slowly
 * lies. On a cooldown, a tick re-reads ONE older post against today's house
 * facts. Mechanical drift (retired words, dead links) is found in code; the
 * model only confirms and proposes the minimal fix. Every amendment appends
 * a dated, public "Updated" note to the post — corrections are never silent.
 *
 * An amendment is new text, so it goes through the same immune gate as a new
 * draft. If the fix itself would introduce leakage, invented proof or unsafe
 * advice, the amendment is refused and the post is left as it was.
 */

import type { LivingPressConfig } from "./config.ts";
import { blocks, retiredHits, screen } from "./immune.ts";
import { deadLinks } from "./links.ts";
import { demoteH1 } from "./markdown.ts";
import type { Nexus } from "./nexus.ts";
import { auditPrompt } from "./prompts.ts";
import type { Post, Storage } from "./ports.ts";

export function mechanicalDrift(body: string, cfg: LivingPressConfig, knownSlugs: string[]): string[] {
  return [
    ...retiredHits(body, cfg).map((r) => `retired wording "${r.match}" → ${r.replaceWith}`),
    ...deadLinks(body, cfg, knownSlugs).map((p) => `dead internal link ${p}`),
  ];
}

export type AuditResult = { slug: string; title: string; amended: boolean; note: string; refused?: string[] };

export async function auditOne(storage: Storage, nexus: Nexus, cfg: LivingPressConfig, now: number): Promise<null | AuditResult> {
  const posts = await storage.listPosts(200);
  const cutoff = now - cfg.cadence.auditCooldownHours * 3600_000;
  const candidate = posts
    .filter((p) => Date.parse(p.published_at) < cutoff && (!p.last_audited_at || Date.parse(p.last_audited_at) < cutoff))
    .sort((a, b) => Date.parse(a.last_audited_at ?? a.published_at) - Date.parse(b.last_audited_at ?? b.published_at))[0];
  if (!candidate) return null;

  const slugs = posts.map((p) => p.slug);
  const mech = mechanicalDrift(candidate.body, cfg, slugs);
  const { value } = await nexus.json<{ verdict?: unknown; note?: unknown; corrections?: unknown; body?: unknown; excerpt?: unknown }>(
    [
      { role: "system", content: "You are a careful copy editor fixing factual drift. You change only what is wrong." },
      { role: "user", content: auditPrompt(cfg, candidate, mech) },
    ],
    { verdict: "fresh" },
    { maxTokens: 4200, temperature: 0.2 },
  );

  const iso = new Date(now).toISOString();
  const newBody = typeof value.body === "string" ? demoteH1(value.body.trim()) : "";
  const wantsAmend = value.verdict === "amend" || mech.length > 0;
  // Guard against a truncated rewrite: the amended body must be substantial and not a fraction of the original.
  const substantial = newBody.length > 200 && newBody.length >= candidate.body.length * 0.5;
  if (!wantsAmend || !substantial) {
    await storage.updatePost(candidate.id, { last_audited_at: iso });
    const note = mech.length ? `drift found but no usable fix proposed: ${mech.join("; ")}` : "still true";
    return { slug: candidate.slug, title: candidate.title, amended: false, note };
  }

  const antigens = screen(newBody, cfg, slugs);
  if (blocks(antigens)) {
    await storage.updatePost(candidate.id, { last_audited_at: iso });
    const refused = antigens.filter((a) => a.severity === "block").map((a) => `${a.kind}: ${a.match}`);
    return { slug: candidate.slug, title: candidate.title, amended: false, note: "amendment refused by the safety gate", refused };
  }

  const note = (typeof value.note === "string" && value.note.trim() ? value.note.trim() : "Corrected to match current facts.").slice(0, 300);
  const changes = Array.isArray(value.corrections) ? value.corrections.filter((c): c is string => typeof c === "string") : [];
  const patch: Partial<Post> = {
    body: newBody,
    last_audited_at: iso,
    corrections: [...(candidate.corrections ?? []), { at: iso, note, changes: [...mech, ...changes].slice(0, 12) }],
  };
  if (typeof value.excerpt === "string" && value.excerpt.trim()) patch.excerpt = value.excerpt.trim().slice(0, 200);
  await storage.updatePost(candidate.id, patch);
  return { slug: candidate.slug, title: candidate.title, amended: true, note };
}

/** Render the public correction diary for a post page (Markdown; pass through renderMarkdown). */
export function correctionDiary(post: Pick<Post, "corrections">): string {
  if (!post.corrections?.length) return "";
  const line = (c: { at: string; note: string }) => `- *Updated ${String(c.at).slice(0, 10)}:* ${String(c.note).replace(/\s+/g, " ").trim()}`;
  return `\n\n---\n\n**Corrections**\n\n${post.corrections.map(line).join("\n")}\n`;
}
