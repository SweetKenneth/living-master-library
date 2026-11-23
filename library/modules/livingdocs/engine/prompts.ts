/** Prompt builders. LivingDocs may interpret implementation evidence; it may not invent implementation. */

import type { LivingDocsConfig } from "./config.ts";
import { SECTION_TITLES } from "./config.ts";
import { artifactBlock } from "./source.ts";
import { claimLedger } from "./truth.ts";
import type { GuideSection, SectionId, SourceArtifact, TruthClaim } from "./ports.ts";
import { DOCS_AUDIT_MISSION, DOCS_MISSION, DOCS_PRESENTATION, DOCS_TRUTH_RULES, SECTION_REQUIREMENTS } from "../presets/docs.ts";

export function extractionSystem(cfg: LivingDocsConfig): string {
  return `You are LivingDocs' EVIDENCE READER. You extract durable documentation claims from source artifacts.

${DOCS_TRUTH_RULES}

Project: ${cfg.project.name}

Tag behavior claims precisely using tags such as api, cli, config, default, runtime, schema, example, security, operation, limitation, history. Existing prose documentation is evidence of what was documented; code/tests/config/schema are evidence of implementation behavior.

Return JSON only.`;
}

export function extractionPrompt(cfg: LivingDocsConfig, artifacts: SourceArtifact[]): string {
  return `Extract the most important non-duplicative claims needed to document this project correctly.

Allowed sections:
${Object.entries(SECTION_TITLES).map(([id, t]) => `- ${id}: ${t}`).join("\n")}

Allowed statuses: ${cfg.truthPolicy.allowedStatuses.join(", ")}.
Maximum ${cfg.generation.maxClaimsPerBatch} claims. Prefer interface behavior, configuration, schemas, commands, operational behavior, invariants, limitations and examples over incidental implementation details.

Each source reference MUST use an exact SOURCE_ID and an exact quote copied from CONTENT. Quotes that do not exist verbatim will be rejected.

Return exactly:
{
  "claims": [
    {
      "section": "section-id",
      "statement": "one durable documentation claim",
      "status": "confirmed|observed|inferred|planned|speculative|unknown|needs_confirmation|requires_audit",
      "confidence": 0.0,
      "sources": [{"source_id":"artifact id","quote":"exact short quote","note":"what this evidence establishes"}],
      "basis": "implementation|documentation|test|configuration|schema|creator_context|external_research|inference|unknown",
      "tags": ["api"],
      "requires_confirmation": false
    }
  ]
}

ARTIFACTS:
${artifactBlock(artifacts)}`;
}

export function auditSystem(_cfg: LivingDocsConfig): string {
  return `You are LivingDocs' DRIFT AUDITOR. Your job is to prove the documentation wrong before a user has to.

${DOCS_AUDIT_MISSION}
${DOCS_TRUTH_RULES}

Never invent a correction. Missing implementation evidence means "needs verification", not permission to fill in a plausible answer. Return JSON only.`;
}

export function claimsAuditPrompt(claims: TruthClaim[], artifacts: SourceArtifact[]): string {
  const sourceIndex = artifacts.slice(0, 900).map((a) => `${a.id} · ${a.path} · ${a.kind} · ${a.content_hash}${a.status === "deleted" ? " · DELETED" : ""}`).join("\n");
  return `Audit this documentation truth ledger for drift and unsupported behavior claims.

Explicitly look for:
- behavior claims supported only by documentation prose
- stale/deleted implementation evidence
- contradictory defaults, commands, routes, field names or runtime behavior
- planned/TODO work presented as current
- missing security caveats
- examples that appear unsupported
- undocumented behavior signals that deserve documentation coverage

CLAIMS:
${claimLedger(claims, 900)}

SOURCE INDEX:
${sourceIndex}

Return exactly:
{
  "findings": [
    {
      "severity": "info|warning|critical",
      "kind": "short category",
      "message": "specific drift or gap",
      "recommendation": "specific repair",
      "claim_ids": ["claim id"],
      "source_ids": ["source id"],
      "downgrade_to": "requires_audit|needs_confirmation|unknown|null"
    }
  ]
}
Do not manufacture findings for style points.`;
}

