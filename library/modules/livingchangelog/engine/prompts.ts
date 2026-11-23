/** Prompt builders. Evidence is quoted as the only change-level truth. */

import type { LivingChangelogConfig } from "./config.ts";
import { evidenceBlock } from "./evidence.ts";
import type { ChangeEvidence, ChangelogEntry } from "./ports.ts";

export function voiceSystem(cfg: LivingChangelogConfig, avoid: string[] = []): string {
  return `You maintain ${cfg.site.name}'s public changelog, "${cfg.site.changelogName}".
Reader: ${cfg.audience}. They want to know what changed and what it means, fast.

Voice: ${cfg.voice}
${avoid.length ? `Avoid opening entries with: ${avoid.map((x) => `"${x}…"`).join(", ")}.` : ""}

Format: Markdown. No H1. Use ## category headings only when useful. Prefer short bullets over essays.
Never mention prompts, models, AI, internal review, or hidden evidence IDs.

Stable product facts you may rely on:
${cfg.productFacts}

Never claim:
${cfg.neverClaim.map((x) => `- ${x}`).join("\n")}

Critical shipping rule: ${shippingRule(cfg)}`.trim();
}

export function shippingRule(cfg: LivingChangelogConfig): string {
  const branch = cfg.sourcePolicy.productionBranch;
  if (cfg.sourcePolicy.shippingPolicy === "explicit-only") return "A commit or merged pull request does NOT prove a change is live. Only release, deployment, or explicit manual-live evidence proves shipping.";
  if (cfg.sourcePolicy.shippingPolicy === "merge-to-production-is-live") return `A merged pull request to ${branch} may be treated as live; other branches may not.`;
  return `A commit observed on ${branch} may be treated as live; commits on other branches may not.`;
}

export function triagePrompt(cfg: LivingChangelogConfig, evidence: ChangeEvidence[], recent: ChangelogEntry[]): string {
  return `Decide whether the pending evidence deserves a public changelog entry NOW.

Do not reward activity. Reward meaningful, externally useful change. Internal chores, dependency bumps, refactors with no stated user effect, tests, formatting, and vague commits should normally be ignored or held.
A minor change can be HELD so it can bundle with related work later. IGNORE means it should never appear publicly.
Do not infer that code is deployed beyond this rule: ${shippingRule(cfg)}

Allowed public categories: ${cfg.categories.join(", ")}.
Developer-only entries are ${cfg.sourcePolicy.publishDeveloperOnly ? "allowed" : "disabled"}.
Pick at most ${cfg.sourcePolicy.maxEvidencePerEntry} evidence items for one coherent entry. If you select a PR/commit/issue alongside release/deployment proof, the evidence must actually connect them (same production branch after the merge, matching SHA/ref/PR number, or release notes that name the change). An unrelated deployment is not proof.

Recent published entries (avoid repeating them):
${recent.slice(0, 12).map((e) => `- ${e.published_at.slice(0, 10)} · ${e.title}`).join("\n") || "- (none)"}

PENDING EVIDENCE:
${evidenceBlock(evidence)}

Return JSON exactly:
{
  "decision": "publish" | "hold" | "ignore",
  "reason": "plain explanation",
  "selected_ids": ["evidence id"],
  "ignored_ids": ["evidence id"],
  "title": "descriptive release-note title",
  "version": "version/tag if explicitly evidenced, otherwise null",
  "categories": ["added" | "improved" | "fixed" | "changed" | "removed" | "security" | "developer"],
  "audience": ["who is affected"],
  "role": "update" | "release"
}

If no selected item is worth publishing, decision must be hold or ignore.`;
}

export function draftPrompt(cfg: LivingChangelogConfig, plan: { title: string; version: string | null; categories: string[]; audience: string[]; role: string }, evidence: ChangeEvidence[]): string {
  return `Write the changelog entry from ONLY the evidence below plus the stable product facts.

Planned title: ${plan.title}
Version/tag: ${plan.version ?? "none"}
Categories: ${plan.categories.join(", ")}
Affected audience: ${plan.audience.join(", ") || "unspecified"}
Entry type: ${plan.role}
Target length: ${plan.role === "release" ? `${cfg.wordTargets.release.min}-${cfg.wordTargets.release.max}` : `${cfg.wordTargets.update.min}-${cfg.wordTargets.update.max}`} words.

Rules:
- Lead with what changed for the user, not implementation trivia.
- Every factual change claim must be directly supported by evidence below.
- Never claim live/shipped/available unless the evidence satisfies the shipping rule.
- Do not invent motivation, performance gains, rollout percentages, compatibility, dates, or scope.
- If evidence only proves an internal change, do not translate it into a user benefit.
- Use only these headings if needed: Added, Improved, Fixed, Changed, Removed, Security, Developer.
- No H1 and no generic introduction such as "We're excited to announce".
- Do not print evidence IDs.

EVIDENCE:
${evidenceBlock(evidence)}`;
}

