/**
 * Near-duplicate detection for titles. Exact-match dedupe let
 * "Link SBOM entries to exact source commits" and
 * "Linking SBOM Entries to Exact Source Commits" both publish. This compares
 * the meaningful word stems instead, so rewordings of the same post collide.
 */

const STOP = new Set(("a an and are as at be by can do does for from how in into is it its of on or that the this to vs was what when where which why with without your you our we not no before after over under use using").split(" "));

/** Crude but deterministic English stemmer: enough to fold link/linking/links, entry/entries. */
function stem(w: string): string {
  let s = w;
  for (const [suf, rep] of [["ies", "y"], ["ing", ""], ["ed", ""], ["es", ""], ["s", ""]] as const) {
    if (s.length > suf.length + 2 && s.endsWith(suf)) { s = s.slice(0, -suf.length) + rep; break; }
  }
  s = s.replace(/(.)\1$/, "$1"); // running -> runn -> run
  return s.length > 3 ? s.replace(/e$/, "") : s; // store/storing/stored, price/pricing -> stor, pric
}

export function titleStems(title: string): Set<string> {
  return new Set(
    title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w)).map(stem),
  );
}

/** Overlap of stems relative to the shorter title (0..1). 1 = one title's ideas are all inside the other. */
export function titleSimilarity(a: string, b: string): number {
  const x = titleStems(a), y = titleStems(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const s of x) if (y.has(s)) shared += 1;
  return shared / Math.min(x.size, y.size);
}

export const NEAR_DUPLICATE = 0.75;

/** The closest existing title at or above the threshold, if any. */
export function nearDuplicate(title: string, existing: string[], threshold = NEAR_DUPLICATE): { title: string; score: number } | null {
  let best: { title: string; score: number } | null = null;
  for (const e of existing) {
    const score = titleSimilarity(title, e);
    if (score >= threshold && (!best || score > best.score)) best = { title: e, score };
  }
  return best;
}
