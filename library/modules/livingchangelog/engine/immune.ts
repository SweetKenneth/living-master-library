/** Deterministic changelog safety gate. Models do not get to waive it. */

import type { LivingChangelogConfig } from "./config.ts";

export type Antigen = { kind: string; match: string; severity: "block" | "revise" };

const LEAKAGE = /\b(?:as an ai\b|as a (?:large )?language model\b|here is (?:the|your) (?:revised |updated |final )?(?:draft|entry|changelog)\b|certainly!|i hope this helps\b|let me know if you(?:'d| would) like\b)/i;
const HYPE = /\b(?:revolutionary|game[- ]changer|industry[- ]leading|best[- ]in[- ]class|world[- ]class|groundbreaking|unmatched|unparalleled)\b/i;
const UNSUPPORTED_ROLLOUT = /\b(?:available to everyone|rolled out to everyone|100% rollout|fully rolled out|all users now|globally available|generally available|production[- ]ready)\b/i;
const STAT = /\b\d{1,3}(?:\.\d+)?\s?%|\b\d+(?:,\d{3})+\b|\b\d+(?:\.\d+)?x (?:faster|cheaper|better|more)\b/gi;
const prose = (body: string) => body.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
const squash = (s: string) => s.toLowerCase().replace(/\s+/g, "");

const regexCache = new Map<string, RegExp | null>();
function compiled(pattern: string): RegExp | null {
  if (!regexCache.has(pattern)) { try { regexCache.set(pattern, new RegExp(pattern, "i")); } catch { regexCache.set(pattern, null); } }
  return regexCache.get(pattern)!;
}

export function retiredHits(body: string, cfg: LivingChangelogConfig): { match: string; replaceWith: string }[] {
  const out: { match: string; replaceWith: string }[] = [];
  for (const r of cfg.retiredWords) {
    const hit = compiled(r.pattern)?.exec(body);
    if (hit) out.push({ match: hit[0], replaceWith: r.replaceWith });
  }
  return out;
}

export function screen(body: string, cfg: LivingChangelogConfig, evidenceText = ""): Antigen[] {
  const found: Antigen[] = [];
  const seen = new Set<string>();
  const add = (kind: string, match: string, severity: Antigen["severity"]) => {
    const key = `${kind}|${match.toLowerCase()}`;
    if (!seen.has(key)) { seen.add(key); found.push({ kind, match: match.slice(0, 160), severity }); }
  };
  const text = prose(body);
  const truth = squash(`${cfg.productFacts}\n${evidenceText}`);

  const leak = text.match(LEAKAGE); if (leak) add("assistant leakage", leak[0], "block");
  const hype = text.match(HYPE); if (hype) add("marketing hype", hype[0], "revise");
  const rollout = text.match(UNSUPPORTED_ROLLOUT); if (rollout && !truth.includes(squash(rollout[0]))) add("unsupported rollout scope", rollout[0], "revise");
  for (const m of text.matchAll(STAT)) if (!truth.includes(squash(m[0]))) add("number not in evidence", m[0], "revise");
  for (const r of retiredHits(text, cfg)) add("retired wording", r.match, "revise");
  if (/^#\s/m.test(text)) add("extra H1", "# heading", "revise");
  return found;
}

export const blocks = (a: Antigen[]) => a.some((x) => x.severity === "block");
