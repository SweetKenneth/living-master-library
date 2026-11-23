/** Evidence ingestion, deterministic ignore rules, and shipping-proof policy. */

import type { LivingChangelogConfig } from "./config.ts";
import { canonical, sha256 } from "./oracle.ts";
import type { ChangeEvidence, EvidenceInput, EvidenceKind, EvidenceSource, Storage } from "./ports.ts";

export type SyncReport = { inserted: number; duplicates: number; ignored: number; errors: string[]; bySource: Record<string, number> };

const norm = (s: string) => s.toLowerCase().trim();

export function deterministicIgnore(e: Pick<ChangeEvidence, "title" | "labels" | "kind">, cfg: LivingChangelogConfig): string | null {
  const labels = new Set((e.labels ?? []).map(norm));
  const ignored = cfg.sourcePolicy.ignoredLabels.find((x) => labels.has(norm(x)));
  if (ignored) return `ignored label: ${ignored}`;
  for (const raw of cfg.sourcePolicy.ignoredTitlePatterns) {
    try { if (new RegExp(raw, "i").test(e.title)) return `ignored title pattern: ${raw}`; } catch { /* validateConfig catches this */ }
  }
  if (!cfg.sourcePolicy.publishableKinds.includes(e.kind)) return `kind not publishable: ${e.kind}`;
  return null;
}

export const EVIDENCE_KINDS: readonly EvidenceKind[] = ["commit", "pull_request", "release", "deployment", "issue", "manual"];

/**
 * Does this single item prove something reached production? A deployment or
 * manual event that names a non-production environment ("staging") is never
 * proof, even if a webhook also sent shipped: true.
 */
export function isShipSignal(e: ChangeEvidence, cfg: LivingChangelogConfig): boolean {
  const env = typeof e.metadata?.environment === "string" ? e.metadata.environment.trim().toLowerCase() : "";
  const prodEnv = !env || cfg.sourcePolicy.productionEnvironments.some((p) => p.trim().toLowerCase() === env);
  if (e.kind === "release") return e.metadata?.prerelease !== true && e.metadata?.draft !== true && e.metadata?.shipped !== false;
  if (e.kind === "deployment") return e.metadata?.shipped === true && prodEnv;
  if (e.kind === "manual") return (e.metadata?.shipped === true || e.metadata?.live === true) && prodEnv;
  return false;
}

/**
 * Shipping proof that can look beyond the triage selection. Triage picks the
 * meaningful change (a PR) and often discards the boring deploy event that
 * actually proves it went live, or that deploy was already attached to an
 * earlier entry. So when the selection alone is not proven, recent shipping
 * signals from the pool (pending, used or ignored) are tried, and the ones
 * that cover the selection are attached as provenance.
 */
export function shippingProofWithPool(selected: ChangeEvidence[], pool: ChangeEvidence[], cfg: LivingChangelogConfig): { ok: boolean; reason: string; attached: ChangeEvidence[] } {
  const direct = shippingProof(selected, cfg);
  if (direct.ok) return { ...direct, attached: [] };
  const chosen = new Set(selected.map((e) => e.id));
  const signals = pool
    .filter((e) => !chosen.has(e.id) && isShipSignal(e, cfg))
    .sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at)); // earliest covering deploy first
  if (!signals.length) return { ...direct, attached: [] };
  const details = selected.filter((e) => !isShipSignal(e, cfg));
  const attached = new Map<string, ChangeEvidence>();
  for (const d of details) {
    const already = [...attached.values()].some((s) => shippingProof([d, s], cfg).ok);
    if (already) continue;
    const s = signals.find((x) => shippingProof([d, x], cfg).ok);
    if (!s) return { ...direct, attached: [] };
    attached.set(s.id, s);
  }
  const all = [...selected, ...attached.values()];
  const final = shippingProof(all, cfg);
  return final.ok ? { ok: true, reason: `${final.reason} (via ${attached.size} shipping record(s) outside the selection)`, attached: [...attached.values()] } : { ...direct, attached: [] };
}

