/** PostgREST storage adapter. Server-side only: pass a service key. */
import type { ChangeEvidence, ChangelogEntry, EvidenceInput, Run, Storage } from "../engine/ports.ts";

const iso = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  const t = Date.parse(String(v)); return Number.isFinite(t) ? new Date(t).toISOString() : String(v);
};
const num = (v: unknown): number | null => v === null || v === undefined || v === "" ? null : Number(v);

function normEntry(r: ChangelogEntry): ChangelogEntry {
  return { ...r, published_at: iso(r.published_at)!, last_audited_at: iso(r.last_audited_at), categories: r.categories ?? [], evidence_ids: r.evidence_ids ?? [], evidence_urls: r.evidence_urls ?? [], audience: r.audience ?? [], caveats: r.caveats ?? [], corrections: r.corrections ?? [], fitness: Number(r.fitness ?? 0) };
}
function normEvidence(r: ChangeEvidence): ChangeEvidence {
  return { ...r, occurred_at: iso(r.occurred_at)!, ingested_at: iso(r.ingested_at)!, labels: r.labels ?? [], metadata: r.metadata ?? {}, attempts: Number(r.attempts ?? 0) };
}
function normRun({ seq: _seq, ...r }: Run & { seq?: number }): Run {
  return { ...r, at: iso(r.at)!, fitness: num(r.fitness), reader_score: num(r.reader_score), skeptic_score: num(r.skeptic_score) };
}

export class StorageError extends Error {
  status: number;
  constructor(status: number, message: string) { super(`storage ${status}: ${message}`); this.status = status; }
}

