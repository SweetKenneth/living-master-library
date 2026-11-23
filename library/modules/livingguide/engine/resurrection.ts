/** Continuity/resurrection test: can a future operator resume without critical guessing? */

import type { ResurrectionCheck, TruthClaim } from "./ports.ts";

const CHECKS: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "project purpose and identity", patterns: [/\b(project|product|system|platform)\b/i, /\b(purpose|exists|solves|designed|built)\b/i] },
  { label: "build or run procedure", patterns: [/\b(run|build|install|setup|deploy|command|npm|docker|worker)\b/i] },
  { label: "deployment state", patterns: [/\b(deploy|production|host|live|environment|cloudflare|server|domain)\b/i] },
  { label: "data or state location", patterns: [/\b(database|storage|state|table|postgres|supabase|filesystem|kv|memory)\b/i] },
  { label: "major subsystems and dependencies", patterns: [/\b(module|subsystem|component|dependency|architecture|adapter|engine|api)\b/i] },
  { label: "unfinished work or blockers", patterns: [/\b(incomplete|unfinished|blocker|bug|missing|todo|planned|known issue)\b/i] },
  { label: "architecture decision rationale", patterns: [/\b(because|reason|chosen|decision|tradeoff|why)\b/i] },
  { label: "fragile or protected invariants", patterns: [/\b(do not|must not|invariant|critical|preserve|never change|compatibility)\b/i] },
  { label: "next work / roadmap", patterns: [/\b(next|roadmap|priority|planned|future|milestone)\b/i] },
  { label: "stale or time-sensitive assumptions", patterns: [/\b(stale|time-sensitive|verify|audit|current|as of|assumption)\b/i] },
  { label: "secure access recovery", patterns: [/\b(secret|credential|vault|access|token|account|recovery)\b/i] },
  { label: "safe resumption guidance", patterns: [/\b(resume|resurrection|continuity|operator|handoff|recovery)\b/i] },
];

export function deterministicResurrection(claims: TruthClaim[]): ResurrectionCheck {
  const usable = claims.filter((c) => !c.stale && !["unknown", "requires_audit"].includes(c.status));
  const text = usable.map((c) => c.statement).join("\n");
  const answerable: string[] = []; const defects: string[] = [];
  for (const c of CHECKS) {
    const ok = c.patterns.every((p) => p.test(text));
    (ok ? answerable : defects).push(ok ? c.label : `Insufficient durable evidence for ${c.label}.`);
  }
  const score = Math.round((answerable.length / CHECKS.length) * 100);
  return { score, passed: score >= 75 && !defects.some((x) => /build or run|data or state|major subsystems|secure access/.test(x)), answerable, defects, notes: [] };
}

export function mergeResurrection(base: ResurrectionCheck, model: Partial<ResurrectionCheck> | null): ResurrectionCheck {
  if (!model) return base;
  const modelScore = Number(model.score);
  const score = Number.isFinite(modelScore) ? Math.min(base.score, Math.max(0, Math.min(100, Math.round(modelScore)))) : base.score;
  const defects = [...new Set([...base.defects, ...(Array.isArray(model.defects) ? model.defects.map(String) : [])])].slice(0, 40);
  const answerable = [...new Set([...(Array.isArray(model.answerable) ? model.answerable.map(String) : []), ...base.answerable])].slice(0, 40);
  const notes = [...new Set([...(Array.isArray(model.notes) ? model.notes.map(String) : []), ...base.notes])].slice(0, 40);
  return { score, passed: base.passed && score >= 75, answerable, defects, notes };
}

export function resurrectionMarkdown(r: ResurrectionCheck): string {
  return `# Resurrection Test\n\n**Score:** ${r.score}/100  \n**Result:** ${r.passed ? "PASS" : "NEEDS WORK"}\n\n## Answerable From the Archive\n\n${r.answerable.length ? r.answerable.map((x) => `- ${x}`).join("\n") : "- None yet."}\n\n## Continuity Defects\n\n${r.defects.length ? r.defects.map((x) => `- ${x}`).join("\n") : "- None detected."}\n\n## Notes\n\n${r.notes.length ? r.notes.map((x) => `- ${x}`).join("\n") : "- No additional notes."}\n`;
}
