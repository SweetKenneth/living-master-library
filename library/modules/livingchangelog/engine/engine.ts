/**
 * LivingChangelog — one autonomous publishing tick.
 *
 * Evidence, not a content calendar, drives publication:
 * sync -> deterministic cleanup -> significance triage -> shipping proof ->
 * draft -> immune gate -> Reader/Skeptic -> one revision -> seven gates -> publish.
 * Silence is recorded when the product changed but nothing deserves a public note.
 */

import { Breaker } from "./breaker.ts";
import { validateConfig, type LivingChangelogConfig } from "./config.ts";
import { composeAnnouncement, enqueueAnnouncements, flushAnnouncements, type FlushReport } from "./announce.ts";
import { auditOne } from "./corrector.ts";
import { acquireLease, releaseLease } from "../core/lease.ts";
import { heuristics } from "./dream.ts";
import { evidenceBlock, isDeveloperOnly, shippingProofWithPool, syncSources } from "./evidence.ts";
import { fitness } from "./evolution.ts";
import { blocks, screen } from "./immune.ts";
import { repair } from "./mechanic.ts";
import { demoteH1 } from "./markdown.ts";
import { LadderExhausted, Nexus } from "./nexus.ts";
import type { Announcer, ChangeCategory, ChangeEvidence, ChangelogEntry, Clock, EntryRole, EvidenceSource, ModelProvider, Storage, TickOutcome } from "./ports.ts";
import { draftPrompt, reviewPrompt, reviewSystem, revisePrompt, triagePrompt, voiceSystem } from "./prompts.ts";
import { sealRun } from "./receipts.ts";

export type Deps = { storage: Storage; models: ModelProvider[]; sources?: EvidenceSource[]; announcers?: Announcer[]; config: LivingChangelogConfig; /** Server setup problems (e.g. half-configured channels), shown in /health. */ setupWarnings?: string[]; now?: Clock; dryRun?: boolean };
export type TickResult = {
  outcome: TickOutcome; reason: string; slug?: string; title?: string; model?: string; fitness?: number; strategy?: string; receipt: string;
  draft?: { title: string; excerpt: string; body: string; words: number; categories: ChangeCategory[]; evidence: { id: string; title: string; url: string | null }[]; gates: Record<string, boolean>; antigens: string[]; announcements: { channel: string; text: string }[] };
};

/** What a post would look like when no channel is configured: the strictest common limit (X). */
const PREVIEW_CHANNEL: Announcer = { id: "preview", maxChars: 280, urlCost: 23, async post() { return {}; } };

type RawTriage = { decision?: unknown; reason?: unknown; selected_ids?: unknown; ignored_ids?: unknown; title?: unknown; version?: unknown; categories?: unknown; audience?: unknown; role?: unknown };
type Plan = { decision: "publish" | "hold" | "ignore"; reason: string; selected_ids: string[]; ignored_ids: string[]; title: string; version: string | null; categories: ChangeCategory[]; audience: string[]; role: EntryRole };
type RawReview = { reader_score?: unknown; skeptic_score?: unknown; verdict?: unknown; unsupported_claims?: unknown; inflated_claims?: unknown; caveats?: unknown; epistemic_status?: unknown; excerpt?: unknown; title?: unknown; revision_note?: unknown };
type Review = { reader_score: number; skeptic_score: number; verdict: "publish" | "revise" | "silence"; unsupported_claims: string[]; inflated_claims: string[]; caveats: string[]; epistemic_status: string; excerpt: string; title: string; revision_note: string };

