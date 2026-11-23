/** Framework-neutral HTTP API for LivingChangelog. */

import { Breaker } from "./breaker.ts";
import { validateConfig } from "./config.ts";
import { accept, dream } from "./dream.ts";
import { classifyAgent, gate, memoryBuckets, safeEqual } from "./defense.ts";
import { outboxSummary } from "./announce.ts";
import { normalizeEvidence } from "./evidence.ts";
import { runTick, type Deps } from "./engine.ts";
import type { EvidenceInput } from "./ports.ts";
import { verifyStoredChain } from "./receipts.ts";

export type Secrets = { cronSecret: string; ownerSecret: string; ingestSecret?: string };
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const bearer = (req: Request) => (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
const clientIp = (req: Request) => req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";

function secretFindings(s: Secrets): string[] {
  const out: string[] = [];
  if ((s.cronSecret ?? "").length < 32) out.push("LIVINGCHANGELOG_CRON_SECRET is missing or shorter than 32 characters.");
  if ((s.ownerSecret ?? "").length < 32) out.push("LIVINGCHANGELOG_OWNER_SECRET is missing or shorter than 32 characters.");
  if (s.ingestSecret !== undefined && s.ingestSecret.length < 32) out.push("LIVINGCHANGELOG_INGEST_SECRET is shorter than 32 characters.");
  if (s.cronSecret && s.cronSecret === s.ownerSecret) out.push("Cron and owner secrets are identical.");
  return out;
}

export function createHandler(deps: Deps, secrets: Secrets) {
  const now = deps.now ?? Date.now;
  return async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const verdict = await gate(deps.storage, { surface: "admin", ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? "", now: now(), limitPerMinute: deps.config.defense.adminCallsPerMinute });
      if (verdict.decision === "refuse") return json({ error: "refused" }, 403);
      if (verdict.decision === "throttle") return json({ error: "slow down" }, 429, { "retry-after": String(verdict.retryAfterSec) });

      const route = url.pathname.replace(/\/+$/, "").split("/").pop();
      const token = bearer(req);
      const isCron = !!secrets.cronSecret && safeEqual(token, secrets.cronSecret);
      const isOwner = !!secrets.ownerSecret && safeEqual(token, secrets.ownerSecret);
      const isIngest = !!secrets.ingestSecret && safeEqual(token, secrets.ingestSecret);

      if (route === "tick") {
        if (req.method !== "POST") return json({ error: "use POST" }, 405, { allow: "POST" });
        if (!isCron && !isOwner) return json({ error: "unauthorized" }, 401);
        const dry = /^(1|true|yes)$/i.test(url.searchParams.get("dry") ?? "");
        if (dry && !isOwner) return json({ error: "dry runs need the owner secret" }, 401);
        return json(await runTick(dry ? { ...deps, dryRun: true } : deps));
      }

      if (route === "evidence") {
        if (req.method === "GET") {
          if (!isOwner) return json({ error: "unauthorized" }, 401);
          const [pending, ignored] = await Promise.all([deps.storage.listEvidence("pending", 200), deps.storage.listEvidence("ignored", 20, true)]);
          return json({ pending, recentlyIgnored: ignored });
        }
        if (req.method !== "POST") return json({ error: "use GET or POST" }, 405, { allow: "GET, POST" });
        if (!isOwner && !isIngest) return json({ error: "unauthorized" }, 401);
        const raw = await req.json().catch(() => null) as EvidenceInput | EvidenceInput[] | null;
        const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
        if (!list.length || list.length > 100) return json({ error: "body must be one evidence object or an array of 1..100" }, 400);
        let inserted = 0; let duplicates = 0; const errors: string[] = [];
        for (const item of list) {
          try {
            if (!item || typeof item !== "object" || !item.kind || typeof item.title !== "string" || !item.title.trim()) { errors.push("evidence needs kind + title"); continue; }
            const normalized = await normalizeEvidence({ ...item, source: item.source || "webhook" }, now());
            (await deps.storage.insertEvidence(normalized)) ? inserted++ : duplicates++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(/^storage \d+/.test(msg) ? "could not store evidence (see server logs)" : msg); // never echo database internals to a webhook caller
          }
        }
        return json({ inserted, duplicates, errors }, errors.length && !inserted ? 400 : 200);
      }

      if (!isOwner) return json({ error: "unauthorized" }, 401);
      const breaker = new Breaker(deps.storage, now, deps.config.breaker);
      if (route === "health") {
        const [runs, counters, bench, receipts, pending, outbox] = await Promise.all([
          deps.storage.listRuns(500), deps.storage.getState("engine.counters"), deps.storage.getState("nexus.bench"), verifyStoredChain(deps.storage), deps.storage.listEvidence("pending", 1000), outboxSummary(deps.storage),
        ]);
        let silence = 0; for (const r of runs) { if (r.outcome === "silent") silence++; else break; }
        const medic = await breaker.health(silence);
        const findings = [
          ...medic.findings, ...validateConfig(deps.config).map((x) => `Config: ${x}`), ...secretFindings(secrets), ...(deps.setupWarnings ?? []),
          ...outbox.failed.map((f) => `Announcement to ${f.channel} for "${f.entry_slug}" failed after ${f.attempts} attempt(s): ${f.last_error ?? "unknown error"}`),
        ];
        return json({ healthy: findings.length === 0, findings, medic, receipts, counters, pendingEvidence: pending.length,
          announcements: { channels: (deps.announcers ?? []).map((a) => a.id), pending: outbox.pending, sent: outbox.sent, failed: outbox.failed.length }, modelBench: bench ?? {}, lastRuns: runs.slice(0, 10) });
      }
      if (route === "reset") {
        if (req.method !== "POST") return json({ error: "use POST" }, 405, { allow: "POST" });
        await breaker.reset(); return json({ ok: true, breaker: "closed" });
      }
      if (route === "dream") {
        const [entries, runs] = await Promise.all([deps.storage.listEntries(200), deps.storage.listRuns(100)]);
        const proposals = dream(entries, runs, deps.config);
        if (req.method === "POST") {
          const { id } = await req.json().catch(() => ({})) as { id?: string };
          const p = proposals.find((x) => x.id === id);
          if (!p) return json({ error: "no such proposal", available: proposals.map((x) => x.id) }, 404);
          return json({ accepted: p, heuristics: await accept(deps.storage, p, now()) });
        }
        return json({ proposals });
      }
      return json({ error: "not found" }, 404);
    } catch (err) {
      return json({ error: "internal error", message: err instanceof Error ? err.message.slice(0, 300) : "unknown" }, 500);
    }
  };
}

const publicBuckets = memoryBuckets();
export async function guardPublic(deps: Pick<Deps, "config" | "now">, req: Request): Promise<Response | null> {
  const verdict = await gate(publicBuckets, { surface: "public", ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? "", now: (deps.now ?? Date.now)(), limitPerMinute: deps.config.defense.publicReadsPerMinute });
  if (verdict.decision === "allow") return null;
  if (verdict.decision === "throttle") return new Response("Too many requests", { status: 429, headers: { "retry-after": String(verdict.retryAfterSec) } });
  return new Response("Forbidden", { status: 403 });
}

export async function recordView(deps: Pick<Deps, "storage">, slug: string, userAgent: string): Promise<void> {
  if (classifyAgent(userAgent) !== "human" || !slug) return;
  const v = (await deps.storage.getState<Record<string, number>>("views.human")) ?? {};
  v[slug] = (v[slug] ?? 0) + 1; await deps.storage.setState("views.human", v);
}
