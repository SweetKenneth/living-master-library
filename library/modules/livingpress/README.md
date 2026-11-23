# LivingPress: Autonomous Editorial Engine

<!-- REPLACE: badges. Delete this block if you don't want them. -->
![license](https://img.shields.io/badge/license-MIT-blue) ![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen) ![tests](https://img.shields.io/badge/self--test-60%20passing-brightgreen)

**An autonomous blog engine that only posts when it has something to say, corrects its own old posts in public, and keeps a tamper-evident record of every decision. Zero dependencies.**

Most AI writing tools measure success in posts per week. LivingPress measures it in posts you'd defend. Every draft has to get past a code-only safety gate and two adversarial reviewers before it can publish, and most days the honest answer is "nothing worth saying," so it says nothing and writes down why. When your facts change, it goes back to its old posts, fixes them, and adds a public correction note.

- **Live example:** [ENTER YOUR BLOG NAME HERE](https://[ENTER-YOUR-BLOG-URL-HERE])
- **Built by:** [Kenneth E. Sweet Jr.](https://kesjr.com). Solo founder building deterministic, logic-based systems whose outputs can be trusted and inherited.
- **Need it installed for you?** [ENTER HOW PEOPLE HIRE YOU HERE, e.g. a link to a booking page or an email address]

### Why it's different
- **Zero installed dependencies.** Plain TypeScript + `fetch` + Web Crypto. Runs on Cloudflare Workers, Deno, Bun, Node ≥ 22.6, and any framework's server routes.
- **Silence is a feature.** Cadence limits, quality floors and reviewers that can vote "silence." A skipped day is fine; a filler post isn't.
- **Corrections are public.** Old posts are re-read against today's facts and amended with a dated "Updated" note.
- **Receipts you can verify.** Every tick, published or silent, is sealed into a hash chain. Editing history breaks it.
- **No content inside.** Every topic, fact, voice rule and link comes from `livingpress.config.json`, which ships full of `[ENTER ... HERE]` placeholders. The engine refuses to run until they're filled.
- **Honest limit:** no *libraries*, but it still needs three outside things: a **database**, an **AI provider**, and a **scheduled trigger**. Nothing autonomous can run without those.

### Blogs running LivingPress
<!-- REPLACE: list real blogs here as they launch. Delete the example rows. Open a pull request to add yours. -->
| Blog | What it covers |
|---|---|
| [ENTER BLOG NAME HERE](https://[ENTER-BLOG-URL-HERE]) | [ENTER ONE-LINE DESCRIPTION HERE] |
| [ENTER BLOG NAME HERE](https://[ENTER-BLOG-URL-HERE]) | [ENTER ONE-LINE DESCRIPTION HERE] |

### Quick start
```bash
git clone https://github.com/SweetKenneth/living.git
cd living/modules/livingpress
npm test          # 60 checks, no keys, no network
npm run setup     # answers the setup questions, writes the config, prints two secrets
```
Then follow the install steps below (they're written so a coding agent can follow them exactly).

---

## FOR THE INSTALLING AGENT — follow exactly

### 0. Verify the package
```bash
node --experimental-strip-types test/selftest.ts   # expect: 60 passed, 0 failed
```

### 1. Gather (stop and ask if any is missing — never invent)
Ask the owner every question in **INSTALL-QUESTIONS.md** (or have them run `node install/wizard.mjs`). Then collect from the site:

| Need | What exactly | Env var |
|---|---|---|
| Database | Postgres + REST (Lovable Cloud / Supabase / PostgREST) URL | `LIVINGPRESS_DB_URL` |
| | Server-only service key — never shipped to the browser | `LIVINGPRESS_DB_SERVICE_KEY` |
| AI (primary) | One of: an Anthropic key, an OpenAI key, a Lovable AI Gateway key, or any OpenAI-compatible key with its URL and model | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `LIVINGPRESS_AI_KEY` (+ `LIVINGPRESS_AI_URL`, `LIVINGPRESS_AI_MODEL`) |
| AI (backup, optional, recommended) | Second provider for NEXUS failover | `LIVINGPRESS_BACKUP_AI_KEY` / `_URL` / `_MODEL` |
| Scheduler secret | random ≥ 32 chars | `LIVINGPRESS_CRON_SECRET` |
| Owner secret | random ≥ 32 chars, give to owner only | `LIVINGPRESS_OWNER_SECRET` |
| Images | `images.json` library and/or a generation key + upload function | — |

Store all keys as server secrets. On Lovable Cloud projects, use the platform's existing database and secret store instead of new accounts.

### 2. Install
1. Copy `engine/`, `adapters/`, `livingpress.config.json`, `images.json` into the site's server code (e.g. `src/livingpress/`). Keep relative imports; if the site's bundler dislikes `.ts` extensions in imports, enable `allowImportingTsExtensions` or strip the extensions.
2. Run `schema.sql` as a migration. It creates 4 tables, public read on published posts only, server-only everything else, an append-only trigger on receipts, a one-child-per-parent index so the receipt chain cannot fork, and the atomic tick-lease functions. It is idempotent: re-running it upgrades a 1.0.x install.
3. Mount `createHandler(deps, secrets)` (see `examples/worker.ts`) at `/api/livingpress/*`. It's a plain `(Request) => Response`.
4. Build two pages on the site (in the site's own framework and design):
   - `/blog` — list of published posts (`livingpress_posts` where `status='published'`, newest first) with image, title, excerpt.
   - `/blog/:slug` — image, title, `renderMarkdown(body)`, then `caveats` and `renderMarkdown(correctionDiary(post))` (the public "Updated" notes). Call `guardPublic(deps, req)` first (rate gate, no database cost) and `recordView()` server-side so DREAM learns from humans only.
   - Add each post to the sitemap and give each page its own title/description/og:image (the post image).
5. Schedule `POST /api/livingpress/tick` with `Authorization: Bearer $LIVINGPRESS_CRON_SECRET`, 3–6 times a day. More often is fine — it stays silent when nothing is due.
6. Run `validateConfig(config)` — it must return `[]` (the engine refuses to tick otherwise, and calls no model). Then do a **dry run**: `POST /api/livingpress/tick?dry=1` with the owner secret returns a full draft and its gate results and publishes nothing. Show it to the owner. Then trigger one real tick and read `GET /api/livingpress/health` (owner secret).
7. Optional, recommended: point `npm run test:db` at a scratch database to prove the storage layer end to end.

### 3. Done when
- self-test passes, `validateConfig` returns `[]`, a dry run returns a readable draft, health shows `healthy: true` (heartbeat, `receipts.valid: true`, no config or secret findings), and the first tick returns `published` or a reasoned `silent`.

---

## What's inside (all skills)

| Skill | What it does | File |
|---|---|---|
| **Split brain** | Reader brain (worth reading?) + Skeptic brain (claims we can't support?) score every draft; one revision pass | `engine/engine.ts`, `prompts.ts` |
| **Posts only when it has something to say** | Silence is a first-class, recorded outcome: cadence, quality floor, reviewers can vote "silence" | `engine.ts` |
| **Correction of old posts** | Re-reads one older post on a cooldown against today's facts; mechanical drift found in code | `corrector.ts` |
| **Correction diary** | Every amendment appends a dated public "Updated" note | `corrector.ts` |
| **Always an image** | No image → no post. Curated library, generated, or both with fallback | `adapters/images.ts` |
| **Pillar / support clusters** | Each topic gets a long pillar, then ≥ 2 supports linking to it | `engine.ts`, `gaps.ts` |
| **Computed advocacy** | Only every Nth post may recommend the business | `engine.ts` |
| **NEXUS router** | Model ladder; quota/rate-limited providers benched with doubling cooldown; falls through to next | `nexus.ts` |
| **Circuit breaker + MEDIC** | Trips after N consecutive failures, goes quiet, half-open probe after cooldown; heartbeat + health report | `breaker.ts` |
| **Immune safety gate** | Code-only check before review: AI leakage, fake social proof, unsafe advice, numbers not in facts, dead links | `immune.ts` |
| **EVOLUTION** | 7-gate fitness score; strategy exploit / explore / mutate | `evolution.ts` |
| **DREAM** | Finds patterns in its own history, proposes improvements; owner accepts — never self-modifies silently | `dream.ts` |
| **Gap ledger** | Tells the planner what the site is missing, in priority order | `gaps.ts` |
| **MECHANIC** | Self-repair: stuck topics, missing images, stray H1s, dangling links | `mechanic.ts` |
| **DEFENSE** | Bot classification, day-rotating signatures (no raw IPs), rate gate, constant-time secret check | `defense.ts` |
| **ORACLE** | No `Math.random`; seeded choices, canonical JSON | `oracle.ts` |
| **Sealed receipts** | Every tick hash-chained; tamper breaks `verifyChain`; forks refused by the database | `receipts.ts` |
| **Tick lease** | Overlapping scheduler calls never draft or publish twice (atomic in SQL) | `engine.ts`, `schema.sql` |
| **No repeats** | Planner sees every title by topic; reworded twins of existing posts are rejected, near-misses go to the back of the queue | `similar.ts`, `prompts.ts` |
| **Dry run** | Owner sees exactly what would publish, with gate results, before anything goes live | `engine.ts`, `http.ts` |
| **Pluggable storage/AI** | Ports + fetch adapters; swap any database or model | `ports.ts`, `adapters/` |

## Owner endpoints (Bearer owner secret)
- `GET /api/livingpress/health` — `healthy` + `findings` (pulse, breaker, config, secret strength), receipt-chain verdict, counters, benched models, last 10 runs
- `POST /api/livingpress/tick?dry=1` — draft, screen and review; publish nothing; return the draft
- `GET /api/livingpress/dream` — proposals · `POST {id}` to accept
- `POST /api/livingpress/reset` — close the breaker
- `POST /api/livingpress/tick` — run one tick now

## Upgrading from 1.0.x
Replace `engine/` and `adapters/`, then re-run `schema.sql` (safe to re-run). Existing receipts keep verifying, and in fact start verifying: 1.0.x reported them invalid on Postgres because of a timestamp-format mismatch. Nothing in `livingpress.config.json` changes, but the engine now refuses to tick while it still has placeholders.

## Shared core

The engine parts that LivingPress shares with [LivingChangelog](https://github.com/SweetKenneth/living/tree/main/modules/livingchangelog) (model failover, circuit breaker, hash-chained receipts, tick lease, rate gate, safe Markdown, deterministic choices) live in `core/`, a vendored copy of [livingcore](https://github.com/SweetKenneth/living/tree/main/core). The module stays standalone with zero dependencies, and the self-test fails if anyone edits `core/` in place instead of fixing it once in livingcore and syncing.

## Folder map
```text
engine/      the engine (no dependencies)
core/        vendored livingcore: shared with LivingChangelog. Don't edit here (see core/README.md)
adapters/    memory, postgrest storage; OpenAI-compatible, Anthropic, Lovable Gateway models; images
examples/    worker.ts — full server entry
install/     wizard.mjs — interactive setup
test/        selftest.ts — 60 checks, no keys needed
             integration.postgrest.ts — real-database run (npm run test:db)
schema.sql   database
livingpress.config.json   demo config, all placeholders
FOUNDERS-GUIDE.md         for the site owner
CHANGELOG.md              what changed in each version
tsconfig.json             type-check only (npm run typecheck)
INSTALL-QUESTIONS.md      for the agent
```

## Contributing
Issues and pull requests are welcome. Run `npm test` and `npm run typecheck` before opening a PR, and add a self-test check for any bug you fix. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License
MIT. See [LICENSE](LICENSE).
<!-- REPLACE: if you choose AGPL + commercial licensing instead, change this section, LICENSE and package.json together. -->

---
<sub>LivingPress is maintained by [Kenneth E. Sweet Jr.](https://kesjr.com).</sub>