export function slugify(s: string): string {
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90).replace(/-+$/, "");
}
export function countWords(md: string): number {
  return md.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`\[\]()]/g, " ").split(/\s+/).filter(Boolean).length;
}
function clean(body: string): string {
  const unfenced = body.trim().replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i, "$1");
  const lines = unfenced.trim().split("\n");
  if (lines[0] && /^#\s/.test(lines[0])) lines.shift();
  return demoteH1(lines.join("\n")).trim();
}
const str = (v: unknown, max: number, fallback = ""): string => typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;
const strings = (v: unknown, maxItems: number, maxLen = 300): string[] =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,;]/) : []).filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, maxLen)).slice(0, maxItems);
const score = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

function sanitizePlan(raw: RawTriage, pending: ChangeEvidence[], cfg: LivingChangelogConfig): Plan {
  const ids = new Set(pending.map((e) => e.id));
  const decision = ["publish", "hold", "ignore"].includes(String(raw.decision)) ? String(raw.decision) as Plan["decision"] : "hold";
  const selected_ids = [...new Set(strings(raw.selected_ids, cfg.sourcePolicy.maxEvidencePerEntry, 120).filter((id) => ids.has(id)))];
  const ignored_ids = [...new Set(strings(raw.ignored_ids, cfg.sourcePolicy.maxPendingEvidence, 120).filter((id) => ids.has(id) && !selected_ids.includes(id)))];
  const allowed = new Set(cfg.categories);
  const categories = [...new Set(strings(raw.categories, 7, 40).filter((x): x is ChangeCategory => allowed.has(x as ChangeCategory)))];
  return {
    decision,
    reason: str(raw.reason, 500, "No publishable change established."),
    selected_ids,
    ignored_ids,
    title: str(raw.title, 140, "Product update"),
    version: typeof raw.version === "string" && raw.version.trim() ? raw.version.trim().slice(0, 80) : null,
    categories: categories.length ? categories : ["changed"],
    audience: strings(raw.audience, 8, 100),
    role: raw.role === "release" ? "release" : "update",
  };
}

function sanitizeReview(raw: RawReview): Review {
  const verdict = ["publish", "revise", "silence"].includes(String(raw.verdict)) ? String(raw.verdict) as Review["verdict"] : "revise";
  const ep = ["established", "inference", "contested"].includes(String(raw.epistemic_status)) ? String(raw.epistemic_status) : "inference";
  return {
    reader_score: score(raw.reader_score), skeptic_score: score(raw.skeptic_score), verdict,
    unsupported_claims: strings(raw.unsupported_claims, 20, 400), inflated_claims: strings(raw.inflated_claims, 20, 400), caveats: strings(raw.caveats, 5, 300),
    epistemic_status: ep, excerpt: str(raw.excerpt, 220), title: str(raw.title, 140), revision_note: str(raw.revision_note, 700),
  };
}

function firstSentence(md: string): string {
  const text = md.replace(/```[\s\S]*?```/g, " ").replace(/^#+\s.*$/gm, " ").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`>#-]/g, " ").replace(/\s+/g, " ").trim();
  const m = text.match(/^(.{30,210}?[.!?])(\s|$)/);
  return (m?.[1] ?? text.slice(0, 200)).trim();
}

type Counters = { ticks: number; published: number };
let leaseSeq = 0;

/** Recent shipping records in any status, so a deploy that triage discarded (or an earlier entry used) can still prove a change. */
async function proofPool(storage: Storage, cfg: LivingChangelogConfig, nowMs: number): Promise<ChangeEvidence[]> {
  const horizon = nowMs - cfg.sourcePolicy.staleEvidenceDays * 86400_000;
  const [pending, used, ignored] = await Promise.all([
    storage.listEvidence("pending", 200, true), storage.listEvidence("used", 200, true), storage.listEvidence("ignored", 200, true),
  ]);
  return [...pending, ...used, ...ignored].filter((e) => (e.kind === "release" || e.kind === "deployment" || e.kind === "manual") && Date.parse(e.occurred_at) >= horizon);
}

/** A version may only be printed if the evidence actually contains it (tag, release name or text). */
function evidencedVersion(version: string | null, evidence: ChangeEvidence[]): string | null {
  if (!version) return null;
  const v = version.toLowerCase().replace(/^v(?=\d)/, "");
  const haystack = evidence.map((e) => `${e.title}\n${e.summary}\n${String(e.metadata?.tag ?? "")}\n${e.external_id}`).join("\n").toLowerCase();
  return v.length >= 1 && haystack.includes(v) ? version : null;
}

async function bumpAttempts(storage: Storage, evidence: ChangeEvidence[]): Promise<void> {
  await Promise.all(evidence.map((e) => storage.updateEvidence(e.id, { attempts: e.attempts + 1 })));
}

