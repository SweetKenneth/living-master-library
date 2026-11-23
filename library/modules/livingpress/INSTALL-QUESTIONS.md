# LivingPress — questions to ask the site owner

Agent: ask these in order, in plain language, one or two at a time. Write the answers into `livingpress.config.json` (or run `node install/wizard.mjs` and let the owner type them). Never invent an answer. If the owner doesn't know, leave the `[ENTER ... HERE]` placeholder — the engine refuses to start until every placeholder is filled (`validateConfig`).

## About the blog
1. What's the business or site called?
2. What's the website address?
3. What should the blog be called?
4. Where should it live on the site? (default `/blog`)
5. In one line, what is the blog about?
6. Who is the reader? Be specific ("independent bakery owners", not "everyone").
7. How should it sound? (default: plain, direct, no hype)

## The truth it may tell
8. What facts may it state — what you sell, prices, hours, guarantees, locations? Only what's true today. **This is the only thing the writer is allowed to rely on.**
9. What must it never claim? (customers you don't have, awards, medical/financial promises, upcoming features…)
10. Any words you hate seeing? (they go in `retiredWords`; old posts get corrected when they contain them)

## What it writes about
11. 3–6 content topics the blog should own. For each: the core argument it makes, and the search terms people use.
12. Real problems your readers have.
13. Which pages on your site may it link to?
14. Every how-many posts may it directly recommend you? The rest just help the reader. (default 3)
15. Minimum hours between posts? (default 20 — it will often stay silent longer, on purpose)

## Images — every post gets one
16. Do you want (a) images picked from your own photo library, (b) newly generated images, or (c) generated with your library as backup?
   - (a)/(c): collect image URLs + a short description + tags into `images.json`.
   - (b)/(c): what visual style? Where should generated images be stored?

## Things the agent gathers from the site (not the owner)
- **Database**: Postgres with a REST layer (Lovable Cloud, Supabase, or self-hosted PostgREST). Run `schema.sql`. Need the URL and a server-only service key.
- **AI provider(s)**: at least one OpenAI-compatible key (Lovable AI Gateway preferred on Lovable sites). Ask the owner whether they have a second provider for backup — NEXUS uses it when the first runs out of quota.
- **Scheduler**: something that POSTs `/api/livingpress/tick` a few times a day (Cloudflare Cron, pg_cron + pg_net, Vercel/Netlify cron, GitHub Actions, any uptime pinger).
- **Two secrets** (generate random 32+ char strings): `LIVINGPRESS_CRON_SECRET`, `LIVINGPRESS_OWNER_SECRET`. Give the owner secret to the owner only.
- **The site's framework**, so you know where to mount the handler and build the `/blog` pages.
