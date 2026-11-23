/** Forensic truth/completeness audit. Deterministic checks cannot be waived by the model. */

import type { LivingGuideConfig } from "./config.ts";
import { sectionsForPreset } from "./config.ts";
import type { AuditFinding, AuditSummary, CanonicalGuide, GuideSection, SourceArtifact, TruthClaim } from "./ports.ts";
import { obviousContradictions, sourceSupportsQuote } from "./truth.ts";

const LEAKAGE = /\b(?:as an ai\b|as a (?:large )?language model\b|here is (?:the|your) (?:final |updated |revised )?(?:manual|guide|draft)\b|certainly!|i hope this helps\b|let me know if you(?:'d| would) like)\b/i;
const SECRET = /\b(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:password|passwd|api[_ -]?key|secret|token)\s*[:=]\s*["']?[A-Za-z0-9_\-./+=]{16,})/i;
const CERTAINTY = /\b(?:definitely|guaranteed|proven market|production[- ]ready|enterprise[- ]ready|industry[- ]leading|unmatched|unparalleled)\b/i;

export type RawModelFinding = {
  severity?: string; kind?: string; message?: string; recommendation?: string;
  claim_ids?: string[]; source_ids?: string[]; downgrade_to?: string | null;
};

const sev = (x: unknown): "info" | "warning" | "critical" => x === "critical" ? "critical" : x === "info" ? "info" : "warning";

export function normalizeModelFindings(raw: RawModelFinding[], nowMs: number): Omit<AuditFinding, "id">[] {
  const at = new Date(nowMs).toISOString();
  return (Array.isArray(raw) ? raw : []).slice(0, 80).map((f) => ({
    at,
    severity: sev(f.severity),
    kind: String(f.kind ?? "model-audit").slice(0, 100),
    message: String(f.message ?? "Unspecified audit finding").trim().slice(0, 1400),
    recommendation: String(f.recommendation ?? "Review manually.").trim().slice(0, 1200),
    claim_ids: [...new Set((f.claim_ids ?? []).map(String))].slice(0, 30),
    source_ids: [...new Set((f.source_ids ?? []).map(String))].slice(0, 30),
    status: "open",
    metadata: f.downgrade_to ? { downgrade_to: f.downgrade_to } : {},
  }));
}

export function deterministicClaimAudit(claims: TruthClaim[], artifacts: SourceArtifact[], cfg: LivingGuideConfig, nowMs: number): Omit<AuditFinding, "id">[] {
  const at = new Date(nowMs).toISOString();
  const byId = new Map(artifacts.map((a) => [a.id, a]));
  const out: Omit<AuditFinding, "id">[] = [];
  const add = (severity: "info" | "warning" | "critical", kind: string, message: string, recommendation: string, claimIds: string[] = [], sourceIds: string[] = []) => out.push({ at, severity, kind, message, recommendation, claim_ids: claimIds, source_ids: sourceIds, status: "open", metadata: {} });

  for (const c of claims) {
    if ((c.status === "confirmed" || c.status === "observed") && !c.sources.length) add("critical", "unsupported-certainty", `Claim is ${c.status} but has no verified source: ${c.statement}`, "Downgrade it or attach direct evidence.", [c.id]);
    if (c.status === "confirmed" && c.confidence < cfg.truthPolicy.confirmedMinConfidence) add("warning", "confidence-mismatch", `Confirmed claim is below the configured confidence floor (${c.confidence.toFixed(2)}).`, "Downgrade to Observed or re-verify evidence.", [c.id]);
    if (c.stale) add("warning", "stale-claim", `Claim depends on changed or removed evidence: ${c.statement}`, "Re-audit before treating it as current truth.", [c.id]);
    for (const ref of c.sources) {
      const a = byId.get(ref.source_id);
      if (!a) add("critical", "orphan-source", `Claim references missing source ${ref.source_id}.`, "Restore source provenance or downgrade the claim.", [c.id], [ref.source_id]);
      else if (a.status === "deleted") add("warning", "deleted-source", `Claim relies on a deleted source (${a.path}).`, "Determine whether the claim is historical, obsolete, or still supported elsewhere.", [c.id], [a.id]);
      else if (!sourceSupportsQuote(a, ref.quote)) add("critical", "bad-quote", `Stored evidence quote no longer exists in ${a.path}.`, "Re-extract this claim from current evidence.", [c.id], [a.id]);
    }
  }

  for (const [a, b] of obviousContradictions(claims)) add("warning", "contradiction", `Potential contradiction between claims: “${a.statement}” / “${b.statement}”`, "Resolve the conflict or preserve both with dated/historical context.", [a.id, b.id]);

  const required = sectionsForPreset(cfg);
  for (const s of required) if (!claims.some((c) => c.section === s)) add("info", "coverage-gap", `No claims currently support the ${s} section.`, "Add source material or explicitly preserve the section as an unknown/gap.");
  return out;
}

export function deterministicManualAudit(sections: GuideSection[], cfg: LivingGuideConfig, nowMs: number): Omit<AuditFinding, "id">[] {
  const at = new Date(nowMs).toISOString();
  const out: Omit<AuditFinding, "id">[] = [];
  const add = (severity: "info" | "warning" | "critical", kind: string, message: string, recommendation: string) => out.push({ at, severity, kind, message, recommendation, claim_ids: [], source_ids: [], status: "open", metadata: {} });
  const body = sections.map((s) => s.markdown).join("\n\n");
  const leak = body.match(LEAKAGE); if (leak) add("critical", "assistant-leakage", `Generated guide contains assistant/meta phrasing: ${leak[0]}`, "Regenerate the affected section without model/meta language.");
  const secret = body.match(SECRET); if (secret) add("critical", "secret-exposure", "Generated guide appears to contain a credential, token, password or private key.", "Remove it immediately and replace it with a secure-reference placeholder.");
  const certainty = body.match(CERTAINTY); if (certainty) add("warning", "overconfident-language", `Potentially unsupported certainty language: ${certainty[0]}`, "Verify the phrase is backed by evidence or rewrite with explicit status/uncertainty.");
  if (cfg.generation.includeUnknowns && !/unknown|requires (?:creator )?confirmation|requires (?:further )?audit/i.test(body)) add("warning", "uncertainty-missing", "The guide contains no visible unknown/confirmation/audit language despite uncertainty preservation being enabled.", "Ensure gaps remain visible instead of being smoothed over.");
  return out;
}

export function scoreAudit(claims: TruthClaim[], findings: Array<Pick<AuditFinding, "severity" | "kind">>, sectionCount: number, requiredSectionCount: number, continuityScore: number, model?: Partial<AuditSummary>): AuditSummary {
  const critical = findings.filter((f) => f.severity === "critical").length;
  const warning = findings.filter((f) => f.severity === "warning").length;
  const truth = Math.max(0, 100 - critical * 18 - warning * 3 - claims.filter((c) => c.stale).length * 2);
  const complete = requiredSectionCount ? Math.round((sectionCount / requiredSectionCount) * 100) : 0;
  const pick = (k: keyof AuditSummary, fallback: number) => Math.max(0, Math.min(100, Math.round(Number(model?.[k] ?? fallback))));
  return {
    truthfulness: Math.min(truth, pick("truthfulness", truth)),
    completeness: Math.min(complete, pick("completeness", complete)),
    continuity_readiness: Math.min(continuityScore, pick("continuity_readiness", continuityScore)),
    enterprise_polish: pick("enterprise_polish", 80),
    readability: pick("readability", 85),
    technical_clarity: pick("technical_clarity", complete),
    strategic_clarity: pick("strategic_clarity", complete),
    future_maintainability: pick("future_maintainability", Math.round((truth + continuityScore) / 2)),
    acquisition_readiness: pick("acquisition_readiness", Math.round((truth + complete) / 2)),
    archival_quality: pick("archival_quality", Math.round((truth + complete + continuityScore) / 3)),
  };
}

export function guideAuditMarkdown(guide: CanonicalGuide, findings: AuditFinding[]): string {
  const s = guide.audit_summary;
  const open = findings.filter((f) => f.status === "open");
  const by = (severity: string) => open.filter((f) => f.severity === severity);
  return `# ${guide.title} — Audit Report\n\nGenerated: ${guide.generated_at}\n\n## Audit Summary\n\n- Critical findings: ${by("critical").length}\n- Warnings: ${by("warning").length}\n- Informational findings: ${by("info").length}\n\n## Quality Assessment\n\n| Dimension | Score |\n|---|---:|\n${Object.entries(s).map(([k, v]) => `| ${k.replace(/_/g, " ")} | ${v}/100 |`).join("\n")}\n\n## Findings\n\n${open.length ? open.map((f) => `### ${f.severity.toUpperCase()} — ${f.kind}\n\n${f.message}\n\n**Recommended repair:** ${f.recommendation}`).join("\n\n") : "No open findings."}\n`;
}
