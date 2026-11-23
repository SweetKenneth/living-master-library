/**
 * `livingchangelog preview`: run the real engine against a public GitHub repo
 * with in-memory storage. Nothing is written anywhere. Without an AI key it
 * still shows the useful half: what was found, what would be skipped, and
 * what can be proven to have shipped.
 */

import { memoryStorage } from "../adapters/memory.ts";
import { githubSource } from "../adapters/github.ts";
import type { LivingChangelogConfig, ShippingPolicy } from "../engine/config.ts";
import { runTick } from "../engine/engine.ts";
import { isShipSignal, shippingProofWithPool, syncSources } from "../engine/evidence.ts";
import type { ChangeEvidence, ChangelogEntry, EvidenceSource, ModelProvider, Storage } from "../engine/ports.ts";
import { VOICES, type VoiceName } from "../engine/voice.ts";
import { composeAnnouncement } from "../engine/announce.ts";

export type RepoMeta = { fullName: string; name: string; description: string; defaultBranch: string; htmlUrl: string };

export type PreviewOptions = {
  repo: string;
  sinceDays: number;
  voice: VoiceName;
  policy: ShippingPolicy;
  maxEntries: number;
  includeCommits: boolean;
  models: ModelProvider[];
  token?: string;
  /** GitHub API base, for GitHub Enterprise (https://ghe.example.com/api/v3). */
  apiBase?: string;
  /** Injected in tests; fetched from GitHub otherwise. */
  meta?: RepoMeta;
  source?: EvidenceSource;
  now?: number;
};

export type PreviewResult = {
  repo: string;
  sinceDays: number;
  voice: VoiceName;
  mode: "full" | "evidence-only";
  entries: ChangelogEntry[];
  found: number;
  skipped: { dependencies: number; chores: number; judged: number };
  held: { unproven: number; bundling: number };
  provable: { title: string; url: string | null; kind: string }[];
  warnings: string[];
  modelCalls: number;
  /** One line per engine tick: the sealed reason for each decision. */
  decisions: string[];
  /** What the auto-announcement would say for each entry, fitted to X's 280 characters (the strictest common limit). */
  announcements: { slug: string; text: string }[];
};

export async function fetchRepoMeta(repo: string, token?: string, apiBase = "https://api.github.com"): Promise<RepoMeta> {
  const res = await fetch(`${apiBase.replace(/\/+$/, "")}/repos/${repo}`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "livingchangelog", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 404) throw new Error(`GitHub repo ${repo} not found (private repos need --token or GITHUB_TOKEN)`);
  if (!res.ok) throw new Error(res.status === 403 ? "GitHub rate limit reached; set GITHUB_TOKEN (unauthenticated calls get 60/hour)" : `GitHub ${res.status}`);
  const r = await res.json() as { full_name?: string; name?: string; description?: string | null; default_branch?: string; html_url?: string };
  return { fullName: r.full_name ?? repo, name: r.name ?? repo.split("/")[1] ?? repo, description: r.description ?? "", defaultBranch: r.default_branch ?? "main", htmlUrl: r.html_url ?? `https://github.com/${repo}` };
}