export function shippingProof(evidence: ChangeEvidence[], cfg: LivingChangelogConfig): { ok: boolean; reason: string } {
  if (!evidence.length) return { ok: false, reason: "no evidence selected" };
  const policy = cfg.sourcePolicy.shippingPolicy;
  const branch = cfg.sourcePolicy.productionBranch;
  const isExplicitShip = (e: ChangeEvidence) => isShipSignal(e, cfg);

  if (policy === "merge-to-production-is-live") {
    const bad = evidence.filter((e) => e.kind === "pull_request" && !(e.metadata?.merged === true && String(e.metadata?.base_branch ?? "") === branch));
    const direct = evidence.some((e) => e.kind === "pull_request" && e.metadata?.merged === true && String(e.metadata?.base_branch ?? "") === branch);
    if (direct && bad.length === 0) return { ok: true, reason: `selected pull request evidence merged to production branch ${branch}` };
  }
  if (policy === "commit-on-production-is-live") {
    const direct = evidence.some((e) => e.kind === "commit" && String(e.metadata?.branch ?? "") === branch);
    if (direct) return { ok: true, reason: `selected commit evidence observed on production branch ${branch}` };
  }

  const signals = evidence.filter(isExplicitShip);
  if (!signals.length) return { ok: false, reason: "no release/production-deployment evidence proves the change is live" };

  // A release/deployment can prove itself. Detail evidence (PRs/commits/issues)
  // must be linked to at least one shipping signal, otherwise an unrelated deploy
  // could accidentally "prove" a different change.
  const detail = evidence.filter((e) => !isExplicitShip(e));
  const text = (e: ChangeEvidence) => `${e.title}\n${e.summary}`.toLowerCase();
  const sameOrEarlier = (a: ChangeEvidence, b: ChangeEvidence) => Date.parse(b.occurred_at) >= Date.parse(a.occurred_at);
  const covered = (d: ChangeEvidence): boolean => signals.some((ship) => {
    const shipText = text(ship);
    const ext = d.external_id.toLowerCase();
    const title = d.title.toLowerCase();
    const sha = String(d.metadata?.merge_sha ?? d.metadata?.head_sha ?? d.metadata?.sha ?? "").toLowerCase();
    const number = d.kind === "pull_request" ? String(d.metadata?.number ?? "") : "";
    const refs = Array.isArray(ship.metadata?.refs) ? ship.metadata.refs.map((x) => String(x).toLowerCase()) : [];
    if (refs.includes(ext) || (sha && refs.some((r) => r.includes(sha)))) return true;
    if (sha && (String(ship.metadata?.sha ?? "").toLowerCase() === sha || String(ship.metadata?.target ?? "").toLowerCase() === sha)) return true;
    if (number && (shipText.includes(`#${number}`) || refs.includes(`pr:${number}`))) return true;
    if (title.length >= 8 && shipText.includes(title)) return true;

    // A successful production deployment of the same branch after a merge/commit
    // is evidence that the branch state containing that change was deployed.
    if (ship.kind === "deployment" && ship.metadata?.shipped === true && sameOrEarlier(d, ship)) {
      const ref = String(ship.metadata?.ref ?? "");
      if (d.kind === "pull_request" && d.metadata?.merged === true && String(d.metadata?.base_branch ?? "") === ref && ref === branch) return true;
      if (d.kind === "commit" && String(d.metadata?.branch ?? "") === ref && ref === branch) return true;
    }
    // A release targeted at the production branch after the detail evidence can
    // also cover it. Tags/unknown targets require textual/SHA correlation above.
    if (ship.kind === "release" && sameOrEarlier(d, ship) && String(ship.metadata?.target ?? "") === branch) {
      if (d.kind === "pull_request" && String(d.metadata?.base_branch ?? "") === branch) return true;
      if (d.kind === "commit" && String(d.metadata?.branch ?? "") === branch) return true;
    }
    return false;
  });
  const uncovered = detail.filter((d) => !covered(d));
  if (uncovered.length) return { ok: false, reason: `shipping evidence is not linked to selected change evidence: ${uncovered.map((e) => e.external_id).slice(0, 5).join(", ")}` };
  return { ok: true, reason: detail.length ? "shipping evidence is linked to every selected change" : "explicit release/deployment evidence proves shipping" };
}

