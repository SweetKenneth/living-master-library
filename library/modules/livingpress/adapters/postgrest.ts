/**
 * Storage over any PostgREST endpoint (Lovable Cloud / Supabase / self-hosted
 * PostgREST) using plain fetch — no SDK. Server-side only: pass a service key.
 * Tables come from schema.sql.
 *
 * Rows are normalized on the way out: Postgres returns timestamps as
 * `2026-01-01T00:00:00+00:00` and may return numerics as strings; the engine
 * (and the receipt hashes) expect ISO-8601 `...Z` strings and numbers.
 */
import type { Post, Run, Storage, Topic } from "../engine/ports.ts";

const iso = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? new Date(t).toISOString() : String(v);
};
const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));

function normPost(r: Post): Post {
  return { ...r, published_at: iso(r.published_at)!, last_audited_at: iso(r.last_audited_at), fitness: Number(r.fitness ?? 0), keywords: r.keywords ?? [], caveats: r.caveats ?? [], corrections: r.corrections ?? [] };
}
function normRun({ seq: _seq, ...r }: Run & { seq?: number }): Run {
  return { ...r, at: iso(r.at)!, fitness: num(r.fitness), reader_score: num(r.reader_score), skeptic_score: num(r.skeptic_score) };
}

export class StorageError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(`storage ${status}: ${message}`);
    this.status = status;
  }
}

export function postgrestStorage(opts: { url: string; serviceKey: string; schema?: string; timeoutMs?: number }): Storage {
  if (!opts.url || !opts.serviceKey) throw new Error("postgrestStorage needs url and serviceKey");
  const base = `${opts.url.replace(/\/+$/, "")}/rest/v1`;
  const headers: Record<string, string> = { apikey: opts.serviceKey, "content-type": "application/json" };
  // New-style opaque keys (sb_secret_...) must NOT be sent as a Bearer JWT.
  if (opts.serviceKey.split(".").length === 3) headers.authorization = `Bearer ${opts.serviceKey}`;
  if (opts.schema) { headers["accept-profile"] = opts.schema; headers["content-profile"] = opts.schema; }

  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${base}/${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) }, signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000) });
    const text = await res.text();
    if (!res.ok) throw new StorageError(res.status, text.slice(0, 200));
    return (text ? JSON.parse(text) : null) as T;
  }
  const q = encodeURIComponent;
  const getState = async (k: string) => ((await call<{ value: unknown }[]>(`livingpress_state?select=value&key=eq.${q(k)}`))[0]?.value ?? null) as never;
  const setState = async (k: string, v: unknown) => {
    await call("livingpress_state?on_conflict=key", { method: "POST", body: JSON.stringify({ key: k, value: v ?? {}, updated_at: new Date().toISOString() }), headers: { prefer: "resolution=merge-duplicates,return=minimal" } });
  };
  let rpcLease = true; // false once we learn the SQL function is missing (schema.sql not re-run after upgrade)
  const lim = (n: number) => Math.max(1, Math.min(1000, Math.floor(n)));
  return {
    listPosts: async (n) => (await call<Post[]>(`livingpress_posts?select=*&status=eq.published&order=published_at.desc&limit=${lim(n)}`)).map(normPost),
    getPostBySlug: async (s) => { const row = (await call<Post[]>(`livingpress_posts?select=*&slug=eq.${q(s)}&limit=1`))[0]; return row ? normPost(row) : null; },
    insertPost: async (p) => normPost((await call<Post[]>("livingpress_posts", { method: "POST", body: JSON.stringify({ ...p, status: "published" }), headers: { prefer: "return=representation" } }))[0]!),
    updatePost: async (id, patch) => { await call(`livingpress_posts?id=eq.${q(id)}`, { method: "PATCH", body: JSON.stringify(patch), headers: { prefer: "return=minimal" } }); },
    listTopics: (st, n) => call<Topic[]>(`livingpress_topics?select=*&status=eq.${q(st)}&order=gravity.desc,created_at.asc&limit=${lim(n)}`),
    insertTopic: async (t) => {
      try {
        await call("livingpress_topics", { method: "POST", body: JSON.stringify(t), headers: { prefer: "return=minimal" } });
        return true;
      } catch (e) {
        // Only a duplicate title is an expected "no"; anything else is a real fault and must surface.
        if (e instanceof StorageError && e.status === 409) return false;
        throw e;
      }
    },
    updateTopic: async (id, patch) => { await call(`livingpress_topics?id=eq.${q(id)}`, { method: "PATCH", body: JSON.stringify(patch), headers: { prefer: "return=minimal" } }); },
    listRunsPage: async (n, offset) => (await call<(Run & { seq?: number })[]>(`livingpress_runs?select=*&order=seq.desc&limit=${lim(n)}&offset=${Math.max(0, Math.floor(offset))}`)).map(normRun),
    listRuns: async (n) => (await call<(Run & { seq?: number })[]>(`livingpress_runs?select=*&order=seq.desc&limit=${lim(n)}`)).map(normRun),
    insertRun: async (r) => { await call("livingpress_runs", { method: "POST", body: JSON.stringify(r), headers: { prefer: "return=minimal" } }); },
    getState,
    setState,
    tryLease: async (name, owner, untilMs, nowMs) => {
      if (rpcLease) {
        try {
          return (await call<boolean>("rpc/livingpress_try_lease", { method: "POST", body: JSON.stringify({ p_name: name, p_owner: owner, p_until_ms: untilMs, p_now_ms: nowMs }) })) === true;
        } catch (e) {
          if (!(e instanceof StorageError) || (e.status !== 404 && e.status !== 400)) throw e;
          rpcLease = false; // fall through to best effort
        }
      }
      const cur = (await getState(`lease.${name}`)) as { owner: string; until: number } | null;
      if (cur && cur.until > nowMs && cur.owner !== owner) return false;
      await setState(`lease.${name}`, { owner, until: untilMs });
      return ((await getState(`lease.${name}`)) as { owner: string } | null)?.owner === owner;
    },
    releaseLease: async (name, owner) => {
      if (rpcLease) {
        try { await call("rpc/livingpress_release_lease", { method: "POST", body: JSON.stringify({ p_name: name, p_owner: owner }) }); return; }
        catch (e) { if (!(e instanceof StorageError) || (e.status !== 404 && e.status !== 400)) throw e; rpcLease = false; }
      }
      const cur = (await getState(`lease.${name}`)) as { owner: string } | null;
      if (cur?.owner === owner) await setState(`lease.${name}`, { owner: "", until: 0 });
    },
  };
}
