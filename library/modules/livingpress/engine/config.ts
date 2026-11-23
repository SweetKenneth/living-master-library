/**
 * Site configuration. Everything site-specific lives here — the engine itself
 * contains no topics, no brand, no facts. The install wizard writes this file.
 */

export type Cluster = { id: string; label: string; thesis: string; keywords: string[] };
export type SiteLink = { path: string; label: string; note: string };

export type LivingPressConfig = {
  site: { name: string; url: string; blogName: string; blogPath: string; tagline: string };
  audience: string;
  voice: string;
  /** The ONLY ground truth the writer may use. Anything not here is unsupported. */
  houseFacts: string;
  /** Things the engine must never claim. Fed to the Skeptic and the immune gate. */
  neverClaim: string[];
  /** Words/phrases the corrector strips from old posts (retired register). */
  retiredWords: { pattern: string; replaceWith: string }[];
  clusters: Cluster[];
  painPoints: string[];
  siteLinks: SiteLink[];
  /** Every Nth published post may name the site as the answer; the rest argue the problem. */
  advocacyEvery: number;
  wordTargets: { pillar: { min: number; max: number }; support: { min: number; max: number } };
  qualityFloor: { reader: number; skeptic: number; fitness: number };
  cadence: { minHoursBetweenPosts: number; auditCooldownHours: number; auditEveryNthTick: number };
  breaker: { maxConsecutiveFailures: number; cooldownMinutes: number; heartbeatStaleHours: number };
  defense: { publicReadsPerMinute: number; adminCallsPerMinute: number };
  /** Seed for ORACLE. Same seed + same state = same choices. */
  seed: string;
};

export const DEMO_CONFIG: LivingPressConfig = {
  site: {
    name: "[ENTER SITE NAME HERE]",
    url: "https://[ENTER-DOMAIN-HERE]",
    blogName: "[ENTER BLOG NAME HERE]",
    blogPath: "/blog",
    tagline: "[ENTER ONE-LINE BLOG TAGLINE HERE]",
  },
  audience: "[ENTER WHO THE READER IS — e.g. 'independent bakery owners who are short on time']",
  voice:
    "Plain, concrete, declarative. Short sentences carry the weight. No hype, no emoji, no listicles pretending to be arguments. Name the problem precisely, then show what good looks like. Concede what is genuinely hard.",
  houseFacts: `[ENTER HOUSE FACTS HERE]
- What the business/site does, in plain words.
- Prices, hours, locations, guarantees — only what is true today.
- Products or services by their real names.`,
  neverClaim: [
    "Any number, benchmark, customer, testimonial or award not stated in the house facts",
    "Features or services that do not exist yet",
  ],
  retiredWords: [
    { pattern: "\\brevolutionary\\b", replaceWith: "state the mechanism instead" },
    { pattern: "\\bseamless(ly)?\\b", replaceWith: "say what actually happens" },
    { pattern: "\\bgame[- ]changer\\b", replaceWith: "state the mechanism instead" },
    { pattern: "\\bcutting[- ]edge\\b", replaceWith: "state the mechanism instead" },
  ],
  clusters: [
    { id: "topic-a", label: "[ENTER CONTENT TOPIC A HERE]", thesis: "[ENTER THE ARGUMENT THIS TOPIC MAKES]", keywords: ["[keyword]"] },
    { id: "topic-b", label: "[ENTER CONTENT TOPIC B HERE]", thesis: "[ENTER THE ARGUMENT THIS TOPIC MAKES]", keywords: ["[keyword]"] },
    { id: "topic-c", label: "[ENTER CONTENT TOPIC C HERE]", thesis: "[ENTER THE ARGUMENT THIS TOPIC MAKES]", keywords: ["[keyword]"] },
  ],
  painPoints: ["[ENTER A REAL READER PROBLEM HERE]", "[ENTER ANOTHER READER PROBLEM HERE]"],
  siteLinks: [
    { path: "/", label: "Home", note: "start here" },
    { path: "/[ENTER-PAGE]", label: "[ENTER PAGE NAME]", note: "[when to link it]" },
  ],
  advocacyEvery: 3,
  wordTargets: { pillar: { min: 1400, max: 1600 }, support: { min: 700, max: 900 } },
  qualityFloor: { reader: 70, skeptic: 75, fitness: 0.7 },
  cadence: { minHoursBetweenPosts: 20, auditCooldownHours: 72, auditEveryNthTick: 3 },
  breaker: { maxConsecutiveFailures: 3, cooldownMinutes: 360, heartbeatStaleHours: 48 },
  defense: { publicReadsPerMinute: 120, adminCallsPerMinute: 10 },
  seed: "livingpress",
};

export function validateConfig(c: LivingPressConfig): string[] {
  const problems: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (typeof v === "string" && /\[ENTER[^\]]*\]/.test(v)) problems.push(`${path} still has a placeholder`);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(c, "");
  const need = (cond: boolean, msg: string) => { if (!cond) problems.push(msg); };
  need(/^https?:\/\/[^\s/]+/.test(c.site?.url ?? ""), "site.url must start with https:// (or http://)");
  need((c.site?.blogPath ?? "").startsWith("/"), "site.blogPath must start with /");
  need(!!c.houseFacts?.trim(), "houseFacts is empty: the writer has nothing true to say");
  need(Array.isArray(c.clusters) && c.clusters.length >= 1, "clusters: need at least one content topic");
  if (Array.isArray(c.clusters)) {
    need(new Set(c.clusters.map((x) => x.id)).size === c.clusters.length, "clusters: ids must be unique");
    c.clusters.forEach((x, i) => need(/^[a-z0-9][a-z0-9-]*$/.test(x.id ?? ""), `clusters[${i}].id must be lowercase letters, digits and dashes`));
  }
  (c.siteLinks ?? []).forEach((l, i) => need(l.path?.startsWith("/") && !l.path.startsWith("//"), `siteLinks[${i}].path must be a site path starting with /`));
  (c.retiredWords ?? []).forEach((r, i) => {
    try { new RegExp(r.pattern, "i"); } catch { problems.push(`retiredWords[${i}].pattern is not a valid regular expression`); }
  });
  need(Number.isInteger(c.advocacyEvery) && c.advocacyEvery >= 1, "advocacyEvery must be a whole number >= 1");
  for (const role of ["pillar", "support"] as const) {
    const t = c.wordTargets?.[role];
    need(!!t && t.min > 0 && t.max >= t.min, `wordTargets.${role}: need 0 < min <= max`);
  }
  const q = c.qualityFloor;
  need(!!q && q.reader >= 0 && q.reader <= 100 && q.skeptic >= 0 && q.skeptic <= 100, "qualityFloor reader/skeptic must be 0-100");
  need(!!q && q.fitness >= 0 && q.fitness <= 1, "qualityFloor.fitness must be 0-1");
  need(c.cadence?.minHoursBetweenPosts >= 0, "cadence.minHoursBetweenPosts must be >= 0");
  need(Number.isInteger(c.cadence?.auditEveryNthTick) && c.cadence.auditEveryNthTick >= 1, "cadence.auditEveryNthTick must be a whole number >= 1");
  need(c.breaker?.maxConsecutiveFailures >= 1, "breaker.maxConsecutiveFailures must be >= 1");
  need(c.defense?.publicReadsPerMinute >= 1 && c.defense?.adminCallsPerMinute >= 1, "defense limits must be >= 1");
  need(!!c.seed, "seed must not be empty");
  return problems;
}
