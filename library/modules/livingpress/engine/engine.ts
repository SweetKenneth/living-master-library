/**
 * LivingPress: Autonomous Editorial Engine — one tick.
 *
 *  0. DEFENSE has already admitted the caller (see http.ts). The config must
 *     be complete (validateConfig) and no other tick may be running (lease).
 *  1. Circuit breaker admits the tick (or it records "tripped" and stops).
 *  2. MECHANIC repairs stuck topics, missing images, stray H1s.
 *  3. Every Nth tick, the corrector re-reads one old post (correction diary).
 *  4. Cadence: if a post went out recently, record silence and stop.
 *  5. Gap ledger + DREAM heuristics aim the planner; backlog refilled if thin.
 *  6. EVOLUTION picks a strategy (exploit / explore / mutate) and a topic.
 *  7. Draft (NEXUS ladder) → immune gate → split-brain review → one revision.
 *  8. Seven-gate fitness check. Pass → image (mandatory) → publish. Fail → silence.
 *  9. Every outcome is sealed into the receipt chain.
 *
 * Silence is a first-class outcome: it posts only when it has something to say.
 */

import { Breaker } from "./breaker.ts";
import { validateConfig, type LivingPressConfig } from "./config.ts";
import { auditOne } from "./corrector.ts";
import { acquireLease, releaseLease } from "../core/lease.ts";
import { internalLinks } from "./links.ts";
import { nearDuplicate, titleSimilarity } from "./similar.ts";
import { heuristics } from "./dream.ts";
import { fitness, strategy, type Strategy } from "./evolution.ts";
import { gapLedger } from "./gaps.ts";
import { blocks, screen } from "./immune.ts";
import { repair } from "./mechanic.ts";
import { demoteH1 } from "./markdown.ts";
import { LadderExhausted, Nexus } from "./nexus.ts";
import { pick, stream } from "./oracle.ts";
import type { Clock, ImageProvider, ModelProvider, Post, Storage, TickOutcome, Topic } from "./ports.ts";
import { draftPrompt, plannerPrompt, reviewPrompt, reviewSystem, revisePrompt, voiceSystem } from "./prompts.ts";
import { sealRun } from "./receipts.ts";

/**
 * dryRun: plan, draft, screen and review exactly as normal, but publish nothing,
 * skip image generation, skip repairs and audits, and return the draft for a
 * human to read. Planned topics are kept. The tick is still sealed ("drafted").
 */
export type Deps = { storage: Storage; models: ModelProvider[]; images: ImageProvider; config: LivingPressConfig; now?: Clock; dryRun?: boolean };
export type TickResult = {
  outcome: TickOutcome; reason: string; slug?: string; title?: string; model?: string; fitness?: number; strategy?: string; receipt: string;
  /** Only on dry runs: what would have been published. */
  draft?: { title: string; excerpt: string; body: string; words: number; gates: Record<string, boolean>; antigens: string[] };
};

type Review = {
  reader_score?: number; skeptic_score?: number; verdict?: string; unsupported_claims?: string[]; caveats?: string[];
  epistemic_status?: string; excerpt?: string; title?: string; keywords?: string[]; advocacy_reads_as_ad?: boolean; revision_note?: string;
};

export function slugify(s: string): string {
  return s
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "") // café -> cafe
    .toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}
export function countWords(md: string): number {
  return md.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`\[\]()]/g, " ").split(/\s+/).filter(Boolean).length;
}
function clean(body: string): string {
  // Some models wrap the whole post in a ```markdown fence; unwrap it.
  const unfenced = body.trim().replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i, "$1");
  const lines = unfenced.trim().split("\n");
  if (lines[0] && /^#\s/.test(lines[0])) lines.shift();
  return demoteH1(lines.join("\n")).trim();
}

type Counters = { ticks: number; published: number };
let leaseSeq = 0;

// Model output is untrusted input. These keep a malformed reply from crashing a tick or reaching the database.
const str = (v: unknown, max: number, fallback = ""): string => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback);
const strList = (v: unknown, maxItems: number, maxLen = 200): string[] =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,;]/) : []).filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, maxLen)).slice(0, maxItems);
const score = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
const EPISTEMIC = new Set(["established", "inference", "opinion", "contested"]);

