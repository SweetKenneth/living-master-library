/**
 * Public amendment loop for old changelog entries. History is preserved:
 * changes append a dated correction note; they are never silent rewrites.
 */

import type { LivingChangelogConfig } from "./config.ts";
import { evidenceBlock } from "./evidence.ts";
import { blocks, retiredHits, screen } from "./immune.ts";
import { demoteH1 } from "./markdown.ts";
import type { Nexus } from "./nexus.ts";
import { auditPrompt, correctionReviewPrompt } from "./prompts.ts";
import type { ChangeEvidence, ChangelogEntry, Storage } from "./ports.ts";

const textList = (v: unknown, max = 20): string[] =>
  (Array.isArray(v) ? v : typeof v === "string" ? [v] : []).filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 400)).slice(0, max);

export function mechanicalDrift(entry: ChangelogEntry, cfg: LivingChangelogConfig): string[] {
  const out: string[] = [];
  for (const hit of retiredHits(entry.body, cfg)) out.push(`retired wording "${hit.match}" → ${hit.replaceWith}`);
  if (/^#\s/m.test(entry.body)) out.push("body contains an H1");
  return out;
}

function supportsClaim(support: string, cfg: LivingChangelogConfig, evidence: ChangeEvidence[]): boolean {
  const s = support.toLowerCase().replace(/\s+/g, " ").trim();
  if (s.length < 3) return false;
  const facts = cfg.productFacts.toLowerCase().replace(/\s+/g, " ");
  if (facts.includes(s) || (s.length >= 12 && s.includes(facts.slice(0, Math.min(80, facts.length))))) return true;
  return evidence.some((e) => {
    const id = e.id.toLowerCase();
    const ext = e.external_id.toLowerCase();
    const title = e.title.toLowerCase().replace(/\s+/g, " ");
    return s.includes(id) || s.includes(ext) || (title.length >= 8 && (s.includes(title) || title.includes(s)));
  });
}

export type AuditResult = { slug: string; title: string; amended: boolean; note: string; refused?: string[] };

export async function auditOne(storage: Storage, nexus: Nexus, cfg: LivingChangelogConfig, nowMs: number): Promise<AuditResult | null> {
  const entries = await storage.listEntries(200);
  const due = entries
    // An entry must have been public for one cooldown before its first audit, and one cooldown between audits.
    .filter((e) => nowMs - Date.parse(e.published_at) >= cfg.cadence.auditCooldownHours * 3600_000)
    .filter((e) => !e.last_audited_at || nowMs - Date.parse(e.last_audited_at) >= cfg.cadence.auditCooldownHours * 3600_000)
    .sort((a, b) => Date.parse(a.last_audited_at ?? a.published_at) - Date.parse(b.last_audited_at ?? b.published_at));
  const candidate = due[0];
  if (!candidate) return null;

  const [originalEvidence, pending, used] = await Promise.all([
    storage.getEvidenceByIds(candidate.evidence_ids ?? []),
    // Newest first: "what happened since" must be the latest evidence, not the oldest 60 rows.
    storage.listEvidence("pending", 60, true),
    storage.listEvidence("used", 60, true),
  ]);
  const recent = [...pending, ...used]
    .filter((e) => !candidate.evidence_ids.includes(e.id) && Date.parse(e.occurred_at) >= Date.parse(candidate.published_at))
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
    .slice(0, 40);
  const mech = mechanicalDrift(candidate, cfg);

  const { value } = await nexus.json<{ verdict?: unknown; note?: unknown; corrections?: unknown; body?: unknown; excerpt?: unknown }>(
    [
      { role: "system", content: "You are a conservative release-note editor. Preserve history. Fix only demonstrable factual drift or wording defects." },
      { role: "user", content: auditPrompt(cfg, candidate, originalEvidence, mech, recent) },
    ],
    { verdict: "fresh" },
    { maxTokens: 2600, temperature: 0.15 },
  );

  const iso = new Date(nowMs).toISOString();
  const newBody = typeof value.body === "string" ? demoteH1(value.body.trim()) : "";
  const wantsAmend = value.verdict === "amend" || mech.length > 0;
  const substantial = newBody.length > 30 && newBody.length >= candidate.body.length * 0.45;
  if (!wantsAmend || !substantial) {
    await storage.updateEntry(candidate.id, { last_audited_at: iso });
    return { slug: candidate.slug, title: candidate.title, amended: false, note: mech.length ? `drift found but no usable amendment proposed: ${mech.join("; ")}` : "still accurate" };
  }

  const allEvidence = [...originalEvidence, ...recent];
  const antigens = screen(newBody, cfg, evidenceBlock(allEvidence));
  if (blocks(antigens)) {
    await storage.updateEntry(candidate.id, { last_audited_at: iso });
    return { slug: candidate.slug, title: candidate.title, amended: false, note: "amendment refused by deterministic safety gate", refused: antigens.filter((a) => a.severity === "block").map((a) => `${a.kind}: ${a.match}`) };
  }

  const changes = [...mech, ...textList(value.corrections)].slice(0, 20);
  const semantic = await nexus.json<{ verdict?: unknown; unsupported_claims?: unknown; evidence?: unknown; note?: unknown }>(
    [
      { role: "system", content: "You are an adversarial changelog correction skeptic. Reject unsupported amendments. Do not rewrite the entry." },
      { role: "user", content: correctionReviewPrompt(cfg, candidate, newBody, originalEvidence, recent, changes) },
    ],
    { verdict: "reject", unsupported_claims: ["correction review returned unreadable JSON"], evidence: [] },
    { maxTokens: 1200, temperature: 0 },
  );
  const unsupported = textList(semantic.value.unsupported_claims);
  const rawEvidence = Array.isArray(semantic.value.evidence) ? semantic.value.evidence : [];
  const badSupport: string[] = [];
  for (const item of rawEvidence) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const claim = typeof rec.claim === "string" ? rec.claim.trim().slice(0, 240) : "changed claim";
    const support = typeof rec.support === "string" ? rec.support.trim().slice(0, 500) : "";
    if (!supportsClaim(support, cfg, allEvidence)) badSupport.push(`unverifiable support for "${claim}": ${support || "(none)"}`);
  }
  const accepted = semantic.parsed && semantic.value.verdict === "accept" && unsupported.length === 0 && badSupport.length === 0;
  if (!accepted) {
    await storage.updateEntry(candidate.id, { last_audited_at: iso });
    const refused = [
      ...unsupported.map((x) => `unsupported change: ${x}`),
      ...badSupport,
      ...(!semantic.parsed ? ["correction skeptic returned unreadable JSON"] : []),
      ...(semantic.value.verdict !== "accept" && unsupported.length === 0 && badSupport.length === 0 ? [typeof semantic.value.note === "string" ? semantic.value.note.slice(0, 300) : "correction skeptic rejected the amendment"] : []),
    ].slice(0, 20);
    return { slug: candidate.slug, title: candidate.title, amended: false, note: "amendment refused by correction skeptic", refused };
  }

  const note = (typeof value.note === "string" && value.note.trim() ? value.note.trim() : "Corrected to match current evidence.").slice(0, 300);
  const patch: Partial<ChangelogEntry> = {
    body: newBody,
    last_audited_at: iso,
    corrections: [...(candidate.corrections ?? []), { at: iso, note, changes }],
  };
  if (typeof value.excerpt === "string" && value.excerpt.trim()) patch.excerpt = value.excerpt.trim().slice(0, 220);
  await storage.updateEntry(candidate.id, patch);
  return { slug: candidate.slug, title: candidate.title, amended: true, note };
}

export function correctionDiary(entry: Pick<ChangelogEntry, "corrections">): string {
  if (!entry.corrections?.length) return "";
  const lines = entry.corrections.map((c) => `- *Updated ${String(c.at).slice(0, 10)}:* ${String(c.note).replace(/\s+/g, " ").trim()}`);
  return `\n\n---\n\n**Corrections**\n\n${lines.join("\n")}\n`;
}
