/**
 * Framework-neutral HTTP handlers (Web Request/Response). Mount them in any
 * runtime: Cloudflare Workers, Deno, Bun, Node 18+, Next/Remix/TanStack/Astro
 * server routes, Supabase/Vercel/Netlify functions.
 *
 *   POST /api/livingpress/tick      — scheduler calls this (Bearer LIVINGPRESS_CRON_SECRET)
 *   POST /api/livingpress/tick?dry=1 — owner only: draft and review, publish nothing, return the draft
 *   GET  /api/livingpress/health    — MEDIC pulse + receipt chain check (owner secret)
 *   GET  /api/livingpress/dream     — DREAM proposals (owner secret)
 *   POST /api/livingpress/dream     — accept a proposal {id} (owner secret)
 *   POST /api/livingpress/reset     — reset the circuit breaker (owner secret)
 *
 * For the public blog pages: guardPublic() rate-gates reads without touching
 * the database, and recordView() counts human readers for DREAM.
 */

import { Breaker } from "./breaker.ts";
import { validateConfig } from "./config.ts";
import { accept, dream } from "./dream.ts";
import { classifyAgent, gate, memoryBuckets, safeEqual } from "./defense.ts";
import { runTick, type Deps } from "./engine.ts";
import { verifyStoredChain } from "./receipts.ts";

export type Secrets = { cronSecret: string; ownerSecret: string };

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

function bearer(req: Request): string {
  return (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
}

function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
}

function secretFindings(secrets: Secrets): string[] {
  const out: string[] = [];
  if ((secrets.cronSecret ?? "").length < 32) out.push("LIVINGPRESS_CRON_SECRET is missing or shorter than 32 characters.");
  if ((secrets.ownerSecret ?? "").length < 32) out.push("LIVINGPRESS_OWNER_SECRET is missing or shorter than 32 characters.");
  if (secrets.cronSecret && secrets.cronSecret === secrets.ownerSecret) out.push("Cron and owner secrets are identical; the scheduler can act as the owner.");
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

      if (route === "tick") {
        if (req.method !== "POST") return json({ error: "use POST" }, 405, { allow: "POST" });
        if (!isCron && !isOwner) return json({ error: "unauthorized" }, 401);
        const dry = /^(1|true|yes)$/i.test(url.searchParams.get("dry") ?? "");
        if (dry && !isOwner) return json({ error: "dry runs need the owner secret" }, 401);
        return json(await runTick(dry ? { ...deps, dryRun: true } : deps));
      }
      if (!isOwner) return json({ error: "unauthorized" }, 401);

      const breaker = new Breaker(deps.storage, now, deps.config.breaker);
      if (route === "health") {
        const [runs, counters, bench] = await Promise.all([
          deps.storage.listRuns(500),
          deps.storage.getState("engine.counters"),
          deps.storage.getState("nexus.bench"),
        ]);
        let silence = 0;
        for (const r of runs) { if (r.outcome === "silent") silence += 1; else break; }
        const medic = await breaker.health(silence);
        const config = validateConfig(deps.config);
        const security = secretFindings(secrets);
        const findings = [...medic.findings, ...config.map((p) => `Config: ${p}`), ...security];
        return json({
          healthy: findings.length === 0,
          findings,
          medic,
          receipts: await verifyStoredChain(deps.storage),
          counters,
          modelBench: bench ?? {},
          lastRuns: runs.slice(0, 10),
        });
      }
      if (route === "reset") {
        if (req.method !== "POST") return json({ error: "use POST" }, 405, { allow: "POST" });
        await breaker.reset();
        return json({ ok: true, breaker: "closed" });
      }
      if (route === "dream") {
        const [posts, runs, views] = await Promise.all([
          deps.storage.listPosts(200),
          deps.storage.listRuns(100),
          deps.storage.getState<Record<string, number>>("views.human"),
        ]);
        const proposals = dream(posts, runs, deps.config, views ?? {});
        if (req.method === "POST") {
          const { id } = (await req.json().catch(() => ({}))) as { id?: string };
          const p = proposals.find((x) => x.id === id);
          if (!p) return json({ error: "no such proposal", available: proposals.map((x) => x.id) }, 404);
          return json({ accepted: p, heuristics: await accept(deps.storage, p, now()) });
        }
        return json({ proposals });
      }
      return json({ error: "not found" }, 404);
    } catch (err) {
      // Never leak a stack trace; the message is enough for the owner and safe for anyone else.
      return json({ error: "internal error", message: err instanceof Error ? err.message.slice(0, 300) : "unknown" }, 500);
    }
  };
}

const publicBuckets = memoryBuckets();

/**
 * Rate-gate a public blog read. Returns a 429/403 Response to send back, or
 * null to carry on. Uses per-isolate memory, so page views never cost a
 * database round trip.
 */
export async function guardPublic(deps: Pick<Deps, "config" | "now">, req: Request): Promise<Response | null> {
  const verdict = await gate(publicBuckets, {
    surface: "public", ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? "", now: (deps.now ?? Date.now)(), limitPerMinute: deps.config.defense.publicReadsPerMinute,
  });
  if (verdict.decision === "allow") return null;
  if (verdict.decision === "throttle") return new Response("Too many requests", { status: 429, headers: { "retry-after": String(verdict.retryAfterSec) } });
  return new Response("Forbidden", { status: 403 });
}

/** Call from the blog page handler to count HUMAN views only (DEFENSE-filtered) for DREAM. */
export async function recordView(deps: Pick<Deps, "storage">, slug: string, userAgent: string): Promise<void> {
  if (classifyAgent(userAgent) !== "human" || !slug) return;
  const v = (await deps.storage.getState<Record<string, number>>("views.human")) ?? {};
  v[slug] = (v[slug] ?? 0) + 1;
  await deps.storage.setState("views.human", v);
}