type CleanReview = {
  reader_score: number; skeptic_score: number; verdict: string; unsupported_claims: string[]; caveats: string[];
  epistemic_status: string; excerpt: string; title: string; keywords: string[]; advocacy_reads_as_ad: boolean; revision_note: string;
};

function sanitizeReview(raw: Review): CleanReview {
  const verdict = ["publish", "revise", "silence"].includes(String(raw.verdict)) ? String(raw.verdict) : "revise";
  return {
    reader_score: score(raw.reader_score),
    skeptic_score: score(raw.skeptic_score),
    verdict,
    unsupported_claims: strList(raw.unsupported_claims, 12, 300),
    caveats: strList(raw.caveats, 3, 300),
    epistemic_status: EPISTEMIC.has(String(raw.epistemic_status)) ? String(raw.epistemic_status) : "inference",
    excerpt: str(raw.excerpt, 200),
    title: str(raw.title, 120),
    keywords: strList(raw.keywords, 8, 60),
    advocacy_reads_as_ad: raw.advocacy_reads_as_ad === true || raw.advocacy_reads_as_ad === ("true" as unknown),
    revision_note: str(raw.revision_note, 600),
  };
}

export async function runTick(deps: Deps): Promise<TickResult> {
  const { storage, images, config: cfg } = deps;
  const now = deps.now ?? Date.now;
  const t0 = now();
  const breaker = new Breaker(storage, now, cfg.breaker);
  const nexus = new Nexus(deps.models, storage, now);
  const runs = await storage.listRuns(50);

  const dry = !!deps.dryRun;
  const seal = async (outcome: TickOutcome, reason: string, extra: Partial<TickResult> & { topic?: string; detail?: Record<string, unknown>; reader?: number; skeptic?: number } = {}) => {
    const run = await sealRun(storage, {
      at: new Date(t0).toISOString(), outcome, reason: reason.slice(0, 500), topic_title: extra.topic ?? null, post_slug: extra.slug ?? null,
      model: extra.model ?? (nexus.lastModel || null), reader_score: extra.reader ?? null, skeptic_score: extra.skeptic ?? null,
      fitness: extra.fitness ?? null, strategy: extra.strategy ?? null, detail: { modelCalls: nexus.calls, ms: now() - t0, ...(dry ? { dryRun: true } : {}), ...(extra.detail ?? {}) },
    });
    return { outcome, reason, slug: extra.slug, title: extra.title, model: run.model ?? undefined, fitness: extra.fitness, strategy: extra.strategy, receipt: run.receipt_hash, ...(extra.draft ? { draft: extra.draft } : {}) };
  };

  // The README promises the engine refuses to run on a half-filled config. Now it does.
  const problems = validateConfig(cfg);
  if (problems.length) return seal("blocked", `Config incomplete (${problems.length} problem(s)); no model was called.`, { detail: { problems: problems.slice(0, 20) } });

  // Lease: overlapping scheduler calls must not draft (and pay for) the same post twice.
  const owner = `${t0}:${runs[0]?.receipt_hash.slice(0, 12) ?? "genesis"}:${(leaseSeq += 1)}`;
  if (!(await acquireLease(storage, "tick", owner, t0))) return seal("silent", "Another tick is still running; skipped.");

  try {
    // Counters live in state. runs.length is capped by the query limit, so it cannot count past 50.
    const counters: Counters = (await storage.getState<Counters>("engine.counters")) ?? { ticks: runs.length, published: -1 };
    const tickNo = counters.ticks;
    counters.ticks += 1;

    const gate = await breaker.admit();
    if (!gate.ok) {
      await storage.setState("engine.counters", counters);
      return seal("tripped", `Circuit breaker open: ${gate.state.lastError ?? "repeated failures"}. Quiet until cooldown or owner reset.`);
    }

    let repairs: string[] = [];
    try {
      if (!dry) repairs = await repair(storage, images);
    } catch (e) {
      repairs = [`mechanic skipped: ${e instanceof Error ? e.message : e}`];
    }

    try {
      const posts = await storage.listPosts(200);
      if (counters.published < posts.length) counters.published = posts.length; // first run after upgrade
      await storage.setState("engine.counters", counters);

      // 3. Correction of old posts — a good habit, never a precondition for today's post.
      let auditError: string | undefined;
      if (!dry && tickNo > 0 && tickNo % cfg.cadence.auditEveryNthTick === 0) {
        try {
          const a = await auditOne(storage, nexus, cfg, t0);
          if (a) {
            await breaker.success();
            const reason = a.amended ? `Corrected "${a.title}": ${a.note}` : `Re-read "${a.title}": ${a.note}.`;
            return seal("audited", reason, { slug: a.slug, title: a.title, detail: { repairs, ...(a.refused ? { refused: a.refused } : {}) } });
          }
        } catch (e) {
          if (e instanceof LadderExhausted) throw e;
          auditError = e instanceof Error ? e.message : String(e); // recorded, never silently swallowed
        }
      }

      const latest = posts[0];
      if (!dry && latest && t0 - Date.parse(latest.published_at) < cfg.cadence.minHoursBetweenPosts * 3600_000) {
        await breaker.success();
        return seal(repairs.length ? "repaired" : "silent", repairs.length ? `Repairs only: ${repairs.length}` : "Posted recently; nothing is overdue.", { detail: { repairs, ...(auditError ? { auditError } : {}) } });
      }

      // 5. Aim + replenish.
      let topics = await storage.listTopics("queued", 60);
      const h = await heuristics(storage);
      const gaps = gapLedger(posts, topics, cfg, t0);
      let planned = 0;
      const duplicates: string[] = [];
      if (topics.length < 3 || gaps.some((g) => g.need === "depth" || g.need === "support")) {
        const { value } = await nexus.json<{ topics?: unknown }>(
          [{ role: "system", content: voiceSystem(cfg, h.avoidPhrases) }, { role: "user", content: plannerPrompt(cfg, gaps, [...posts, ...topics].map((x) => ({ title: x.title, cluster: x.cluster })), h.favorClusters) }],
          { topics: [] },
          { maxTokens: 2200 },
        );
        // Used topics count too: a topic that failed or was rejected should not come back reworded.
        const used = [...(await storage.listTopics("used", 500)), ...(await storage.listTopics("rejected", 500))];
        const knownTitles = [...posts.map((p) => p.title), ...topics.map((t) => t.title), ...used.map((t) => t.title)];
        const known = new Set(knownTitles.map((x) => x.toLowerCase()));
        const proposed = Array.isArray(value.topics) ? (value.topics as Record<string, unknown>[]) : [];
        for (const t of proposed.slice(0, 12)) {
          if (!t || typeof t !== "object") continue;
          const title = str(t.title, 140);
          const angle = str(t.angle, 1000);
          const cluster = String(t.cluster ?? "");
          if (!title || !angle || !cfg.clusters.some((c) => c.id === cluster) || known.has(title.toLowerCase())) continue;
          const dup = nearDuplicate(title, knownTitles);
          if (dup) { duplicates.push(`${title} ~ ${dup.title}`); continue; }
          // Close but not a twin: keep it, but behind everything that is clearly new.
          const crowded = knownTitles.some((k) => titleSimilarity(title, k) >= 0.6);
          known.add(title.toLowerCase());
          knownTitles.push(title);
          const inserted = await storage.insertTopic({
            cluster, title, angle, role: t.role === "pillar" ? "pillar" : "support",
            pain_point: str(t.pain_point, 400, cfg.painPoints[0] ?? ""), keywords: strList(t.keywords, 6, 60),
            gravity: Math.max(1, Math.min(100, Math.round((Number(t.gravity) || 50) * (crowded ? 0.5 : 1)))), status: "queued", attempts: 0,
          });
          if (inserted) planned += 1;
        }
        if (planned) topics = await storage.listTopics("queued", 60);
      }

      // 6. EVOLUTION strategy → topic.
      const strat: Strategy = strategy(posts, runs, cfg, tickNo);
      const topic = chooseTopic(posts, topics, strat);
      if (!topic) {
        await breaker.success();
        return seal("silent", "Nothing worth saying: the backlog is empty after planning.", { strategy: strat.mode, detail: { repairs, planned, ...(duplicates.length ? { duplicatesRejected: duplicates.slice(0, 10) } : {}) } });
      }

      // Advocacy cadence is computed, not felt (from a durable counter, not a capped list).
      const explicit = (counters.published + 1) % cfg.advocacyEvery === 0;
      const pillar = topic.role === "support" ? pillarFor(posts, topic.cluster) : null;
      const mutateNote = strat.mode === "mutate" ? String(runs[0]?.reason ?? "") : undefined;

      // 7. Draft → immune → split brain → (revise) → re-check.
      const sys = voiceSystem(cfg, h.avoidPhrases);
      const maxTokens = topic.role === "pillar" ? 4200 : 2600;
      const d = await nexus.chat([{ role: "system", content: sys }, { role: "user", content: draftPrompt(cfg, topic, posts, pillar?.slug ?? null, explicit, mutateNote) }], { maxTokens, temperature: 0.55 });
      let body = clean(d.text);
      const slugs = posts.map((p) => p.slug);
      let antigens = screen(body, cfg, slugs);
      let reviewParsed = true;
      const review = async () => {
        const res = await nexus.json<Review>([{ role: "system", content: reviewSystem(cfg) }, { role: "user", content: reviewPrompt(topic.title, body, antigens.map((a) => `${a.kind}: ${a.match}`)) }], {}, { maxTokens: 1400, temperature: 0.2 });
        reviewParsed = res.parsed;
        return sanitizeReview(res.value);
      };
      let r = await review();
      let revised = false;

      if (r.verdict === "revise" || antigens.length || r.advocacy_reads_as_ad) {
        const rev = await nexus.chat(
          [{ role: "system", content: sys }, { role: "user", content: revisePrompt(body, r.revision_note, r.unsupported_claims, antigens.map((a) => `${a.kind}: ${a.match}`), !!r.advocacy_reads_as_ad) }],
          { maxTokens, temperature: 0.4 },
        );
        body = clean(rev.text);
        antigens = screen(body, cfg, slugs);
        r = await review();
        revised = true;
      }

      const reader = r.reader_score;
      const skeptic = r.skeptic_score;
      const links = internalLinks(body).length;
      const words = countWords(body);
      const fit = fitness({ reader, skeptic, words, role: topic.role, antigens, links, readsAsAd: !!r.advocacy_reads_as_ad, cfg });

      if (r.verdict === "silence" || blocks(antigens) || !fit.passed) {
        if (!dry) await storage.updateTopic(topic.id, { attempts: topic.attempts + 1 });
        await breaker.success(); // a rejected draft is the engine working, not failing
        const why = !reviewParsed
          ? "Reviewers returned unreadable JSON twice"
          : r.verdict === "silence"
            ? "Reviewers judged it filler"
            : blocks(antigens)
              ? `Safety gate blocked: ${antigens.filter((a) => a.severity === "block").map((a) => a.kind).join(", ")}`
              : `Failed gates: ${Object.entries(fit.gates).filter(([, v]) => !v).map(([k]) => k).join(", ")}`;
        return seal(blocks(antigens) ? "blocked" : "silent", `${why} — "${topic.title}" not published.`, {
          topic: topic.title, reader, skeptic, fitness: fit.score, strategy: strat.mode,
          detail: { gates: fit.gates, antigens, attempt: topic.attempts + 1, words, revised, repairs, ...(auditError ? { auditError } : {}) },
        });
      }

      // The reviewer may "sharpen" a title into one that already exists. Fall back to the planned title, or stay silent.
      const others = posts.map((p) => p.title);
      let title = r.title || topic.title.slice(0, 120);
      if (nearDuplicate(title, others)) title = topic.title.slice(0, 120);
      const twin = nearDuplicate(title, others);
      if (twin) {
        if (!dry) await storage.updateTopic(topic.id, { status: "rejected" });
        await breaker.success();
        return seal("silent", `"${title}" would repeat "${twin.title}"; not published.`, { topic: topic.title, reader, skeptic, fitness: fit.score, strategy: strat.mode, detail: { nearDuplicate: twin } });
      }
      if (dry) {
        await breaker.success();
        return seal("drafted", `Dry run: would publish "${title}" (${topic.role}, ${strat.mode}).`, {
          title, topic: topic.title, reader, skeptic, fitness: fit.score, strategy: strat.mode,
          detail: { gates: fit.gates, words, revised, explicit },
          draft: { title, excerpt: r.excerpt || firstSentence(body), body, words, gates: fit.gates, antigens: antigens.map((a) => `${a.kind}: ${a.match}`) },
        });
      }

      // 8. Image is mandatory.
      const keywords = r.keywords.length ? r.keywords : topic.keywords.slice(0, 8);
      const recent = posts.slice(0, 8).map((p) => p.image_url);
      const img = await images.imageFor({ title, keywords, recentlyUsed: recent });
      if (!img?.url) throw new Error("image provider returned no image — refusing to publish an imageless post");

      const base = slugify(title) || `post-${counters.published + 1}`;
      let slug = base;
      for (let i = 2; await storage.getPostBySlug(slug); i += 1) slug = `${base}-${i}`;
      const post: Omit<Post, "id"> = {
        slug, title, excerpt: r.excerpt || firstSentence(body), body, role: topic.role, cluster: topic.cluster, pillar_slug: pillar?.slug ?? null,
        image_url: img.url, image_alt: str(img.alt, 300, title), advocacy: explicit ? "explicit" : "implicit", keywords,
        caveats: r.caveats, epistemic_status: r.epistemic_status, reader_score: reader, skeptic_score: skeptic,
        fitness: fit.score, published_at: new Date(t0).toISOString(), last_audited_at: null, corrections: [],
      };
      await storage.insertPost(post);
      await storage.updateTopic(topic.id, { status: "used" });
      counters.published += 1;
      await storage.setState("engine.counters", counters);
      await breaker.success();
      return seal("published", `Published "${title}" (${topic.role}, ${strat.mode}).`, {
        slug, title, topic: topic.title, reader, skeptic, fitness: fit.score, strategy: strat.mode,
        detail: { gates: fit.gates, words, revised, explicit, repairs, ...(duplicates.length ? { duplicatesRejected: duplicates.slice(0, 10) } : {}), ...(auditError ? { auditError } : {}) },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const s = await breaker.failure(message);
      return seal(s.status === "open" ? "tripped" : "error", s.status === "open" ? `Breaker tripped after ${s.failures} failures: ${message}` : message, { detail: { repairs } });
    }
  } finally {
    await releaseLease(storage, "tick", owner).catch(() => undefined);
  }
}

function firstSentence(md: string): string {
  const text = md.replace(/```[\s\S]*?```/g, " ").replace(/^#+\s.*$/gm, " ").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`>#-]/g, " ").replace(/\s+/g, " ").trim();
  const m = text.match(/^(.{40,200}?[.!?])(\s|$)/);
  return (m?.[1] ?? text.slice(0, 160)).trim();
}

/** The pillar a new support post should hang from: the one in its cluster with the fewest supports. */
function pillarFor(posts: Post[], cluster: string): Post | null {
  const pillars = posts.filter((p) => p.cluster === cluster && p.role === "pillar");
  if (!pillars.length) return null;
  const supports = (p: Post) => posts.filter((s) => s.pillar_slug === p.slug).length;
  return pillars.slice().sort((a, b) => supports(a) - supports(b) || b.published_at.localeCompare(a.published_at))[0] ?? null;
}

function chooseTopic(posts: Post[], topics: Topic[], strat: Strategy): Topic | null {
  if (!topics.length) return null;
  const by = (f: (t: Topic) => boolean) => topics.filter(f).sort((a, b) => b.gravity - a.gravity || a.title.localeCompare(b.title))[0];
  if (strat.mode === "mutate" && strat.topicTitle) {
    const same = by((t) => t.title === strat.topicTitle);
    if (same) return same;
  }
  // Structural debts come first, in the gap ledger's order: a pillarless cluster, then thin pillars.
  const hasPillar = new Set(posts.filter((p) => p.role === "pillar").map((p) => p.cluster));
  const needPillar = by((t) => t.role === "pillar" && !hasPillar.has(t.cluster));
  if (needPillar) return needPillar;
  const thin = posts.filter((p) => p.role === "pillar" && posts.filter((s) => s.pillar_slug === p.slug).length < 2);
  for (const pillar of thin) {
    const s = by((t) => t.cluster === pillar.cluster && t.role === "support");
    if (s) return s;
  }
  if (strat.cluster) {
    const c = by((t) => t.cluster === strat.cluster);
    if (c) return c;
  }
  const top = topics.slice().sort((a, b) => b.gravity - a.gravity || a.title.localeCompare(b.title));
  const tied = top.filter((t) => t.gravity === top[0]!.gravity);
  return pick(tied, stream("tiebreak", `${posts.length}:${tied.length}`)) ?? null;
}
