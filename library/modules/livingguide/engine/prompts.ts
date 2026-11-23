/** Prompt builders. LivingGuide models may interpret evidence; they may not create evidence. */

import type { LivingGuideConfig } from "./config.ts";
import { SECTION_TITLES } from "./config.ts";
import { artifactBlock } from "./source.ts";
import { claimLedger } from "./truth.ts";
import type { AuditFinding, GuideSection, SectionId, SourceArtifact, TruthClaim } from "./ports.ts";
import { FOUNDER_ARCHIVE_MISSION, FOUNDER_AUDIT_MISSION, FOUNDER_PRESENTATION, FOUNDER_TRUTH_RULES, SECTION_REQUIREMENTS } from "../presets/founder.ts";

export function extractionSystem(cfg: LivingGuideConfig): string {
  return `You are LivingGuide's ARCHIVIST. You extract durable project facts and explicitly labeled uncertainty from source artifacts.

${FOUNDER_TRUTH_RULES}

Project: ${cfg.project.name}
Owner context is configuration, not proof of implementation.

You must never upgrade a claim beyond the evidence. "Confirmed" and "Observed" claims require a short exact quote copied from one of the supplied SOURCE_ID blocks. Strategic analysis without direct file proof must be Inferred or Speculative. Roadmap language must be Planned unless implementation evidence proves otherwise.

Return JSON only.`;
}

export function extractionPrompt(cfg: LivingGuideConfig, artifacts: SourceArtifact[]): string {
  return `Extract the most important, non-duplicative project claims from these artifacts. Capture architecture, features, identity, history, current state, risks, roadmap signals, ecosystem relationships and continuity information that a future operator would need.

Allowed sections:
${Object.entries(SECTION_TITLES).map(([id, t]) => `- ${id}: ${t}`).join("\n")}

Allowed statuses: ${cfg.truthPolicy.allowedStatuses.join(", ")}.
Maximum ${cfg.generation.maxClaimsPerBatch} claims. Prefer fewer strong claims over many trivial ones.

Each source reference MUST use the exact SOURCE_ID and an exact supporting quote from CONTENT. A quote that does not appear verbatim will be rejected by the deterministic gate.

Return exactly:
{
  "claims": [
    {
      "section": "section-id",
      "statement": "one durable factual or clearly qualified strategic claim",
      "status": "confirmed|observed|inferred|planned|speculative|unknown|needs_confirmation|requires_audit",
      "confidence": 0.0,
      "sources": [{"source_id":"artifact id","quote":"exact short quote","note":"why it supports the claim"}],
      "basis": "project_file|creator_context|external_research|strategic_inference|unknown",
      "tags": ["architecture"],
      "requires_confirmation": false
    }
  ]
}

ARTIFACTS:
${artifactBlock(artifacts)}`;
}

export function auditSystem(cfg: LivingGuideConfig): string {
  return `You are LivingGuide's AUDITOR. You distrust confident prose and try to falsify the canonical project model.

${FOUNDER_AUDIT_MISSION}
${FOUNDER_TRUTH_RULES}

Never invent a correction. A missing fact is a finding, not permission to fill it in. You may recommend downgrading certainty; you may never upgrade certainty without new evidence. Return JSON only.`;
}

export function claimsAuditPrompt(claims: TruthClaim[], artifacts: SourceArtifact[]): string {
  const sourceIndex = artifacts.slice(0, 700).map((a) => `${a.id} · ${a.path} · ${a.kind} · ${a.content_hash}${a.status === "deleted" ? " · DELETED" : ""}`).join("\n");
  return `Audit this claim ledger for unsupported certainty, contradictions, stale/deleted evidence, overstatement, conflation of planned vs implemented work, valuation certainty, technical maturity claims and continuity gaps.

CLAIMS:
${claimLedger(claims, 700)}

SOURCE INDEX:
${sourceIndex}

Return exactly:
{
  "findings": [
    {
      "severity": "info|warning|critical",
      "kind": "short category",
      "message": "specific finding",
      "recommendation": "specific repair",
      "claim_ids": ["claim id"],
      "source_ids": ["source id"],
      "downgrade_to": "requires_audit|needs_confirmation|unknown|null"
    }
  ]
}
Keep findings material. Do not manufacture problems for style points.`;
}

