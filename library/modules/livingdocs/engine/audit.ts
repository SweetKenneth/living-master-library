/** Forensic documentation drift audit. Deterministic checks cannot be waived by the model. */

import type { LivingDocsConfig } from "./config.ts";
import { sectionsForPreset } from "./config.ts";
import type { AuditFinding, AuditSummary, CanonicalGuide, GuideSection, SourceArtifact, TruthClaim } from "./ports.ts";
import { obviousContradictions, sourceSupportsQuote } from "./truth.ts";

const LEAKAGE = /\b(?:as an ai\b|as a (?:large )?language model\b|here is (?:the|your) (?:final |updated |revised )?(?:documentation|docs|draft)\b|certainly!|i hope this helps\b|let me know if you(?:'d| would) like)\b/i;
const SECRET = /\b(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:password|passwd|api[_ -]?key|secret|token)\s*[:=]\s*["']?[A-Za-z0-9_\-./+=]{16,})/i;
const UNSUPPORTED_PROMISE = /\b(?:guaranteed|always works|fully compatible|production[- ]ready|zero downtime|never fails|100% compatible)\b/i;
const BEHAVIOR_TAGS = new Set(["behavior", "api", "cli", "config", "default", "runtime", "operation", "example"]);

export type RawModelFinding = { severity?: string; kind?: string; message?: string; recommendation?: string; claim_ids?: string[]; source_ids?: string[]; downgrade_to?: string | null };
const sev = (x: unknown): "info" | "warning" | "critical" => x === "critical" ? "critical" : x === "info" ? "info" : "warning";

export function normalizeModelFindings(raw: RawModelFinding[], nowMs: number): Omit<AuditFinding, "id">[] {
  const at = new Date(nowMs).toISOString();
  return (Array.isArray(raw) ? raw : []).slice(0, 100).map((f) => ({
    at, severity: sev(f.severity), kind: String(f.kind ?? "model-audit").slice(0, 100), message: String(f.message ?? "Unspecified audit finding").trim().slice(0, 1600), recommendation: String(f.recommendation ?? "Review manually.").trim().slice(0, 1200), claim_ids: [...new Set((f.claim_ids ?? []).map(String))].slice(0, 40), source_ids: [...new Set((f.source_ids ?? []).map(String))].slice(0, 40), status: "open", metadata: f.downgrade_to ? { downgrade_to: f.downgrade_to } : {},
  }));
}

export function deterministicClaimAudit(claims: TruthClaim[], artifacts: SourceArtifact[], cfg: LivingDocsConfig, nowMs: number): Omit<AuditFinding, "id">[] {
  const at = new Date(nowMs).toISOString();
  const byId = new Map(artifacts.map((a) => [a.id, a]));
  const out: Omit<AuditFinding, "id">[] = [];
  const add = (severity: "info" | "warning" | "critical", kind: string, message: string, recommendation: string, claimIds: string[] = [], sourceIds: string[] = []) => out.push({ at, severity, kind, message, recommendation, claim_ids: claimIds, source_ids: sourceIds, status: "open", metadata: {} });

  for (const c of claims) {
    if ((c.status === "confirmed" || c.status === "observed") && !c.sources.length) add("critical", "unsupported-certainty", `Claim is ${c.status} but has no verified source: ${c.statement}`, "Downgrade it or attach direct evidence.", [c.id]);
    if (c.status === "confirmed" && c.confidence < cfg.truthPolicy.verifiedMinConfidence) add("warning", "confidence-mismatch", `Confirmed documentation claim is below the configured confidence floor (${c.confidence.toFixed(2)}).`, "Downgrade or re-verify against implementation evidence.", [c.id]);
    if (c.stale) add("warning", "stale-documentation-claim", `Claim depends on changed or removed evidence: ${c.statement}`, "Reconcile the affected documentation before publishing it as current.", [c.id]);
    const behavior = c.tags.some((t) => BEHAVIOR_TAGS.has(t));
    const refs = c.sources.map((s) => byId.get(s.source_id)).filter(Boolean) as SourceArtifact[];
    if (behavior && c.status === "confirmed" && refs.length && refs.every((a) => a.kind === "documentation")) add("critical", "docs-circular-proof", `Current behavior is marked Confirmed but is supported only by documentation prose: ${c.statement}`, "Verify it against code, tests, configuration, schema, or another executable interface.", [c.id], refs.map((a) => a.id));
    for (const ref of c.sources) {
      const a = byId.get(ref.source_id);
      if (!a) add("critical", "orphan-source", `Claim references missing source ${ref.source_id}.`, "Restore provenance or downgrade the claim.", [c.id], [ref.source_id]);
      else if (a.status === "deleted") add("warning", "deleted-source", `Claim relies on deleted source ${a.path}.`, "Determine whether the docs are obsolete or still supported elsewhere.", [c.id], [a.id]);
      else if (!sourceSupportsQuote(a, ref.quote)) add("critical", "bad-quote", `Stored evidence quote no longer exists in ${a.path}.`, "Re-extract from current evidence.", [c.id], [a.id]);
    }
  }
  for (const [a, b] of obviousContradictions(claims)) add("warning", "contradiction", `Potential contradictory documentation claims: “${a.statement}” / “${b.statement}”`, "Resolve which behavior is current or preserve versioned context.", [a.id, b.id]);
  for (const s of sectionsForPreset(cfg)) if (!claims.some((c) => c.section === s)) add("info", "coverage-gap", `No claims currently support the ${s} documentation section.`, "Add evidence or keep the gap explicit.");
  return out;
}

export function deterministicManualAudit(sections: GuideSection[], _cfg: LivingDocsConfig, nowMs: number): Omit<AuditFinding, "id">[] {
  const at = new Date(nowMs).toISOString(); const out: Omit<AuditFinding, "id">[] = [];
  const add = (severity: "info" | "warning" | "critical", kind: string, message: string, recommendation: string) => out.push({ at, severity, kind, message, recommendation, claim_ids: [], source_ids: [], status: "open", metadata: {} });
  const body = sections.map((s) => s.markdown).join("\n\n");
  const leak = body.match(LEAKAGE); if (leak) add("critical", "assistant-leakage", `Generated docs contain assistant/meta phrasing: ${leak[0]}`, "Regenerate without model/meta language.");
  const secret = body.match(SECRET); if (secret) add("critical", "secret-exposure", "Generated docs appear to contain a credential, token, password or private key.", "Remove immediately and replace with a safe placeholder/reference.");
  const promise = body.match(UNSUPPORTED_PROMISE); if (promise) add("warning", "unsupported-promise", `Potentially unsafe documentation promise: ${promise[0]}`, "Replace with evidence-backed behavior and scoped compatibility language.");
  return out;
}

export function scoreAudit(claims: TruthClaim[], findings: Array<Pick<AuditFinding, "severity" | "kind">>, sectionCount: number, requiredSectionCount: number, verificationScore: number, model?: Partial<AuditSummary>): AuditSummary {
  const critical = findings.filter((f) => f.severity === "critical").length;
  const warning = findings.filter((f) => f.severity === "warning").length;
  const truth = Math.max(0, 100 - critical * 18 - warning * 3 - claims.filter((c) => c.stale).length * 2);
  const coverage = requiredSectionCount ? Math.round((sectionCount / requiredSectionCount) * 100) : 0;
  const apiClaims = claims.filter((c) => c.section === "api-reference");
  const cliClaims = claims.filter((c) => c.section === "cli-reference");
  const cfgClaims = claims.filter((c) => c.section === "configuration");
  const supported = (xs: TruthClaim[]) => xs.length ? Math.round(xs.filter((c) => !c.stale && ["confirmed", "observed"].includes(c.status) && c.basis !== "documentation").length / xs.length * 100) : coverage;
  const pick = (k: keyof AuditSummary, fallback: number) => Math.max(0, Math.min(100, Math.round(Number(model?.[k] ?? fallback))));
  return {
    truthfulness: Math.min(truth, pick("truthfulness", truth)),
    coverage: Math.min(coverage, pick("coverage", coverage)),
    implementation_alignment: Math.min(verificationScore, pick("implementation_alignment", verificationScore)),
    example_reliability: pick("example_reliability", Math.min(truth, verificationScore)),
    configuration_accuracy: Math.min(supported(cfgClaims), pick("configuration_accuracy", supported(cfgClaims))),
    api_accuracy: Math.min(supported(apiClaims), pick("api_accuracy", supported(apiClaims))),
    operational_clarity: pick("operational_clarity", coverage),
    security_hygiene: pick("security_hygiene", truth),
    readability: pick("readability", 86),
    maintainability: pick("maintainability", Math.round((truth + coverage + verificationScore) / 3)),
  };
}

export function guideAuditMarkdown(guide: CanonicalGuide, findings: AuditFinding[]): string {
  const open = findings.filter((f) => f.status === "open");
  return `# ${guide.title} — Drift Audit\n\nGenerated: ${guide.generated_at}\n\n## Findings\n\n- Critical: ${open.filter((f) => f.severity === "critical").length}\n- Warnings: ${open.filter((f) => f.severity === "warning").length}\n- Informational: ${open.filter((f) => f.severity === "info").length}\n\n## Quality\n\n| Dimension | Score |\n|---|---:|\n${Object.entries(guide.audit_summary).map(([k, v]) => `| ${k.replace(/_/g, " ")} | ${v}/100 |`).join("\n")}\n\n## Open Findings\n\n${open.length ? open.map((f) => `### ${f.severity.toUpperCase()} — ${f.kind}\n\n${f.message}\n\n**Repair:** ${f.recommendation}`).join("\n\n") : "No open findings."}\n`;
}
