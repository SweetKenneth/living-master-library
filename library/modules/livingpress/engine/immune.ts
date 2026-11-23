/**
 * Immune safety gate. Runs on every draft BEFORE the split-brain review, in
 * plain code (no model). It cannot be talked out of a verdict. Catches the
 * failures a reviewing model tends to wave through: invented statistics,
 * fake testimonials, dangerous advice, retired wording, links to pages that
 * do not exist, prompt/assistant leakage.
 */

import type { LivingPressConfig } from "./config.ts";
import { deadLinks } from "./links.ts";

export type Antigen = { kind: string; match: string; severity: "block" | "revise" };

// No trailing \b: several phrases end in punctuation ("Certainly!"), where \b never matches.
const LEAKAGE = /\b(?:as an ai\b|as a (?:large )?language model\b|i cannot browse\b|i can't browse\b|here is (?:the|your) (?:revised |updated |final )?(?:draft|post|article)\b|certainly!|i hope this helps\b|let me know if you(?:'d| would) like\b)/i;
const FAKE_SOCIAL = /\b(?:\d{2,3}\s?% of (?:our )?(?:customers|users|clients)|trusted by (?:over |more than )?\d[\d,]*|award[- ]winning|five[- ]star|5[- ]star|rated #?1|(?:our|my) (?:happy |satisfied |loyal )?(?:customers|clients|users) (?:say|love|rave|swear))\b/i;
const DANGER = /\b(?:stop taking (?:your )?medication|guaranteed (?:returns|profit|profits|cure|results)|no risk whatsoever|risk[- ]free returns|cannot lose|can't lose)\b/i;
const STAT = /\b\d{1,3}(?:\.\d+)?\s?%|\b\d+(?:,\d{3})+\b|\b\d+(?:\.\d+)?x (?:faster|cheaper|better|more)\b/gi;

/** Fenced and inline code is quoted material, not a claim; strip it before scanning. */
const prose = (body: string) => body.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
const squash = (s: string) => s.toLowerCase().replace(/\s+/g, "");

const regexCache = new Map<string, RegExp | null>();
function retired(pattern: string): RegExp | null {
  if (!regexCache.has(pattern)) {
    try { regexCache.set(pattern, new RegExp(pattern, "i")); } catch { regexCache.set(pattern, null); }
  }
  return regexCache.get(pattern)!;
}

export function retiredHits(body: string, cfg: LivingPressConfig): { match: string; replaceWith: string }[] {
  const out: { match: string; replaceWith: string }[] = [];
  for (const r of cfg.retiredWords) {
    const hit = retired(r.pattern)?.exec(body);
    if (hit) out.push({ match: hit[0], replaceWith: r.replaceWith });
  }
  return out;
}

export function screen(body: string, cfg: LivingPressConfig, knownSlugs: string[]): Antigen[] {
  const found: Antigen[] = [];
  const seen = new Set<string>();
  const add = (kind: string, match: string, severity: Antigen["severity"]) => {
    const key = `${kind}|${match.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ kind, match: match.slice(0, 120), severity });
  };
  const text = prose(body);
  const facts = squash(cfg.houseFacts);

  const leak = text.match(LEAKAGE);
  if (leak) add("assistant leakage", leak[0], "block");
  const social = text.match(FAKE_SOCIAL);
  if (social && !facts.includes(squash(social[0]))) add("unsupported social proof", social[0], "block");
  const danger = text.match(DANGER);
  if (danger) add("unsafe advice", danger[0], "block");

  for (const m of text.matchAll(STAT)) {
    if (!facts.includes(squash(m[0]))) add("number not in house facts", m[0], "revise");
  }
  for (const r of retiredHits(text, cfg)) add("retired wording", r.match, "revise");
  for (const p of deadLinks(body, cfg, knownSlugs)) add("dead internal link", p, "revise");
  if (/^#\s/m.test(text)) add("extra H1", "# heading", "revise"); // text already has code removed
  return found;
}

export const blocks = (a: Antigen[]) => a.some((x) => x.severity === "block");