export function reviewSystem(cfg: LivingChangelogConfig): string {
  return `You are two independent changelog reviewers in one JSON response.
READER asks: is this useful, specific and appropriately concise?
SKEPTIC asks: is every claim actually proven by the supplied evidence and stable product facts?
The skeptic must be harsher than the writer. A merged PR is not a deployment unless the shipping policy says so.
Shipping rule: ${shippingRule(cfg)}
Return JSON only.`;
}

export function reviewPrompt(title: string, body: string, evidence: ChangeEvidence[], antigens: string[]): string {
  return `Review this proposed changelog entry against the exact evidence.

TITLE: ${title}
BODY:
${body}

EVIDENCE:
${evidenceBlock(evidence)}

CODE-GATE FINDINGS:
${antigens.length ? antigens.map((x) => `- ${x}`).join("\n") : "- none"}

Return JSON:
{
  "reader_score": 0-100,
  "skeptic_score": 0-100,
  "verdict": "publish" | "revise" | "silence",
  "unsupported_claims": ["claim not established by evidence"],
  "inflated_claims": ["claim whose wording exceeds evidence"],
  "caveats": ["important limitation worth displaying"],
  "epistemic_status": "established" | "inference" | "contested",
  "excerpt": "<= 200 chars",
  "title": "same title or a sharper non-hype title",
  "revision_note": "specific repair instruction"
}`;
}

export function revisePrompt(body: string, note: string, unsupported: string[], inflated: string[], antigens: string[]): string {
  return `Revise this changelog entry once. Make the smallest changes needed. Do not add new claims.

CURRENT:
${body}

REVIEW NOTE: ${note || "tighten and ground the copy"}
UNSUPPORTED: ${unsupported.join(" | ") || "none"}
INFLATED: ${inflated.join(" | ") || "none"}
CODE FINDINGS: ${antigens.join(" | ") || "none"}

Return Markdown only. No H1.`;
}

export function auditPrompt(cfg: LivingChangelogConfig, entry: ChangelogEntry, evidence: ChangeEvidence[], mechanical: string[], recentEvidence: ChangeEvidence[]): string {
  return `Audit one OLD changelog entry. Changelog history should not be silently rewritten, but factual errors, stale scope, broken wording, and later reversals must be corrected publicly.

ORIGINAL TITLE: ${entry.title}
ORIGINAL BODY:
${entry.body}

ORIGINAL EVIDENCE:
${evidenceBlock(evidence)}

RECENT EVIDENCE THAT MAY AFFECT THIS OLD CLAIM:
${evidenceBlock(recentEvidence.slice(0, 25)) || "(none)"}

CURRENT PRODUCT FACTS:
${cfg.productFacts}

MECHANICAL DRIFT:
${mechanical.join("\n") || "none"}

Return JSON:
{
  "verdict": "fresh" | "amend",
  "note": "public correction note",
  "corrections": ["what changed"],
  "body": "complete corrected Markdown body if amend",
  "excerpt": "corrected excerpt if needed"
}

Do not erase history just because a feature was later removed. If an old entry was true when published, usually keep the historical statement and add a correction note only when current wording falsely implies continued availability.`;
}

export function correctionReviewPrompt(cfg: LivingChangelogConfig, original: ChangelogEntry, proposedBody: string, originalEvidence: ChangeEvidence[], recentEvidence: ChangeEvidence[], changes: string[]): string {
  return `You are an adversarial correction skeptic. The editor proposed changing an old changelog entry. Reject any amendment that introduces a factual claim unsupported by the evidence or current product facts.

ORIGINAL:
${original.body}

PROPOSED:
${proposedBody}

ORIGINAL EVIDENCE:
${evidenceBlock(originalEvidence)}

RECENT EVIDENCE:
${evidenceBlock(recentEvidence.slice(0, 25))}

CURRENT PRODUCT FACTS:
${cfg.productFacts}

CLAIMED CHANGES:
${changes.map((x) => `- ${x}`).join("\n") || "- none"}

Return JSON:
{
  "verdict": "accept" | "reject",
  "unsupported_claims": ["unsupported introduced/changed claim"],
  "evidence": [{"claim":"changed claim","support":"exact quote or evidence id/title that supports it"}],
  "note": "short reason"
}`;
}
