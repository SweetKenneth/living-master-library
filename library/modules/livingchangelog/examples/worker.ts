/** Example Cloudflare/Deno/Bun-style server entry. */
import config from "../livingchangelog.config.json" with { type: "json" };
import { createHandler, guardPublic, recordView, type Deps, type LivingChangelogConfig } from "../engine/index.ts";
import { postgrestStorage } from "../adapters/postgrest.ts";
import { modelsFromEnv } from "../adapters/models.ts";
import { announcersFromEnv } from "../adapters/announce.ts";
import { githubSource } from "../adapters/github.ts";

type Env = Record<string, string | undefined>;
type Ctx = { waitUntil(p: Promise<unknown>): void };
const need = (env: Env, name: string) => { const v = env[name]; if (!v) throw new Error(`missing env ${name}`); return v; };
let cached: { deps: Deps; handler: (req: Request) => Promise<Response> } | null = null;

function app(env: Env) {
  if (cached) return cached;
  // Same keys the CLI accepts: LIVINGCHANGELOG_AI_KEY (+ _URL/_MODEL), ANTHROPIC_API_KEY or OPENAI_API_KEY, plus an optional backup.
  const { models } = modelsFromEnv(env);
  if (!models.length) throw new Error("missing AI key: set LIVINGCHANGELOG_AI_KEY, ANTHROPIC_API_KEY or OPENAI_API_KEY");
  const channels = announcersFromEnv(env);
  const sources = [];
  if (env.LIVINGCHANGELOG_GITHUB_REPO) {
    const [owner, repo] = env.LIVINGCHANGELOG_GITHUB_REPO.split("/");
    if (owner && repo) sources.push(githubSource({ owner, repo, token: env.LIVINGCHANGELOG_GITHUB_TOKEN, productionEnvironments: (config as LivingChangelogConfig).sourcePolicy.productionEnvironments }));
  }
  const deps: Deps = {
    storage: postgrestStorage({ url: need(env, "LIVINGCHANGELOG_DB_URL"), serviceKey: need(env, "LIVINGCHANGELOG_DB_SERVICE_KEY") }),
    models, sources, config: config as LivingChangelogConfig,
    // Bluesky, Mastodon, X, Discord, Slack or a webhook: whichever env vars are set (see FOUNDERS-GUIDE.md).
    announcers: channels.announcers, setupWarnings: channels.problems,
  };
  const handler = createHandler(deps, { cronSecret: env.LIVINGCHANGELOG_CRON_SECRET ?? "", ownerSecret: env.LIVINGCHANGELOG_OWNER_SECRET ?? "", ingestSecret: env.LIVINGCHANGELOG_INGEST_SECRET });
  cached = { deps, handler }; return cached;
}

export default {
  async fetch(req: Request, env: Env, ctx?: Ctx): Promise<Response> {
    const { deps, handler } = app(env); const url = new URL(req.url);
    if (url.pathname.startsWith("/api/livingchangelog/")) return handler(req);
    const slug = url.pathname.match(/^\/changelog\/([a-z0-9-]+)\/?$/)?.[1];
    if (slug) {
      const blocked = await guardPublic(deps, req); if (blocked) return blocked;
      const view = recordView(deps, slug, req.headers.get("user-agent") ?? "").catch(() => undefined); if (ctx) ctx.waitUntil(view);
      // Render entry in your framework: renderMarkdown(entry.body) + correctionDiary(entry)
    }
    return new Response("Not found", { status: 404 });
  },
  async scheduled(_event: unknown, env: Env, ctx?: Ctx) {
    const req = new Request("https://local/api/livingchangelog/tick", { method: "POST", headers: { authorization: `Bearer ${env.LIVINGCHANGELOG_CRON_SECRET}`, "user-agent": "livingchangelog-cron" } });
    const run = app(env).handler(req); if (ctx) ctx.waitUntil(run); else await run;
  },
};
