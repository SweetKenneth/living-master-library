/** Documentation verification test: can a new engineer use the docs without guessing? */

import type { VerificationCheck, TruthClaim } from "./ports.ts";

const CHECKS: Array<{ label: string; patterns: RegExp[]; implementationPreferred?: boolean }> = [
  { label: "project purpose and supported capability", patterns: [/\b(project|product|system|tool|library|service)\b/i, /\b(purpose|does|provides|supports|designed|built)\b/i] },
  { label: "installation or start path", patterns: [/\b(install|setup|start|run|build|npm|pnpm|yarn|docker|command)\b/i], implementationPreferred: true },
  { label: "configuration names and defaults", patterns: [/\b(config|configuration|environment|env|default|required|optional)\b/i], implementationPreferred: true },
  { label: "CLI surface", patterns: [/\b(cli|command|flag|argument|option)\b/i], implementationPreferred: true },
  { label: "API surface", patterns: [/\b(api|endpoint|route|request|response|function|method)\b/i], implementationPreferred: true },
  { label: "persistent state", patterns: [/\b(database|storage|state|table|schema|postgres|filesystem|kv|cache)\b/i], implementationPreferred: true },
  { label: "architecture boundaries", patterns: [/\b(architecture|component|module|adapter|engine|layer|dependency|boundary)\b/i] },
  { label: "verified examples", patterns: [/\b(example|usage|sample|quickstart)\b/i], implementationPreferred: true },
  { label: "operations and recovery", patterns: [/\b(deploy|operation|backup|restore|recovery|monitor|health|worker|job)\b/i] },
  { label: "security behavior", patterns: [/\b(secret|credential|auth|security|token|permission|redact|access)\b/i] },
  { label: "known limitations", patterns: [/\b(limit|unsupported|known issue|incomplete|constraint|does not|cannot)\b/i] },
  { label: "visible uncertainty and drift", patterns: [/\b(stale|verify|audit|unknown|requires|contradict|uncertain|as of)\b/i] },
];

export function deterministicVerification(claims: TruthClaim[]): VerificationCheck {
  const usable = claims.filter((c) => !c.stale && !["unknown", "requires_audit", "speculative"].includes(c.status));
  const answerable: string[] = [];
  const defects: string[] = [];
  for (const check of CHECKS) {
    const matching = usable.filter((c) => check.patterns.every((p) => p.test(c.statement)));
    let ok = matching.length > 0;
    if (ok && check.implementationPreferred) {
      ok = matching.some((c) => ["implementation", "test", "configuration", "schema"].includes(c.basis));
    }
    if (ok) answerable.push(check.label);
    else defects.push(`Insufficient verified documentation for ${check.label}.`);
  }
  const score = Math.round((answerable.length / CHECKS.length) * 100);
  const criticalMiss = defects.some((x) => /installation|configuration|persistent state|security behavior/.test(x));
  return { score, passed: score >= 75 && !criticalMiss, answerable, defects, notes: [] };
}

export function mergeVerification(base: VerificationCheck, model: Partial<VerificationCheck> | null): VerificationCheck {
  if (!model) return base;
  const n = Number(model.score);
  const score = Number.isFinite(n) ? Math.min(base.score, Math.max(0, Math.min(100, Math.round(n)))) : base.score;
  const defects = [...new Set([...base.defects, ...(Array.isArray(model.defects) ? model.defects.map(String) : [])])].slice(0, 50);
  const answerable = [...new Set([...(Array.isArray(model.answerable) ? model.answerable.map(String) : []), ...base.answerable])].slice(0, 50);
  const notes = [...new Set([...(Array.isArray(model.notes) ? model.notes.map(String) : []), ...base.notes])].slice(0, 50);
  return { score, passed: base.passed && score >= 75, answerable, defects, notes };
}

export function verificationMarkdown(r: VerificationCheck): string {
  return `# Documentation Verification\n\n**Score:** ${r.score}/100  \n**Result:** ${r.passed ? "PASS" : "NEEDS WORK"}\n\n## Verified Coverage\n\n${r.answerable.length ? r.answerable.map((x) => `- ${x}`).join("\n") : "- None yet."}\n\n## Documentation Defects\n\n${r.defects.length ? r.defects.map((x) => `- ${x}`).join("\n") : "- None detected."}\n\n## Notes\n\n${r.notes.length ? r.notes.map((x) => `- ${x}`).join("\n") : "- No additional notes."}\n`;
}
