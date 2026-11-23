/** In-memory storage for tests, demos and local evaluation. */
import type { ChangeEvidence, ChangelogEntry, EvidenceInput, Run, Storage } from "../engine/ports.ts";

const clone = <T>(v: T): T => structuredClone(v);
let seq = 0;
const nid = () => `mem_${++seq}`;

export function memoryStorage(seed?: { entries?: ChangelogEntry[]; evidence?: ChangeEvidence[]; runs?: Run[] }): Storage & { dump(): unknown } {
  const entries = clone(seed?.entries ?? []);
  const evidence = clone(seed?.evidence ?? []);
  const runs = clone(seed?.runs ?? []);
  const state = new Map<string, unknown>();
  return {
    async listEntries(limit) { return clone([...entries].sort((a, b) => b.published_at.localeCompare(a.published_at)).slice(0, limit)); },
    async getEntryBySlug(slug) { return clone(entries.find((x) => x.slug === slug) ?? null); },
    async insertEntry(e) { const row = { ...clone(e), id: nid() }; entries.push(row); return clone(row); },
    async updateEntry(id, patch) { const e = entries.find((x) => x.id === id); if (e) Object.assign(e, clone(patch)); },

    async listEvidence(status, limit, newestFirst) { const dir = newestFirst ? -1 : 1; return clone(evidence.filter((e) => e.status === status).sort((a, b) => dir * a.occurred_at.localeCompare(b.occurred_at)).slice(0, limit)); },
    async getEvidenceByIds(ids) { const set = new Set(ids); return clone(evidence.filter((e) => set.has(e.id))); },
    async insertEvidence(input: EvidenceInput) {
      if (evidence.some((e) => e.source === input.source && e.external_id === input.external_id)) return false;
      evidence.push({ ...clone(input), id: nid(), ingested_at: new Date().toISOString(), status: "pending", attempts: 0, ignore_reason: null, occurred_at: input.occurred_at ?? new Date().toISOString() });
      return true;
    },
    async updateEvidence(id, patch) { const e = evidence.find((x) => x.id === id); if (e) Object.assign(e, clone(patch)); },

    async listRuns(limit) { return clone([...runs].reverse().slice(0, limit)); },
    async listRunsPage(limit, offset) { return clone([...runs].reverse().slice(offset, offset + limit)); },
    async insertRun(r) {
      if (runs.some((x) => x.prev_hash === r.prev_hash || x.receipt_hash === r.receipt_hash)) throw new Error("409 duplicate prev_hash (receipt fork)");
      runs.push({ ...clone(r), id: nid() });
    },
    async getState(key) { return (state.has(key) ? clone(state.get(key)) : null) as never; },
    async setState(key, value) { state.set(key, clone(value)); },
    async incrementRateBucket(surface, signature, minute) {
      const key = `defense.${surface}`;
      const prev = state.get(key) as { minute?: number; counts?: Record<string, number> } | undefined;
      const win: { minute: number; counts: Record<string, number> } = prev?.minute === minute && prev.counts ? clone(prev) as never : { minute, counts: {} };
      const n = (win.counts[signature] ?? 0) + 1; win.counts[signature] = n; state.set(key, clone(win)); return n;
    },
    async tryLease(name, owner, untilMs, nowMs) {
      const cur = state.get(`lease.${name}`) as { owner: string; until: number } | undefined;
      if (cur && cur.until > nowMs && cur.owner !== owner) return false;
      state.set(`lease.${name}`, { owner, until: untilMs }); return true;
    },
    async releaseLease(name, owner) {
      const cur = state.get(`lease.${name}`) as { owner: string } | undefined;
      if (cur?.owner === owner) state.set(`lease.${name}`, { owner: "", until: 0 });
    },
    dump() { return { entries: clone(entries), evidence: clone(evidence), runs: clone(runs), state: Object.fromEntries(state) }; },
  };
}