export function sectionSystem(cfg: LivingDocsConfig): string {
  return `You are LivingDocs' CURATOR. Turn a verified documentation truth ledger into first-party documentation without changing epistemic status.

${DOCS_MISSION}
${DOCS_TRUTH_RULES}
${DOCS_PRESENTATION}

Voice: ${cfg.voice}
Do not mention prompts, hidden agents, model providers or chain-of-thought. Never write commands, flags, API routes, configuration values, defaults, compatibility promises, or examples unless the claim ledger supports them. Preserve uncertainty visibly when necessary.`;
}

export function sectionPrompt(cfg: LivingDocsConfig, section: SectionId, claims: TruthClaim[], priorHeadings: string[] = []): string {
  return `Write the "${SECTION_TITLES[section]}" section of ${cfg.project.name}'s maintained documentation.

SECTION REQUIREMENT:
${SECTION_REQUIREMENTS[section]}

Rules:
- Markdown only; begin with ## ${SECTION_TITLES[section]}.
- No H1.
- Use only the claims below as project truth.
- Prefer concise prose, tables and code blocks when evidence supports them.
- Do not fabricate code examples. When an example is not sufficiently evidenced, state the gap instead.
- Existing documentation-only claims about behavior must remain visibly unverified until implementation evidence exists.
- Planned/speculative behavior must not read as current behavior.
- Do not expose secrets; use placeholders such as <YOUR_API_KEY> only when the existence/purpose of the value is supported.
- Avoid repeating these subsection headings when possible: ${priorHeadings.join(", ") || "(none)"}.

CLAIM LEDGER FOR THIS SECTION:
${claimLedger(claims, cfg.generation.maxClaimsPerSection) || "(No supported claims were found for this section.)"}`;
}

export function manualAuditPrompt(sections: GuideSection[], claims: TruthClaim[]): string {
  const body = sections.map((s) => s.markdown).join("\n\n").slice(0, 120000);
  return `Perform a final documentation drift audit. Compare the rendered docs against the claim ledger.

Look for unsupported commands, routes, fields, defaults, environment variables, examples, operational promises, compatibility statements, secret leakage, or text that turns uncertainty into implementation fact.

DOCUMENTATION:
${body}

CLAIM LEDGER:
${claimLedger(claims, 700)}

Return JSON exactly:
{
  "findings": [{"severity":"info|warning|critical","kind":"category","message":"specific issue","recommendation":"repair","claim_ids":[]}],
  "scores": {
    "truthfulness": 0,
    "coverage": 0,
    "implementation_alignment": 0,
    "example_reliability": 0,
    "configuration_accuracy": 0,
    "api_accuracy": 0,
    "operational_clarity": 0,
    "security_hygiene": 0,
    "readability": 0,
    "maintainability": 0
  }
}
Scores are strict 0-100 estimates.`;
}

export function verificationPrompt(claims: TruthClaim[]): string {
  return `Run a DOCUMENTATION VERIFICATION TEST. Assume a new engineer has only these docs and the current repository.

Using ONLY the claim ledger, determine whether they can safely answer:
1. What does the project do?
2. How is it installed and started?
3. Which configuration values exist and what are their defaults?
4. Which CLI commands and flags actually exist?
5. Which API interfaces actually exist?
6. Where does persistent state live?
7. What are the major architecture boundaries?
8. Which examples are backed by current interfaces?
9. What operational/recovery behavior is documented?
10. What security-sensitive behavior is documented safely?
11. Which known limitations and unsupported cases are visible?
12. Which claims are stale, contradictory or still require verification?

CLAIMS:
${claimLedger(claims, 900)}

Return JSON exactly:
{
  "answerable": ["verified area"],
  "defects": ["specific documentation defect"],
  "notes": ["important caveat"],
  "score": 0
}
Do not award points for speculation or documentation-only behavior claims.`;
}
