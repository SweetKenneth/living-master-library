/** Configuration for an autonomous changelog publisher. */

import type { ChangeCategory, EvidenceKind } from "./ports.ts";

export type SiteLink = { path: string; label: string; note: string };
export type ShippingPolicy = "explicit-only" | "merge-to-production-is-live" | "commit-on-production-is-live";

export type LivingChangelogConfig = {
  site: { name: string; url: string; changelogName: string; changelogPath: string; tagline: string };
  audience: string;
  voice: string;
  /** Stable product truth. Evidence may prove a change; this describes the product around it. */
  productFacts: string;
  neverClaim: string[];
  retiredWords: { pattern: string; replaceWith: string }[];
  siteLinks: SiteLink[];
  categories: ChangeCategory[];
  sourcePolicy: {
    shippingPolicy: ShippingPolicy;
    productionBranch: string;
    productionEnvironments: string[];
    bootstrapLookbackDays: number;
    maxPendingEvidence: number;
    maxEvidencePerEntry: number;
    staleEvidenceDays: number;
    ignoredLabels: string[];
    ignoredTitlePatterns: string[];
    publishDeveloperOnly: boolean;
    publishableKinds: EvidenceKind[];
  };
  wordTargets: { update: { min: number; max: number }; release: { min: number; max: number } };
  qualityFloor: { reader: number; skeptic: number; fitness: number };
  cadence: { minHoursBetweenEntries: number; auditCooldownHours: number; auditEveryNthTick: number };
  breaker: { maxConsecutiveFailures: number; cooldownMinutes: number; heartbeatStaleHours: number };
  defense: { publicReadsPerMinute: number; adminCallsPerMinute: number };
  seed: string;
  /**
   * Optional. Where and how published entries are announced. The channels
   * themselves (and their tokens) are wired on the server from env vars.
   */
  announce?: {
    enabled?: boolean;
    /** Tokens: {product} {title} {excerpt} {version} {categories}. The link is always appended. */
    template?: string;
    hashtags?: string[];
    /** Wait this long after publishing before posting, as a window to pull an entry. */
    delayMinutes?: number;
  };
};

export const DEMO_CONFIG: LivingChangelogConfig = {
  site: {
    name: "[ENTER PRODUCT OR COMPANY NAME HERE]",
    url: "https://[ENTER-DOMAIN-HERE]",
    changelogName: "[ENTER CHANGELOG NAME HERE]",
    changelogPath: "/changelog",
    tagline: "[ENTER ONE-LINE CHANGELOG TAGLINE HERE]",
  },
  audience: "[ENTER WHO READS RELEASE NOTES — e.g. customers, developers, or both]",
  voice: "Plain, factual, compact. Lead with user impact. No hype, no emoji, no marketing adjectives. Never turn an internal implementation detail into a customer benefit unless the evidence proves that benefit.",
  productFacts: `[ENTER CURRENT PRODUCT FACTS HERE]\n- What the product does today.\n- Plans/tiers/platforms that exist today.\n- Names of real features and surfaces.`,
  neverClaim: [
    "A code change is live merely because it was committed or merged",
    "A feature, fix, metric, customer, benchmark or rollout state not supported by evidence or product facts",
  ],
  retiredWords: [
    { pattern: "\\brevolutionary\\b", replaceWith: "state what changed" },
    { pattern: "\\bseamless(ly)?\\b", replaceWith: "state what the user experiences" },
    { pattern: "\\bgame[- ]changer\\b", replaceWith: "state what changed" },
    { pattern: "\\bcutting[- ]edge\\b", replaceWith: "state what changed" },
  ],
  siteLinks: [{ path: "/", label: "Home", note: "product home" }],
  categories: ["added", "improved", "fixed", "changed", "removed", "security", "developer"],
  sourcePolicy: {
    shippingPolicy: "explicit-only",
    productionBranch: "main",
    productionEnvironments: ["production", "prod", "live"],
    bootstrapLookbackDays: 7,
    maxPendingEvidence: 100,
    maxEvidencePerEntry: 16,
    staleEvidenceDays: 30,
    ignoredLabels: ["chore", "dependencies", "dependabot", "internal-only", "no-changelog"],
    ignoredTitlePatterns: ["^chore(?:\\(|:)", "^deps(?:\\(|:)", "^merge branch", "^bump .* from .* to .*"],
    publishDeveloperOnly: false,
    publishableKinds: ["release", "deployment", "pull_request", "commit", "manual"],
  },
  wordTargets: { update: { min: 20, max: 240 }, release: { min: 40, max: 500 } },
  qualityFloor: { reader: 70, skeptic: 85, fitness: 0.75 },
  cadence: { minHoursBetweenEntries: 4, auditCooldownHours: 72, auditEveryNthTick: 4 },
  breaker: { maxConsecutiveFailures: 3, cooldownMinutes: 360, heartbeatStaleHours: 48 },
  defense: { publicReadsPerMinute: 180, adminCallsPerMinute: 20 },
  seed: "livingchangelog",
};