export function previewConfig(meta: RepoMeta, opts: Pick<PreviewOptions, "sinceDays" | "voice" | "policy">): LivingChangelogConfig {
  return {
    // Preview links use a stand-in domain: the real one is wherever you host the changelog.
    site: { name: meta.name, url: "https://your-site.example", changelogName: `${meta.name} changelog`, changelogPath: "/changelog", tagline: "Preview" },
    audience: `people who use or build on ${meta.name}`,
    voice: VOICES[opts.voice].writing,
    productFacts: `${meta.fullName} is a public GitHub repository.${meta.description ? ` Its description: ${meta.description}` : ""}`,
    neverClaim: [
      "A code change is live merely because it was committed or merged, unless the shipping policy says so",
      "A feature, fix, metric, benchmark, customer or rollout state not supported by the evidence",
    ],
    retiredWords: [
      { pattern: "\\brevolutionary\\b", replaceWith: "state what changed" },
      { pattern: "\\bseamless(ly)?\\b", replaceWith: "state what the user experiences" },
    ],
    siteLinks: [{ path: "/", label: "Home", note: "project home" }],
    categories: ["added", "improved", "fixed", "changed", "removed", "security", "developer"],
    sourcePolicy: {
      shippingPolicy: opts.policy, productionBranch: meta.defaultBranch, productionEnvironments: ["production", "prod", "live"],
      bootstrapLookbackDays: opts.sinceDays, maxPendingEvidence: 100, maxEvidencePerEntry: 16, staleEvidenceDays: Math.max(30, opts.sinceDays + 7),
      ignoredLabels: ["chore", "dependencies", "dependabot", "renovate", "internal-only", "no-changelog", "skip-changelog", "ci", "tests"],
      ignoredTitlePatterns: ["^chore(?:\\(|:)", "^deps(?:\\(|:)", "^build(?:\\(|:)", "^ci(?:\\(|:)", "^test(?:\\(|:)", "^merge branch", "^bump .* from .* to .*", "^update dependency "],
      // Repositories are read by developers, so developer-facing entries are welcome here.
      publishDeveloperOnly: true,
      publishableKinds: ["release", "deployment", "pull_request", "commit", "manual"],
    },
    wordTargets: { update: { min: 15, max: 220 }, release: { min: 25, max: 450 } },
    qualityFloor: { reader: 70, skeptic: 85, fitness: 0.75 },
    cadence: { minHoursBetweenEntries: 0, auditCooldownHours: 9999, auditEveryNthTick: 9999 },
    breaker: { maxConsecutiveFailures: 3, cooldownMinutes: 60, heartbeatStaleHours: 9999 },
    defense: { publicReadsPerMinute: 60, adminCallsPerMinute: 60 },
    seed: `preview:${meta.fullName}`,
  };
}

function bucket(reason: string | null): "dependencies" | "chores" | "judged" {
  const r = (reason ?? "").toLowerCase();
  if (r.startsWith("triage:")) return "judged";
  if (/dependenc|dependabot|renovate|bump|deps|update dependency/.test(r)) return "dependencies";
  return "chores";
}

async function pool(storage: Storage): Promise<ChangeEvidence[]> {
  const [p, u, i] = await Promise.all([storage.listEvidence("pending", 500, true), storage.listEvidence("used", 500, true), storage.listEvidence("ignored", 500, true)]);
  return [...p, ...u, ...i];
}

export async function preview(opts: PreviewOptions): Promise<PreviewResult> {
  const meta = opts.meta ?? await fetchRepoMeta(opts.repo, opts.token, opts.apiBase);
  const cfg = previewConfig(meta, opts);
  const storage = memoryStorage();
  const kinds: ("releases" | "deployments" | "pull_requests" | "commits")[] = ["releases", "deployments", "pull_requests", ...(opts.includeCommits ? ["commits" as const] : [])];
  const [owner, repo] = meta.fullName.split("/") as [string, string];
  const source = opts.source ?? githubSource({ owner, repo, token: opts.token, kinds, maxPages: 3, ...(opts.apiBase ? { apiBase: opts.apiBase } : {}), productionEnvironments: cfg.sourcePolicy.productionEnvironments });
  const t0 = opts.now ?? Date.now();
  const warnings: string[] = [];
  let modelCalls = 0;
  const decisions: string[] = [];

  if (!opts.models.length) {
    const sync = await syncSources(storage, [source], cfg, t0);
    warnings.push(...sync.errors);
  } else {
    let quiet = 0;
    for (let i = 0; i < opts.maxEntries + 4 && quiet < 2; i += 1) {
      // Only the first tick talks to GitHub; later ticks work through what it found.
      const r = await runTick({ storage, models: opts.models, sources: i === 0 ? [source] : [], config: cfg, now: () => t0 + i * 1000 });
      decisions.push(`${r.outcome}: ${r.reason}`);
      const runs = await storage.listRuns(1);
      const detail = runs[0]?.detail ?? {};
      modelCalls += Number(detail.modelCalls ?? 0);
      const sync = detail.sync as { errors?: string[] } | undefined;
      if (i === 0 && sync?.errors?.length) warnings.push(...sync.errors);
      if (r.outcome === "error" || r.outcome === "tripped") { warnings.push(r.reason); break; }
      if (r.outcome === "published") { quiet = 0; if ((await storage.listEntries(100)).length >= opts.maxEntries) break; }
      else quiet += 1;
      if (/No pending release evidence/.test(r.reason)) break;
    }
  }

  const all = await pool(storage);
  const entries = await storage.listEntries(100);
  const ignored = all.filter((e) => e.status === "ignored");
  const pending = all.filter((e) => e.status === "pending");
  const skipped = { dependencies: 0, chores: 0, judged: 0 };
  for (const e of ignored) {
    if (isShipSignal(e, cfg)) continue; // a skipped deploy is plumbing, not a skipped change
    skipped[bucket(e.ignore_reason)] += 1;
  }
  const held = { unproven: 0, bundling: 0 };
  const provable: PreviewResult["provable"] = [];
  for (const e of pending) {
    const proven = isShipSignal(e, cfg) || shippingProofWithPool([e], all, cfg).ok;
    if (proven) provable.push({ title: e.title, url: e.url, kind: e.kind });
    if (opts.models.length) proven ? (held.bundling += 1) : (held.unproven += 1);
    else if (!proven) held.unproven += 1;
  }
  return {
    repo: meta.fullName, sinceDays: opts.sinceDays, voice: opts.voice, mode: opts.models.length ? "full" : "evidence-only",
    entries, announcements: entries.map((e) => ({ slug: e.slug, text: composeAnnouncement(e, cfg, { maxChars: 280, urlCost: 23 }).text })), found: all.length, skipped, held, provable, warnings: [...new Set(warnings)], modelCalls, decisions,
  };
}

