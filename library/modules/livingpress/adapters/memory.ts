/** In-memory storage. For tests, demos and dry runs. Not durable. Mirrors the database's constraints. */
import type { Post, Run, Storage, Topic } from "../engine/ports.ts";

export function memoryStorage(): Storage & { dump(): unknown } {
  const posts: Post[] = [];
  const topics: Topic[] = [];
  const runs: Run[] = [];
  const state = new Map<string, unknown>();
  let id = 0;
  const nid = () => `m${(id += 1)}`;
  const clone = <T>(x: T): T => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
  return {
    async listPosts(limit) { return clone([...posts].sort((a, b) => b.published_at.localeCompare(a.published_at)).slice(0, limit)); },
    async getPostBySlug(slug) { return clone(posts.find((p) => p.slug === slug) ?? null); },
    async insertPost(p) {
      if (posts.some((x) => x.slug === p.slug)) throw new Error("409 duplicate slug");
      const row = { ...clone(p), id: nid() };
      posts.push(row);
      return clone(row);
    },
    async updatePost(pid, patch) { const p = posts.find((x) => x.id === pid); if (p) Object.assign(p, clone(patch)); },
    async listTopics(status, limit) { return clone(topics.filter((t) => t.status === status).sort((a, b) => b.gravity - a.gravity).slice(0, limit)); },
    async insertTopic(t) { if (topics.some((x) => x.title.toLowerCase() === t.title.toLowerCase())) return false; topics.push({ ...clone(t), id: nid() }); return true; },
    async updateTopic(tid, patch) { const t = topics.find((x) => x.id === tid); if (t) Object.assign(t, clone(patch)); },
    async listRuns(limit) { return clone([...runs].reverse().slice(0, limit)); },
    async listRunsPage(limit, offset) { return clone([...runs].reverse().slice(offset, offset + limit)); },
    async insertRun(r) {
      // Same rule as the unique index in schema.sql: a parent may have only one child.
      if (runs.some((x) => x.prev_hash === r.prev_hash || x.receipt_hash === r.receipt_hash)) throw new Error("409 duplicate prev_hash (receipt fork)");
      runs.push({ ...clone(r), id: nid() });
    },
    async getState(key) { return (state.has(key) ? clone(state.get(key)) : null) as never; },
    async setState(key, v) { state.set(key, clone(v)); },
    async tryLease(name, owner, untilMs, nowMs) {
      // Synchronous check-and-set: atomic on a single JS thread, like the SQL function.
      const cur = state.get(`lease.${name}`) as { owner: string; until: number } | undefined;
      if (cur && cur.until > nowMs && cur.owner !== owner) return false;
      state.set(`lease.${name}`, { owner, until: untilMs });
      return true;
    },
    async releaseLease(name, owner) {
      const cur = state.get(`lease.${name}`) as { owner: string } | undefined;
      if (cur?.owner === owner) state.set(`lease.${name}`, { owner: "", until: 0 });
    },
    dump() { return { posts, topics, runs, state: Object.fromEntries(state) }; },
  };
}