export function postgrestStorage(opts: { url: string; serviceKey: string; schema?: string; timeoutMs?: number }): Storage {
  if (!opts.url || !opts.serviceKey) throw new Error("postgrestStorage needs url and serviceKey");
  const base = `${opts.url.replace(/\/+$/, "")}/rest/v1`;
  const headers: Record<string, string> = { apikey: opts.serviceKey, "content-type": "application/json" };
  if (opts.serviceKey.split(".").length === 3) headers.authorization = `Bearer ${opts.serviceKey}`;
  if (opts.schema) { headers["accept-profile"] = opts.schema; headers["content-profile"] = opts.schema; }
  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${base}/${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) }, signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000) });
    const text = await res.text(); if (!res.ok) throw new StorageError(res.status, text.slice(0, 300)); return (text ? JSON.parse(text) : null) as T;
  }
  const q = encodeURIComponent;
  const lim = (n: number) => Math.max(1, Math.min(1000, Math.floor(n)));
  const getState = async (k: string) => ((await call<{ value: unknown }[]>(`livingchangelog_state?select=value&key=eq.${q(k)}`))[0]?.value ?? null) as never;
  const setState = async (k: string, v: unknown) => { await call("livingchangelog_state?on_conflict=key", { method: "POST", body: JSON.stringify({ key: k, value: v ?? {}, updated_at: new Date().toISOString() }), headers: { prefer: "resolution=merge-duplicates,return=minimal" } }); };
  let rpcLease = true; let rpcRate = true;
  return {
    listEntries: async (n) => (await call<ChangelogEntry[]>(`livingchangelog_entries?select=*&status=eq.published&order=published_at.desc&limit=${lim(n)}`)).map(normEntry),
    getEntryBySlug: async (slug) => { const r = (await call<ChangelogEntry[]>(`livingchangelog_entries?select=*&slug=eq.${q(slug)}&limit=1`))[0]; return r ? normEntry(r) : null; },
    insertEntry: async (e) => normEntry((await call<ChangelogEntry[]>("livingchangelog_entries", { method: "POST", body: JSON.stringify({ ...e, status: "published" }), headers: { prefer: "return=representation" } }))[0]!),
    updateEntry: async (id, patch) => { await call(`livingchangelog_entries?id=eq.${q(id)}`, { method: "PATCH", body: JSON.stringify(patch), headers: { prefer: "return=minimal" } }); },

    listEvidence: async (status, n, newestFirst) => (await call<ChangeEvidence[]>(`livingchangelog_evidence?select=*&status=eq.${q(status)}&order=occurred_at.${newestFirst ? "desc" : "asc"}&limit=${lim(n)}`)).map(normEvidence),
    getEvidenceByIds: async (ids) => {
      if (!ids.length) return [];
      const list = ids.map((id) => q(id)).join(",");
      return (await call<ChangeEvidence[]>(`livingchangelog_evidence?select=*&id=in.(${list})&limit=${lim(ids.length)}`)).map(normEvidence);
    },
    insertEvidence: async (e: EvidenceInput) => {
      try {
        await call("livingchangelog_evidence", { method: "POST", body: JSON.stringify({ ...e, status: "pending", attempts: 0 }), headers: { prefer: "return=minimal" } }); return true;
      } catch (err) {
        if (err instanceof StorageError && err.status === 409) return false;
        throw err;
      }
    },
    updateEvidence: async (id, patch) => { await call(`livingchangelog_evidence?id=eq.${q(id)}`, { method: "PATCH", body: JSON.stringify(patch), headers: { prefer: "return=minimal" } }); },

    listRuns: async (n) => (await call<(Run & { seq?: number })[]>(`livingchangelog_runs?select=*&order=seq.desc&limit=${lim(n)}`)).map(normRun),
    listRunsPage: async (n, offset) => (await call<(Run & { seq?: number })[]>(`livingchangelog_runs?select=*&order=seq.desc&limit=${lim(n)}&offset=${Math.max(0, Math.floor(offset))}`)).map(normRun),
    insertRun: async (r) => { await call("livingchangelog_runs", { method: "POST", body: JSON.stringify(r), headers: { prefer: "return=minimal" } }); },

    getState, setState,
    incrementRateBucket: async (surface, signature, minute) => {
      if (rpcRate) {
        try { return Number(await call<number>("rpc/livingchangelog_rate_hit", { method: "POST", body: JSON.stringify({ p_surface: surface, p_signature: signature, p_minute: minute }) })); }
        catch (err) { if (!(err instanceof StorageError) || (err.status !== 404 && err.status !== 400)) throw err; rpcRate = false; }
      }
      const key = `defense.${surface}`;
      const prev = (await getState(key)) as { minute?: number; counts?: Record<string, number> } | null;
      const win: { minute: number; counts: Record<string, number> } = prev?.minute === minute && prev.counts ? { minute: prev.minute, counts: prev.counts } : { minute, counts: {} };
      const n = (win.counts[signature] ?? 0) + 1; win.counts[signature] = n; await setState(key, win); return n;
    },
    tryLease: async (name, owner, untilMs, nowMs) => {
      if (rpcLease) {
        try { return (await call<boolean>("rpc/livingchangelog_try_lease", { method: "POST", body: JSON.stringify({ p_name: name, p_owner: owner, p_until_ms: untilMs, p_now_ms: nowMs }) })) === true; }
        catch (err) { if (!(err instanceof StorageError) || (err.status !== 404 && err.status !== 400)) throw err; rpcLease = false; }
      }
      const cur = (await getState(`lease.${name}`)) as { owner: string; until: number } | null;
      if (cur && cur.until > nowMs && cur.owner !== owner) return false;
      await setState(`lease.${name}`, { owner, until: untilMs }); return ((await getState(`lease.${name}`)) as { owner: string } | null)?.owner === owner;
    },
    releaseLease: async (name, owner) => {
      if (rpcLease) {
        try { await call("rpc/livingchangelog_release_lease", { method: "POST", body: JSON.stringify({ p_name: name, p_owner: owner }) }); return; }
        catch (err) { if (!(err instanceof StorageError) || (err.status !== 404 && err.status !== 400)) throw err; rpcLease = false; }
      }
      const cur = (await getState(`lease.${name}`)) as { owner: string } | null;
      if (cur?.owner === owner) await setState(`lease.${name}`, { owner: "", until: 0 });
    },
  };
}
