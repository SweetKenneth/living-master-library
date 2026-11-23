/**
 * Example: a complete server entry (Cloudflare Worker / Deno / Bun style).
 * Copy into the target site's server route and adjust imports.
 *
 * Env needed:
 *   LIVINGPRESS_DB_URL, LIVINGPRESS_DB_SERVICE_KEY   (storage)
 *   LIVINGPRESS_AI_KEY [+ optional backup keys]       (NEXUS ladder)
 *   LIVINGPRESS_CRON_SECRET, LIVINGPRESS_OWNER_SECRET (auth)
 */
import config from "../livingpress.config.json" with { type: "json" };
import { createHandler, guardPublic, recordView, type Deps, type LivingPressConfig } from "../engine/index.ts";
import { postgrestStorage } from "../adapters/postgrest.ts";
import { modelsFromEnv } from "../adapters/models.ts";
import { curatedLibrary } from "../adapters/images.ts";
import library from "../images.json" with { type: "json" };

type Env = Record<string, string | undefined>;
type Ctx = { waitUntil(p: Promise<unknown>): void };

function need(env: Env, name: string): string {
  const v = env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

// Built once per isolate, not per request.
let cached: { deps: Deps; handler: (req: Request) => Promise<Response> } | null = null;
function app(env: Env) {
  if (cached) return cached;
  // LIVINGPRESS_AI_KEY (+ _URL/_MODEL), ANTHROPIC_API_KEY or OPENAI_API_KEY, plus an optional LIVINGPRESS_BACKUP_AI_KEY.
  const { models } = modelsFromEnv(env);
  if (!models.length) throw new Error("missing AI key: set LIVINGPRESS_AI_KEY, ANTHROPIC_API_KEY or OPENAI_API_KEY");
  const deps: Deps = {
    storage: postgrestStorage({ url: need(env, "LIVINGPRESS_DB_URL"), serviceKey: need(env, "LIVINGPRESS_DB_SERVICE_KEY") }),
    models,
    images: curatedLibrary(library),
    config: config as LivingPressConfig,
  };
  const handler = createHandler(deps, { cronSecret: env.LIVINGPRESS_CRON_SECRET ?? "", ownerSecret: env.LIVINGPRESS_OWNER_SECRET ?? "" });
  cached = { deps, handler };
  return cached;
}

export default {
  async fetch(req: Request, env: Env, ctx?: Ctx): Promise<Response> {
    const { deps, handler } = app(env);
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/livingpress/")) return handler(req);

    // Public blog pages: rate-gate (no DB cost), count human readers for DREAM in the background.
    const slug = url.pathname.match(/^\/blog\/([a-z0-9-]+)\/?$/)?.[1];
    if (slug) {
      const blocked = await guardPublic(deps, req);
      if (blocked) return blocked;
      const view = recordView(deps, slug, req.headers.get("user-agent") ?? "").catch(() => undefined);
      if (ctx) ctx.waitUntil(view);
      // ...render the post with your site's framework: renderMarkdown(post.body) + correctionDiary(post)
    }
    return new Response("Not found", { status: 404 });
  },

  // Cloudflare Cron Trigger: runs a tick on schedule without any public endpoint.
  async scheduled(_event: unknown, env: Env, ctx?: Ctx) {
    const req = new Request("https://local/api/livingpress/tick", { method: "POST", headers: { authorization: `Bearer ${env.LIVINGPRESS_CRON_SECRET}`, "user-agent": "livingpress-cron" } });
    const run = app(env).handler(req);
    if (ctx) ctx.waitUntil(run); else await run;
  },
};