export async function runTick(deps: Deps): Promise<TickResult> {
  const { storage, config: cfg } = deps;
  const now = deps.now ?? Date.now;
  const t0 = now();
  const dry = !!deps.dryRun;
  const announcers = deps.announcers ?? [];
  let announced: FlushReport | null = null;
  const breaker = new Breaker(storage, now, cfg.breaker);
  const nexus = new Nexus(deps.models, storage, now);
  const runs = await storage.listRuns(50);

  const seal = async (outcome: TickOutcome, reason: string, extra: Partial<TickResult> & { entryTitle?: string; detail?: Record<string, unknown>; reader?: number; skeptic?: number } = {}) => {
    const run = await sealRun(storage, {
      at: new Date(t0).toISOString(), outcome, reason: reason.slice(0, 500), entry_title: extra.entryTitle ?? extra.title ?? null, entry_slug: extra.slug ?? null,
      model: extra.model ?? (nexus.lastModel || null), reader_score: extra.reader ?? null, skeptic_score: extra.skeptic ?? null,
      fitness: extra.fitness ?? null, strategy: extra.strategy ?? null,
      detail: {
        modelCalls: nexus.calls, ms: now() - t0, ...(dry ? { dryRun: true } : {}),
        ...(announced && (announced.sent.length || announced.failed.length) ? { announcements: announced } : {}),
        ...(extra.detail ?? {}),
      },
    });
    return { outcome, reason, slug: extra.slug, title: extra.title, model: run.model ?? undefined, fitness: extra.fitness, strategy: extra.strategy, receipt: run.receipt_hash, ...(extra.draft ? { draft: extra.draft } : {}) };
  };

  const problems = validateConfig(cfg);
  if (problems.length) return seal("blocked", `Config incomplete (${problems.length} problem(s)); no model was called.`, { detail: { problems: problems.slice(0, 30) } });

  const owner = `${t0}:${runs[0]?.receipt_hash.slice(0, 12) ?? "genesis"}:${(leaseSeq += 1)}`;
  if (!(await acquireLease(storage, "tick", owner, t0))) return seal("silent", "Another tick is still running; skipped.");

  try {
    const counters: Counters = (await storage.getState<Counters>("engine.counters")) ?? { ticks: runs.length, published: -1 };
    const tickNo = counters.ticks;
    counters.ticks += 1;

    const admitted = await breaker.admit();
    if (!admitted.ok) {
      await storage.setState("engine.counters", counters);
      return seal("tripped", `Circuit breaker open: ${admitted.state.lastError ?? "repeated failures"}. Quiet until cooldown or owner reset.`);
    }

    // Source failures do not erase successfully ingested evidence from other sources.
    const sync = await syncSources(storage, deps.sources ?? [], cfg, t0);
    let repairs: string[] = [];
    try { if (!dry) repairs = await repair(storage, cfg, t0); } catch (err) { repairs = [`mechanic skipped: ${err instanceof Error ? err.message : String(err)}`]; }
    // Deliver announcements that are due (retries, delayed posts) before anything else can return early.
    if (!dry && announcers.length) announced = await flushAnnouncements(storage, announcers, cfg, t0);

    try {
      const entries = await storage.listEntries(200);
      if (counters.published < entries.length) counters.published = entries.length;
      await storage.setState("engine.counters", counters);

      let auditError: string | undefined;
      if (!dry && tickNo > 0 && tickNo % cfg.cadence.auditEveryNthTick === 0) {
        try {
          const a = await auditOne(storage, nexus, cfg, t0);
          if (a) {
            await breaker.success();
            return seal("audited", a.amended ? `Corrected "${a.title}": ${a.note}` : `Re-read "${a.title}": ${a.note}.`, { slug: a.slug, title: a.title, strategy: "audit", detail: { sync, repairs, ...(a.refused ? { refused: a.refused } : {}) } });
          }
        } catch (err) {
          if (err instanceof LadderExhausted) throw err;
          auditError = err instanceof Error ? err.message : String(err);
        }
      }

      const latest = entries[0];
      if (!dry && latest && t0 - Date.parse(latest.published_at) < cfg.cadence.minHoursBetweenEntries * 3600_000) {
        await breaker.success();
        return seal(repairs.length ? "repaired" : "silent", repairs.length ? `Repairs only: ${repairs.length}; publication window still bundling.` : "Recent changelog entry exists; holding new evidence for the bundling window.", { strategy: "bundle", detail: { sync, repairs, ...(auditError ? { auditError } : {}) } });
      }

      const pending = await storage.listEvidence("pending", cfg.sourcePolicy.maxPendingEvidence);
      if (!pending.length) {
        await breaker.success();
        return seal(repairs.length ? "repaired" : "silent", repairs.length ? `Repairs only: ${repairs.length}; no pending release evidence.` : "No pending release evidence.", { strategy: "evidence", detail: { sync, repairs, ...(auditError ? { auditError } : {}) } });
      }

      const h = await heuristics(storage);
      const triage = await nexus.json<RawTriage>(
        [{ role: "system", content: voiceSystem(cfg, h.avoidPhrases) }, { role: "user", content: triagePrompt(cfg, pending, entries) }],
        { decision: "hold", reason: "Triage returned unreadable JSON.", selected_ids: [], ignored_ids: [] },
        { maxTokens: 1800, temperature: 0.15 },
      );
      const plan = sanitizePlan(triage.value, pending, cfg);

      if (!dry) {
        for (const id of plan.ignored_ids) {
          const e = pending.find((x) => x.id === id);
          if (e) await storage.updateEvidence(e.id, { status: "ignored", ignore_reason: `triage: ${plan.reason}` });
        }
      }

      const selected = plan.selected_ids.map((id) => pending.find((e) => e.id === id)).filter((e): e is ChangeEvidence => !!e);
      if (plan.decision !== "publish" || !selected.length) {
        if (!dry) await bumpAttempts(storage, pending.filter((e) => !plan.ignored_ids.includes(e.id)));
        await breaker.success();
        return seal("silent", `Nothing worth publishing yet: ${plan.reason}`, { title: plan.title, entryTitle: plan.title, strategy: "triage", detail: { sync, repairs, pending: pending.length, ignored: plan.ignored_ids, ...(auditError ? { auditError } : {}) } });
      }

      if (isDeveloperOnly(plan.categories) && !cfg.sourcePolicy.publishDeveloperOnly) {
        if (!dry) await bumpAttempts(storage, selected);
        await breaker.success();
        return seal("silent", "Selected evidence is developer-only and developer-only changelog entries are disabled.", { title: plan.title, strategy: "triage", detail: { selected: selected.map((e) => e.id), sync } });
      }

      const ship = isDeveloperOnly(plan.categories)
        ? { ok: true, reason: "developer-only entry does not assert production availability", attached: [] as ChangeEvidence[] }
        : shippingProofWithPool(selected, await proofPool(storage, cfg, t0), cfg);
      if (!ship.ok) {
        if (!dry) await bumpAttempts(storage, selected);
        await breaker.success();
        return seal("silent", `Holding change until shipping is proven: ${ship.reason}.`, { title: plan.title, strategy: "shipping-proof", detail: { selected: selected.map((e) => e.id), policy: cfg.sourcePolicy.shippingPolicy, sync } });
      }

      // The writer and both gates see the shipping records that prove the change, not just the change itself.
      const proven = [...selected, ...ship.attached];
      const version = evidencedVersion(plan.version, proven);
      const role: EntryRole = plan.role === "release" || !!version || proven.some((e) => e.kind === "release") ? "release" : "update";
      const sys = voiceSystem(cfg, h.avoidPhrases);
      const maxTokens = role === "release" ? 1800 : 1000;
      const draft = await nexus.chat([{ role: "system", content: sys }, { role: "user", content: draftPrompt(cfg, { ...plan, version, role }, proven) }], { maxTokens, temperature: 0.35 });
      let body = clean(draft.text);
      let antigens = screen(body, cfg, evidenceBlock(proven));
      let reviewParsed = true;
      const doReview = async (): Promise<Review> => {
        const res = await nexus.json<RawReview>(
          [{ role: "system", content: reviewSystem(cfg) }, { role: "user", content: reviewPrompt(plan.title, body, proven, antigens.map((a) => `${a.kind}: ${a.match}`)) }],
          { reader_score: 0, skeptic_score: 0, verdict: "silence", unsupported_claims: ["review returned unreadable JSON"], inflated_claims: [] },
          { maxTokens: 1300, temperature: 0.05 },
        );
        reviewParsed = res.parsed;
        return sanitizeReview(res.value);
      };
      let review = await doReview();
      let revised = false;

      if (review.verdict === "revise" || antigens.length || review.unsupported_claims.length || review.inflated_claims.length) {
        const rev = await nexus.chat(
          [{ role: "system", content: sys }, { role: "user", content: revisePrompt(body, review.revision_note, review.unsupported_claims, review.inflated_claims, antigens.map((a) => `${a.kind}: ${a.match}`)) }],
          { maxTokens, temperature: 0.2 },
        );
        body = clean(rev.text);
        antigens = screen(body, cfg, evidenceBlock(proven));
        review = await doReview();
        revised = true;
      }

      const words = countWords(body);
      const fit = fitness({
        reader: review.reader_score, skeptic: review.skeptic_score, words, role, antigens,
        unsupported: review.unsupported_claims, inflated: review.inflated_claims, shippingProven: ship.ok, cfg,
      });

      if (review.verdict === "silence" || blocks(antigens) || !fit.passed) {
        if (!dry) await bumpAttempts(storage, selected);
        await breaker.success();
        const why = !reviewParsed ? "Reviewers returned unreadable JSON twice" : review.verdict === "silence" ? "Reviewers judged the entry unhelpful" : blocks(antigens) ? `Safety gate blocked: ${antigens.filter((a) => a.severity === "block").map((a) => a.kind).join(", ")}` : `Failed gates: ${Object.entries(fit.gates).filter(([, ok]) => !ok).map(([k]) => k).join(", ")}`;
        return seal(blocks(antigens) ? "blocked" : "silent", `${why} — "${plan.title}" not published.`, { title: plan.title, reader: review.reader_score, skeptic: review.skeptic_score, fitness: fit.score, strategy: "review", detail: { gates: fit.gates, antigens, selected: selected.map((e) => e.id), words, revised, sync, repairs } });
      }

      const title = review.title || plan.title;
      const excerpt = review.excerpt || firstSentence(body);
      if (dry) {
        await breaker.success();
        return seal("drafted", `Dry run: would publish "${title}" from ${selected.length} evidence item(s).`, {
          title, reader: review.reader_score, skeptic: review.skeptic_score, fitness: fit.score, strategy: "evidence",
          detail: { gates: fit.gates, selected: selected.map((e) => e.id), words, revised, shipping: ship.reason, sync },
          draft: {
            title, excerpt, body, words, categories: plan.categories, evidence: proven.map((e) => ({ id: e.id, title: e.title, url: e.url })), gates: fit.gates, antigens: antigens.map((a) => `${a.kind}: ${a.match}`),
            announcements: (announcers.length ? announcers : [PREVIEW_CHANNEL]).map((a) => ({ channel: a.id, text: composeAnnouncement({ slug: slugify(title) || "update", title, excerpt, version, categories: plan.categories }, cfg, a).text })),
          },
        });
      }

      const base = slugify(title) || `update-${counters.published + 1}`;
      let slug = base;
      for (let i = 2; await storage.getEntryBySlug(slug); i += 1) slug = `${base}-${i}`;
      const entry: Omit<ChangelogEntry, "id"> = {
        slug, title, excerpt, body, role, version, categories: plan.categories,
        evidence_ids: proven.map((e) => e.id), evidence_urls: [...new Set(proven.map((e) => e.url).filter((u): u is string => !!u))], audience: plan.audience,
        caveats: review.caveats, epistemic_status: review.epistemic_status, reader_score: review.reader_score, skeptic_score: review.skeptic_score,
        fitness: fit.score, published_at: new Date(t0).toISOString(), last_audited_at: null, corrections: [],
      };
      const saved = await storage.insertEntry(entry);
      // Attached shipping records keep their status unless still pending: one deploy can prove many entries.
      for (const e of proven) if (e.status === "pending") await storage.updateEvidence(e.id, { status: "used" });
      counters.published += 1;
      await storage.setState("engine.counters", counters);
      // Queue the posts now (text fixed and receipted), then send whatever is due. Never fails the tick.
      let queued: { channel: string; text: string }[] = [];
      if (announcers.length) {
        try {
          queued = await enqueueAnnouncements(storage, saved, cfg, announcers, t0);
          const second = await flushAnnouncements(storage, announcers, cfg, t0);
          announced = { sent: [...(announced?.sent ?? []), ...second.sent], failed: [...(announced?.failed ?? []), ...second.failed], waiting: second.waiting };
        } catch (err) { queued = [{ channel: "error", text: err instanceof Error ? err.message : String(err) }]; }
      }
      await breaker.success();
      return seal("published", `Published "${title}" from ${selected.length} verified evidence item(s).`, { slug, title, reader: review.reader_score, skeptic: review.skeptic_score, fitness: fit.score, strategy: "evidence", detail: { gates: fit.gates, selected: selected.map((e) => e.id), attachedProof: ship.attached.map((e) => e.id), categories: plan.categories, version, ...(plan.version && !version ? { versionDropped: plan.version } : {}), words, revised, shipping: ship.reason, sync, repairs, ...(queued.length ? { announcementsQueued: queued } : {}) } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const state = await breaker.failure(message);
      return seal(state.status === "open" ? "tripped" : "error", state.status === "open" ? `Breaker tripped after ${state.failures} failures: ${message}` : message, { detail: { sync, repairs } });
    }
  } finally {
    await releaseLease(storage, "tick", owner).catch(() => undefined);
  }
}