const C = (on: boolean) => ({
  bold: (s: string) => on ? `\x1b[1m${s}\x1b[22m` : s,
  dim: (s: string) => on ? `\x1b[2m${s}\x1b[22m` : s,
  green: (s: string) => on ? `\x1b[32m${s}\x1b[39m` : s,
  yellow: (s: string) => on ? `\x1b[33m${s}\x1b[39m` : s,
});

/** Human-readable report in the chosen voice. */
export function formatReport(r: PreviewResult, color = false): string {
  const v = VOICES[r.voice].narrate;
  const c = C(color);
  const out: string[] = ["", c.bold(v.intro(r.repo, r.sinceDays)), ""];
  if (r.mode === "evidence-only") out.push(c.yellow(v.noKey), "");

  if (r.mode === "full") {
    out.push(c.bold(r.entries.length ? v.published(r.entries.length) : v.nothing), "");
    for (const e of [...r.entries].reverse()) {
      out.push(c.green(`━━ ${e.title}${e.version ? `  (${e.version})` : ""}`));
      out.push(c.dim(`   ${e.categories.join(", ")}`), "");
      out.push(...e.body.split("\n").map((l) => `   ${l}`), "");
      if (e.evidence_urls.length) out.push(c.dim(`   Proof: ${e.evidence_urls.slice(0, 4).join("  ")}${e.evidence_urls.length > 4 ? `  (+${e.evidence_urls.length - 4})` : ""}`), "");
      const post = r.announcements?.find((x) => x.slug === e.slug);
      if (post) out.push(c.dim(`   Would post: ${post.text}`), "");
    }
  } else {
    out.push(c.bold(`Found ${r.found} item${r.found === 1 ? "" : "s"} of evidence.`));
    if (r.provable.length) {
      out.push("", c.bold("Provably shipped, and eligible for an entry:"));
      for (const p of r.provable.slice(0, 12)) out.push(`  • ${p.title}${p.url ? c.dim(`  ${p.url}`) : ""}`);
      if (r.provable.length > 12) out.push(c.dim(`  …and ${r.provable.length - 12} more`));
    } else out.push("", v.nothing);
    out.push("");
  }

  const lines: string[] = [];
  if (r.skipped.dependencies) lines.push(v.skippedDeps(r.skipped.dependencies));
  if (r.skipped.chores) lines.push(v.skippedChores(r.skipped.chores));
  if (r.skipped.judged) lines.push(v.skippedJudged(r.skipped.judged));
  if (r.held.unproven) lines.push(v.heldUnproven(r.held.unproven));
  if (r.held.bundling) lines.push(v.heldOther(r.held.bundling));
  if (lines.length) out.push(c.bold("What it didn't say:"), ...lines.map((l) => `  ${l}`), "");
  for (const w of r.warnings.slice(0, 5)) out.push(c.yellow(`Note: ${w}`));
  out.push(c.dim(v.outro), "");
  return out.join("\n");
}