export async function evidenceExternalId(input: EvidenceInput): Promise<string> {
  if (input.external_id?.trim()) return input.external_id.trim();
  return (await sha256(canonical({ source: input.source, kind: input.kind, title: input.title, occurred_at: input.occurred_at ?? null, url: input.url ?? null }))).slice(0, 40);
}

export async function normalizeEvidence(input: EvidenceInput, nowMs: number): Promise<EvidenceInput> {
  if (!EVIDENCE_KINDS.includes(input.kind)) throw new Error(`kind must be one of ${EVIDENCE_KINDS.join(", ")}`);
  const occurred = Date.parse(input.occurred_at ?? "");
  return {
    source: String(input.source || "manual").slice(0, 120),
    external_id: await evidenceExternalId(input),
    kind: input.kind,
    title: String(input.title ?? "").trim().slice(0, 300),
    summary: String(input.summary ?? "").trim().slice(0, 8000),
    url: input.url ? String(input.url).slice(0, 1200) : null,
    author: input.author ? String(input.author).slice(0, 200) : null,
    labels: [...new Set((Array.isArray(input.labels) ? input.labels : []).map((x) => String(x).trim()).filter(Boolean))].slice(0, 40),
    occurred_at: Number.isFinite(occurred) ? new Date(occurred).toISOString() : new Date(nowMs).toISOString(),
    metadata: input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata) ? input.metadata : {},
  };
}

/** Pull every configured source. Cursor advances only after a source pull succeeds. */
export async function syncSources(storage: Storage, sources: EvidenceSource[], cfg: LivingChangelogConfig, nowMs: number): Promise<SyncReport> {
  const report: SyncReport = { inserted: 0, duplicates: 0, ignored: 0, errors: [], bySource: {} };
  for (const source of sources) {
    const key = `source.cursor.${source.id}`;
    const saved = await storage.getState<{ at?: number }>(key);
    const fallback = nowMs - cfg.sourcePolicy.bootstrapLookbackDays * 86400_000;
    const since = Math.max(0, (saved?.at ?? fallback) - 60_000); // overlap by a minute; DB dedupe is authoritative
    try {
      const pulled = await source.pull(since, nowMs);
      for (const warning of source.warnings?.() ?? []) report.errors.push(`${source.id}: ${warning}`.slice(0, 500));
      let sourceInserted = 0;
      let maxAt = saved?.at ?? fallback;
      for (const raw of pulled) {
        const e = await normalizeEvidence({ ...raw, source: raw.source || source.id }, nowMs);
        if (!e.title) continue;
        const ok = await storage.insertEvidence(e);
        if (ok) { report.inserted += 1; sourceInserted += 1; }
        else report.duplicates += 1;
        const t = Date.parse(e.occurred_at ?? "");
        if (Number.isFinite(t)) maxAt = Math.max(maxAt, t);
      }
      report.bySource[source.id] = sourceInserted;
      await storage.setState(key, { at: Math.max(maxAt, nowMs) });
    } catch (err) {
      report.errors.push(`${source.id}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 500));
    }
  }

  // Deterministic garbage never consumes model context.
  const pending = await storage.listEvidence("pending", cfg.sourcePolicy.maxPendingEvidence);
  for (const e of pending) {
    const reason = deterministicIgnore(e, cfg);
    if (reason) {
      await storage.updateEvidence(e.id, { status: "ignored", ignore_reason: reason });
      report.ignored += 1;
    }
  }
  return report;
}

export function evidenceBlock(evidence: ChangeEvidence[]): string {
  return evidence.map((e) => {
    const meta = Object.entries(e.metadata ?? {}).filter(([, v]) => ["string", "number", "boolean"].includes(typeof v)).slice(0, 12).map(([k, v]) => `${k}=${String(v)}`).join(", ");
    return `[${e.id}] ${e.kind} · ${e.source} · ${e.occurred_at}\nTITLE: ${e.title}\nSUMMARY: ${e.summary || "(none)"}\nLABELS: ${(e.labels ?? []).join(", ") || "(none)"}\nURL: ${e.url ?? "(none)"}\nMETA: ${meta || "(none)"}`;
  }).join("\n\n");
}

export const isDeveloperOnly = (categories: string[]) => categories.length > 0 && categories.every((c) => c === "developer");
export const isShipKind = (kind: EvidenceKind) => kind === "release" || kind === "deployment";