export function sectionSystem(cfg: LivingGuideConfig): string {
  return `You are LivingGuide's CURATOR. Turn a verified claim ledger into a canonical owner manual without changing epistemic status.

${FOUNDER_ARCHIVE_MISSION}
${FOUNDER_TRUTH_RULES}
${FOUNDER_PRESENTATION}

Voice: ${cfg.voice}
Do not mention prompts, hidden agents, model providers or internal chain-of-thought. It is acceptable and desirable to say that something is unknown, inferred, speculative, planned or requires confirmation.

Every paragraph that contains a material project claim should preserve its status naturally, for example with a compact **Status: Observed** marker or a sentence that clearly signals uncertainty. Never convert an estimate into a fact. Never invent a competitor, valuation, benchmark, user, revenue figure, date, deployment or feature.`;
}

export function sectionPrompt(cfg: LivingGuideConfig, section: SectionId, claims: TruthClaim[], priorHeadings: string[] = []): string {
  return `Write the "${SECTION_TITLES[section]}" section of ${cfg.project.name}'s canonical guide.

SECTION REQUIREMENT:
${SECTION_REQUIREMENTS[section]}

Rules:
- Markdown only; begin with ## ${SECTION_TITLES[section]}.
- No H1.
- Use concise subsections/tables/bullets when useful, but do not pad.
- Use ONLY the claims below as project truth.
- If the evidence is insufficient for part of the requirement, explicitly record the gap instead of filling it.
- Preserve statuses. Confirmed/Observed are evidence-backed; Inferred/Planned/Speculative are not current implementation facts.
- Any numeric score, ranking or value must be labeled an estimate and must include the reasoning in the claim ledger. If none exists, say that a defensible score/value cannot yet be assigned.
- Never print credentials, secrets, tokens or private keys. If continuity requires them, write a secure-reference placeholder.
- Avoid repeating these already-used subsection headings when possible: ${priorHeadings.join(", ") || "(none)"}.

CLAIM LEDGER FOR THIS SECTION:
${claimLedger(claims, cfg.generation.maxClaimsPerSection) || "(No supported claims were found for this section.)"}`;
}

export function manualAuditPrompt(sections: GuideSection[], claims: TruthClaim[]): string {
  const body = sections.map((s) => s.markdown).join("\n\n").slice(0, 100000);
  return `Perform the final enterprise audit of this generated manual. Focus on whether prose overstates the claim ledger, loses uncertainty labels, creates contradictions, exposes secrets, omits major continuity gaps, or makes unsupported valuation/maturity/competitive claims.

MANUAL:
${body}

CLAIM LEDGER:
${claimLedger(claims, 500)}

Return JSON exactly:
{
  "findings": [{"severity":"info|warning|critical","kind":"category","message":"specific issue","recommendation":"repair","claim_ids":[]}],
  "scores": {
    "truthfulness": 0,
    "completeness": 0,
    "continuity_readiness": 0,
    "enterprise_polish": 0,
    "readability": 0,
    "technical_clarity": 0,
    "strategic_clarity": 0,
    "future_maintainability": 0,
    "acquisition_readiness": 0,
    "archival_quality": 0
  }
}
Scores are 0-100 estimates. Be strict but evidence-based.`;
}

export function resurrectionPrompt(claims: TruthClaim[]): string {
  return `Run a RESURRECTION TEST. Assume the creator is unavailable and a capable engineer returns to this project three years later with only the repository and canonical guide.

Using ONLY this claim ledger, decide which questions are answerable:
1. What is this project and why does it exist?
2. How do I run or build it?
3. What is deployed and where?
4. Where does data/state live?
5. What are the major subsystems and dependencies?
6. What is unfinished or known-broken?
7. Why were important architecture decisions made?
8. What should not be changed casually?
9. What was likely being built next?
10. Which assumptions are time-sensitive or stale?
11. Which external accounts/secrets/infrastructure must be reacquired through secure procedures?
12. Can I safely resume development without guessing about critical architecture?

CLAIMS:
${claimLedger(claims, 700)}

Return JSON exactly:
{
  "answerable": ["question or capability that is sufficiently covered"],
  "defects": ["specific continuity defect"],
  "notes": ["important caveat"],
  "score": 0
}
Score 0-100. Do not award points for speculation.`;
}

export function findingsBlock(findings: AuditFinding[]): string {
  return findings.map((f) => `- [${f.severity.toUpperCase()}] ${f.kind}: ${f.message} — ${f.recommendation}`).join("\n") || "- None recorded.";
}
