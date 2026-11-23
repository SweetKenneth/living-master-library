/** In-memory storage for tests, demos and dry runs. */
import type { ArtifactInput, AuditFinding, CanonicalGuide, FindingStatus, GuidePreset, Run, SectionId, SourceArtifact, Storage, TruthClaim } from "../engine/ports.ts";

const clone = <T>(v: T): T => structuredClone(v);
let seq = 0;
const nid = (prefix = "mem") => `${prefix}_${++seq}`;

export function memoryStorage(seed?: { artifacts?: SourceArtifact[]; claims?: TruthClaim[]; guides?: CanonicalGuide[]; findings?: AuditFinding[]; runs?: Run[] }): Storage & { dump(): unknown } {
  for (const row of [...(seed?.artifacts ?? []), ...(seed?.claims ?? []), ...(seed?.guides ?? []), ...(seed?.findings ?? []), ...(seed?.runs ?? [])]) {
    const m = String((row as { id?: string }).id ?? "").match(/_(\d+)$/); if (m) seq = Math.max(seq, Number(m[1]));
  }
  const artifacts = clone(seed?.artifacts ?? []); const claims = clone(seed?.claims ?? []); const guides = clone(seed?.guides ?? []);
  const findings = clone(seed?.findings ?? []); const runs = clone(seed?.runs ?? []); const state = new Map<string, unknown>();
  return {
    async listArtifacts(limit, includeDeleted) { return clone(artifacts.filter((x) => includeDeleted || x.status === "active").sort((a, b) => a.path.localeCompare(b.path)).slice(0, limit)); },
    async getArtifactByExternalId(source, externalId) { return clone(artifacts.find((x) => x.source === source && x.external_id === externalId) ?? null); },
    async upsertArtifact(input: ArtifactInput) {
      const old = artifacts.find((x) => x.source === input.source && x.external_id === input.external_id);
      if (!old) { const artifact: SourceArtifact = { ...clone(input), id: nid("src"), ingested_at: new Date().toISOString(), status: "active" }; artifacts.push(artifact); return { artifact: clone(artifact), change: "inserted" as const }; }
      const changed = old.content_hash !== input.content_hash || old.status === "deleted";
      Object.assign(old, clone(input), { status: "active" as const });
      return { artifact: clone(old), change: changed ? "changed" as const : "unchanged" as const };
    },
    async markArtifactsDeleted(source, activeExternalIds, observedAt) {
      const active = new Set(activeExternalIds); const ids: string[] = [];
      for (const a of artifacts) if (a.source === source && a.status === "active" && !active.has(a.external_id)) { a.status = "deleted"; a.metadata = { ...a.metadata, deleted_observed_at: observedAt }; ids.push(a.id); }
      return ids;
    },
    async listClaims(limit) { return clone([...claims].sort((a, b) => a.section.localeCompare(b.section) || a.statement.localeCompare(b.statement)).slice(0, limit)); },
    async getClaimsBySection(section: SectionId) { return clone(claims.filter((c) => c.section === section)); },
    async getClaimByKey(key) { return clone(claims.find((c) => c.claim_key === key) ?? null); },
    async upsertClaim(c) {
      const old = claims.find((x) => x.claim_key === c.claim_key);
      if (old) { const first = old.first_seen_at; Object.assign(old, clone(c), { first_seen_at: first }); return clone(old); }
      const row: TruthClaim = { ...clone(c), id: nid("claim") }; claims.push(row); return clone(row);
    },
    async updateClaim(id, patch) { const c = claims.find((x) => x.id === id); if (c) Object.assign(c, clone(patch)); },
    async listGuides(limit) { return clone([...guides].sort((a, b) => b.generated_at.localeCompare(a.generated_at)).slice(0, limit)); },
    async getLatestGuide(preset?: GuidePreset) { return clone([...guides].filter((g) => !preset || g.preset === preset).sort((a, b) => b.generated_at.localeCompare(a.generated_at))[0] ?? null); },
    async insertGuide(g) { const row: CanonicalGuide = { ...clone(g), id: nid("guide") }; guides.push(row); return clone(row); },
    async listFindings(limit, status?: FindingStatus) { return clone([...findings].filter((f) => !status || f.status === status).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)); },
    async insertFinding(f) { const row: AuditFinding = { ...clone(f), id: nid("finding") }; findings.push(row); return clone(row); },
    async updateFinding(id, patch) { const f = findings.find((x) => x.id === id); if (f) Object.assign(f, clone(patch)); },
    async listRuns(limit) { return clone([...runs].reverse().slice(0, limit)); },
    async listRunsPage(limit, offset) { return clone([...runs].reverse().slice(offset, offset + limit)); },
    async insertRun(r) { if (runs.some((x) => x.prev_hash === r.prev_hash || x.receipt_hash === r.receipt_hash)) throw new Error("409 duplicate prev_hash (receipt fork)"); runs.push({ ...clone(r), id: nid("run") }); },
    async getState(key) { return (state.has(key) ? clone(state.get(key)) : null) as never; },
    async setState(key, value) { state.set(key, clone(value)); },
    async incrementRateBucket(surface, signature, minute) { const key = `defense.${surface}`; const prev = state.get(key) as { minute?: number; counts?: Record<string, number> } | undefined; const win = prev?.minute === minute && prev.counts ? clone(prev) as { minute: number; counts: Record<string, number> } : { minute, counts: {} }; const n = (win.counts[signature] ?? 0) + 1; win.counts[signature] = n; state.set(key, clone(win)); return n; },
    async tryLease(name, owner, untilMs, nowMs) { const cur = state.get(`lease.${name}`) as { owner: string; until: number } | undefined; if (cur && cur.until > nowMs && cur.owner !== owner) return false; state.set(`lease.${name}`, { owner, until: untilMs }); return true; },
    async releaseLease(name, owner) { const cur = state.get(`lease.${name}`) as { owner: string } | undefined; if (cur?.owner === owner) state.set(`lease.${name}`, { owner: "", until: 0 }); },
    dump() { return { artifacts: clone(artifacts), claims: clone(claims), guides: clone(guides), findings: clone(findings), runs: clone(runs), state: Object.fromEntries(state) }; },
  };
}
