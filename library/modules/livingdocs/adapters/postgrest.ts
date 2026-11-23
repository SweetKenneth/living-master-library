/** PostgREST storage adapter. Server-side only: use a service key; the schema is private by default. */
import type { ArtifactInput, AuditFinding, CanonicalGuide, FindingStatus, GuidePreset, Run, SectionId, SourceArtifact, Storage, TruthClaim } from "../engine/ports.ts";

const iso = (v: unknown): string => { const t = Date.parse(String(v)); return Number.isFinite(t) ? new Date(t).toISOString() : String(v); };
const lim = (n: number) => Math.max(1, Math.min(1000, Math.floor(n)));
const q = encodeURIComponent;
const normArtifact = (r: SourceArtifact): SourceArtifact => ({ ...r, observed_at: iso(r.observed_at), ingested_at: iso(r.ingested_at), bytes: Number(r.bytes ?? 0), metadata: r.metadata ?? {} });
const normClaim = (r: TruthClaim): TruthClaim => ({ ...r, confidence: Number(r.confidence ?? 0), sources: r.sources ?? [], tags: r.tags ?? [], contradictions: r.contradictions ?? [], metadata: r.metadata ?? {}, first_seen_at: iso(r.first_seen_at), last_verified_at: iso(r.last_verified_at) });
const normGuide = (r: CanonicalGuide): CanonicalGuide => ({ ...r, version: Number(r.version), generated_at: iso(r.generated_at), source_ids: r.source_ids ?? [], claim_ids: r.claim_ids ?? [], sections: r.sections ?? [], audit_summary: r.audit_summary ?? {}, verification: r.verification ?? {}, metadata: r.metadata ?? {} } as CanonicalGuide);
const normFinding = (r: AuditFinding): AuditFinding => ({ ...r, at: iso(r.at), claim_ids: r.claim_ids ?? [], source_ids: r.source_ids ?? [], metadata: r.metadata ?? {} });
const normRun = ({ seq: _seq, ...r }: Run & { seq?: number }): Run => ({ ...r, at: iso(r.at), source_count: r.source_count == null ? null : Number(r.source_count), claim_count: r.claim_count == null ? null : Number(r.claim_count), finding_count: r.finding_count == null ? null : Number(r.finding_count), guide_version: r.guide_version == null ? null : Number(r.guide_version), score: r.score == null ? null : Number(r.score) });

export class StorageError extends Error { status: number; constructor(status: number, message: string) { super(`storage ${status}: ${message}`); this.status = status; } }