export function validateConfig(c: LivingChangelogConfig): string[] {
  const problems: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (typeof v === "string" && /\[ENTER[^\]]*\]/.test(v)) problems.push(`${path} still has a placeholder`);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(c, "");
  const need = (cond: boolean, msg: string) => { if (!cond) problems.push(msg); };
  need(/^https?:\/\/[^\s/]+/.test(c.site?.url ?? ""), "site.url must start with https:// (or http://)");
  need((c.site?.changelogPath ?? "").startsWith("/"), "site.changelogPath must start with /");
  need(!!c.productFacts?.trim(), "productFacts is empty: the publisher has no stable product truth");
  need(Array.isArray(c.categories) && c.categories.length > 0, "categories: choose at least one changelog category");
  need(new Set(c.categories ?? []).size === (c.categories ?? []).length, "categories must be unique");
  for (const role of ["update", "release"] as const) {
    const t = c.wordTargets?.[role];
    need(!!t && t.min > 0 && t.max >= t.min, `wordTargets.${role}: need 0 < min <= max`);
  }
  need(c.qualityFloor?.reader >= 0 && c.qualityFloor?.reader <= 100 && c.qualityFloor?.skeptic >= 0 && c.qualityFloor?.skeptic <= 100, "qualityFloor reader/skeptic must be 0-100");
  need(c.qualityFloor?.fitness >= 0 && c.qualityFloor?.fitness <= 1, "qualityFloor.fitness must be 0-1");
  need(c.cadence?.minHoursBetweenEntries >= 0, "cadence.minHoursBetweenEntries must be >= 0");
  need(Number.isInteger(c.cadence?.auditEveryNthTick) && c.cadence.auditEveryNthTick >= 1, "cadence.auditEveryNthTick must be a whole number >= 1");
  need(c.sourcePolicy?.bootstrapLookbackDays >= 1, "sourcePolicy.bootstrapLookbackDays must be >= 1");
  need(c.sourcePolicy?.maxPendingEvidence >= 1, "sourcePolicy.maxPendingEvidence must be >= 1");
  need(c.sourcePolicy?.maxEvidencePerEntry >= 1 && c.sourcePolicy.maxEvidencePerEntry <= c.sourcePolicy.maxPendingEvidence, "sourcePolicy.maxEvidencePerEntry must be 1..maxPendingEvidence");
  need(["explicit-only", "merge-to-production-is-live", "commit-on-production-is-live"].includes(c.sourcePolicy?.shippingPolicy), "sourcePolicy.shippingPolicy is invalid");
  need(!!c.sourcePolicy?.productionBranch, "sourcePolicy.productionBranch must not be empty");
  need(Array.isArray(c.sourcePolicy?.productionEnvironments) && c.sourcePolicy.productionEnvironments.length >= 1, "sourcePolicy.productionEnvironments needs at least one production environment name");
  (c.sourcePolicy?.ignoredTitlePatterns ?? []).forEach((p, i) => { try { new RegExp(p, "i"); } catch { problems.push(`sourcePolicy.ignoredTitlePatterns[${i}] is not a valid regular expression`); } });
  (c.retiredWords ?? []).forEach((r, i) => { try { new RegExp(r.pattern, "i"); } catch { problems.push(`retiredWords[${i}].pattern is not a valid regular expression`); } });
  (c.siteLinks ?? []).forEach((l, i) => need(l.path?.startsWith("/") && !l.path.startsWith("//"), `siteLinks[${i}].path must be a site path starting with /`));
  need(c.breaker?.maxConsecutiveFailures >= 1, "breaker.maxConsecutiveFailures must be >= 1");
  need(c.defense?.publicReadsPerMinute >= 1 && c.defense?.adminCallsPerMinute >= 1, "defense limits must be >= 1");
  need(!!c.seed, "seed must not be empty");
  if (c.announce) {
    const a = c.announce;
    if (a.template !== undefined && (typeof a.template !== "string" || !/\{title\}|\{excerpt\}/.test(a.template))) problems.push("announce.template must include {title} or {excerpt}");
    if (a.delayMinutes !== undefined && !(Number.isFinite(a.delayMinutes) && a.delayMinutes >= 0 && a.delayMinutes <= 10080)) problems.push("announce.delayMinutes must be 0..10080 (one week)");
    if (a.hashtags !== undefined && (!Array.isArray(a.hashtags) || a.hashtags.length > 5 || a.hashtags.some((t) => typeof t !== "string" || !/^#?[\p{L}\p{N}_]+$/u.test(t)))) problems.push("announce.hashtags must be up to 5 single words");
  }
  return problems;
}