export function postgrestStorage(opts: { url: string; serviceKey: string; schema?: string; timeoutMs?: number }): Storage {
  if (!opts.url || !opts.serviceKey) throw new Error("postgrestStorage needs url and serviceKey");
  const base = `${opts.url.replace(/\/+$/, "")}/rest/v1`;
  const headers: Record<string, string> = { apikey: opts.serviceKey, "content-type": "application/json" };
  if (opts.serviceKey.split(".").length === 3) headers.authorization = `Bearer ${opts.serviceKey}`;
  if (opts.schema) { headers["accept-profile"] = opts.schema; headers["content-profile"] = opts.schema; }
  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${base}/${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) }, signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000) });
    const text = await res.text(); if (!res.ok) throw new StorageError(res.status, text.slice(0, 500)); return (text ? JSON.parse(text) : null) as T;
  }
  return {
    listArtifacts: async (n, includeDeleted) => (await call<SourceArtifact[]>(`livingdocs_artifacts?select=*&${includeDeleted ? "" : "status=eq.active&"}order=path.asc&limit=${lim(n)}`)).map(normArtifact),
    getArtifactByExternalId: async (source, id) => { const r = (await call<SourceArtifact[]>(`livingdocs_artifacts?select=*&source=eq.${q(source)}&external_id=eq.${q(id)}&limit=1`))[0]; return r ? normArtifact(r) : null; },
    upsertArtifact: async (input: ArtifactInput) => {
      const old = (await call<SourceArtifact[]>(`livingdocs_artifacts?select=*&source=eq.${q(input.source)}&external_id=eq.${q(input.external_id)}&limit=1`))[0];
      const change = !old ? "inserted" as const : old.content_hash !== input.content_hash || old.status === "deleted" ? "changed" as const : "unchanged" as const;
      const row = (await call<SourceArtifact[]>("livingdocs_artifacts?on_conflict=source,external_id", { method: "POST", body: JSON.stringify({ ...input, status: "active" }), headers: { prefer: "resolution=merge-duplicates,return=representation" } }))[0]!;
      return { artifact: normArtifact(row), change };
    },
    markArtifactsDeleted: async (source, activeIds, observedAt) => {
      const current = (await call<SourceArtifact[]>(`livingdocs_artifacts?select=id,external_id,metadata&source=eq.${q(source)}&status=eq.active&limit=1000`)); const keep = new Set(activeIds); const ids: string[] = [];
      for (const a of current) if (!keep.has(a.external_id)) { await call(`livingdocs_artifacts?id=eq.${q(a.id)}`, { method: "PATCH", body: JSON.stringify({ status: "deleted", metadata: { ...(a.metadata ?? {}), deleted_observed_at: observedAt } }), headers: { prefer: "return=minimal" } }); ids.push(a.id); }
      return ids;
    },
    listClaims: async (n) => (await call<TruthClaim[]>(`livingdocs_claims?select=*&order=section.asc&limit=${lim(n)}`)).map(normClaim),
    getClaimsBySection: async (section: SectionId) => (await call<TruthClaim[]>(`livingdocs_claims?select=*&section=eq.${q(section)}&order=statement.asc&limit=1000`)).map(normClaim),
    getClaimByKey: async (key) => { const r = (await call<TruthClaim[]>(`livingdocs_claims?select=*&claim_key=eq.${q(key)}&limit=1`))[0]; return r ? normClaim(r) : null; },
    upsertClaim: async (c) => normClaim((await call<TruthClaim[]>("livingdocs_claims?on_conflict=claim_key", { method: "POST", body: JSON.stringify(c), headers: { prefer: "resolution=merge-duplicates,return=representation" } }))[0]!),
    updateClaim: async (id, patch) => { await call(`livingdocs_claims?id=eq.${q(id)}`, { method: "PATCH", body: JSON.stringify(patch), headers: { prefer: "return=minimal" } }); },
    listGuides: async (n) => (await call<CanonicalGuide[]>(`livingdocs_guides?select=*&order=generated_at.desc&limit=${lim(n)}`)).map(normGuide),
    getLatestGuide: async (preset?: GuidePreset) => { const r = (await call<CanonicalGuide[]>(`livingdocs_guides?select=*${preset ? `&preset=eq.${q(preset)}` : ""}&order=generated_at.desc&limit=1`))[0]; return r ? normGuide(r) : null; },
    insertGuide: async (g) => normGuide((await call<CanonicalGuide[]>("livingdocs_guides", { method: "POST", body: JSON.stringify(g), headers: { prefer: "return=representation" } }))[0]!),
    listFindings: async (n, status?: FindingStatus) => (await call<AuditFinding[]>(`livingdocs_findings?select=*${status ? `&status=eq.${q(status)}` : ""}&order=at.desc&limit=${lim(n)}`)).map(normFinding),
    insertFinding: async (f) => normFinding((await call<AuditFinding[]>("livingdocs_findings", { method: "POST", body: JSON.stringify(f), headers: { prefer: "return=representation" } }))[0]!),
    updateFinding: async (id, patch) => { await call(`livingdocs_findings?id=eq.${q(id)}`, { method: "PATCH", body: JSON.stringify(patch), headers: { prefer: "return=minimal" } }); },
    listRuns: async (n) => (await call<(Run & { seq?: number })[]>(`livingdocs_runs?select=*&order=seq.desc&limit=${lim(n)}`)).map(normRun),
    listRunsPage: async (n, offset) => (await call<(Run & { seq?: number })[]>(`livingdocs_runs?select=*&order=seq.desc&limit=${lim(n)}&offset=${Math.max(0, Math.floor(offset))}`)).map(normRun),
    insertRun: async (r) => { await call("livingdocs_runs", { method: "POST", body: JSON.stringify(r), headers: { prefer: "return=minimal" } }); },
    getState: async (key) => ((await call<{ value: unknown }[]>(`livingdocs_state?select=value&key=eq.${q(key)}`))[0]?.value ?? null) as never,
    setState: async (key, value) => { await call("livingdocs_state?on_conflict=key", { method: "POST", body: JSON.stringify({ key, value: value ?? {}, updated_at: new Date().toISOString() }), headers: { prefer: "resolution=merge-duplicates,return=minimal" } }); },
  };
}
