# LivingChangelog — Autonomous Changelog Publisher

![license](https://img.shields.io/badge/license-MIT-blue) ![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen) ![tests](https://img.shields.io/badge/self--test-106%20passing-brightgreen) ![npm](https://img.shields.io/npm/v/livingchangelog)

**Release notes that only claim what actually shipped.**

## Try it in 60 seconds

No install, no database, nothing published. Point it at any public GitHub repo:

```bash
npx livingchangelog preview --repo owner/name
```

Without an AI key you get the evidence view: what it found, which changes can be proven live, and what it would skip and why. Add a key to see the drafted entries:

```bash
ANTHROPIC_API_KEY=... npx livingchangelog preview --repo owner/name --voice dry
```

What the output looks like (`--voice dry`):

```text
acme/shop, last 14 days. Let's see what actually shipped.

One entry survived.

━━ v2.4.0: CSV order export and a checkout fix  (v2.4.0)
   added, fixed

   ## Added
   - Orders export to CSV from the Orders page.

   ## Fixed
   - Checkout totals with three or more discounted items were off by one cent.

   Proof: github.com/acme/shop/pull/101  github.com/acme/shop/pull/102  github.com/acme/shop/releases/tag/v2.4.0

What it didn't say:
  Skipped 2 dependency bumps. They know what they did.
  Skipped 1 chore. Necessary, not news.
  Left out 1 change that only matters to the people who wrote it.
  Holding 1 change. Merged is not shipped.

Nothing was published. Nobody was harmed.
```

<!-- REPLACE: swap this sample for real output from your own repo, or a terminal GIF. -->

Set `GITHUB_TOKEN` too: GitHub allows only 60 unauthenticated calls an hour. `npx livingchangelog --help` lists every option.

**Setting it up for real?** The [Founder's Guide](FOUNDERS-GUIDE.md) walks through every step in plain language: database, AI key, GitHub, the three secrets, scheduling, a dry run and the health check, plus what to do when something looks wrong.

## Voices

A voice changes how it sounds, never what it may claim. Every voice goes through the same safety gate, the same Skeptic and the same shipping proof.

| Voice | Sounds like | Good for |
|---|---|---|
| `plain` | "Orders can now be exported as a CSV file from the Orders page." | Anything. The default. |
| `friendly` | "You can now download all your orders as a CSV straight from the Orders page." | Consumer products |
| `dry` | "Orders export to CSV from the Orders page. Spreadsheets, rejoice quietly." | Developer audiences who like a little personality |
| `technical` | "`Orders` page: CSV export of all orders." | APIs, SDKs, CLIs |

Pick one in the setup wizard, with `--voice` in the preview, or write your own description in `livingchangelog.config.json` under `voice`. The dry voice may make a wry aside about a change, never about users, and never in security notes or fixes for problems that hurt people.

## Announcements

When an entry publishes, LivingChangelog can post it to **Bluesky, Mastodon, X, Discord, Slack** or any webhook. There's no extra AI call: the post is built from the entry's own title and excerpt, which already passed the safety gate, the Skeptic and shipping proof, so a post can never claim more than the changelog does.

```text
CSV export for orders: Orders can now be exported as a CSV file from the Orders page. https://your-site.com/changelog/csv-export
```

- Each channel's limits are respected (X and Mastodon count links as 23 characters; Bluesky counts emoji as one). The link always comes last and is never cut.
- Posts go through an outbox: the text is fixed and recorded in the receipt when the entry publishes, failures retry with backoff (2, 4, 8, 16 minutes), a post is never sent twice, and a social network being down never fails a tick. `/health` reports any channel that gave up.
- Discord posts can't ping `@everyone`; webhook posts are HMAC-signed.
- Dry runs show the exact post text and send nothing. The preview CLI shows it too.

Turn a channel on by setting its env vars (details in the [Founder's Guide](FOUNDERS-GUIDE.md)):

| Channel | Env vars |
|---|---|
| Bluesky | `LIVINGCHANGELOG_BLUESKY_HANDLE`, `LIVINGCHANGELOG_BLUESKY_APP_PASSWORD` |
| Mastodon | `LIVINGCHANGELOG_MASTODON_URL`, `LIVINGCHANGELOG_MASTODON_TOKEN` |
| X | `LIVINGCHANGELOG_X_API_KEY`, `_X_API_SECRET`, `_X_ACCESS_TOKEN`, `_X_ACCESS_SECRET` (OAuth 1.0a user tokens, which don't expire) |
| Discord | `LIVINGCHANGELOG_DISCORD_WEBHOOK_URL` |
| Slack | `LIVINGCHANGELOG_SLACK_WEBHOOK_URL` |
| Webhook | `LIVINGCHANGELOG_ANNOUNCE_WEBHOOK_URL` (+ optional `_SECRET` for signing) |

Optional settings in `livingchangelog.config.json`:

```json
"announce": {
  "template": "{title}: {excerpt}",
  "hashtags": ["changelog"],
  "delayMinutes": 15
}
```

Template tokens: `{product}`, `{title}`, `{excerpt}`, `{version}`, `{categories}`. `delayMinutes` waits before posting, as a window to pull an entry. Set `"enabled": false` to pause all channels.

## Why not release-please, semantic-release, changesets or git-cliff?

Those are good tools for what they do: turn commit conventions or changeset files into release notes, and publish all of it. LivingChangelog answers different questions:

| | Conventional-commit tools | LivingChangelog |
|---|---|---|
| Decides what's worth saying | No, every qualifying commit is listed | Yes, chores, bumps and internal refactors are left out, with reasons recorded |
| Knows if it actually shipped | No, a merge or tag is the trigger | Yes, needs a production deploy or release that covers the change |
| Writes for readers | Commit messages, lightly formatted | Plain-language entries in a voice you pick |
| Fixes old entries | No | Re-checks old entries and adds a public correction if something was rolled back |
| Needs commit discipline | Yes | No, works from PRs, releases and deploys as they are |

They also work well together: keep release-please for tagging and versioning, and let LivingChangelog write the public-facing notes from those releases.

LivingChangelog watches release evidence, decides whether a change deserves a public entry, verifies that the copy says no more than the evidence proves, and publishes only when something meaningful actually shipped. It later re-audits old entries, adds visible corrections when facts drift, and seals every run—including silence—into a tamper-evident receipt chain.

It is a sibling of [LivingPress](https://github.com/SweetKenneth/living/tree/main/modules/livingpress), the autonomous blog engine. Both can live in the same project and the same Postgres database: LivingChangelog uses its own tables, functions, API namespace, config, secrets, and state keys.

- **Live example:** [ENTER YOUR CHANGELOG NAME HERE](https://[ENTER-YOUR-CHANGELOG-URL-HERE])
- **Built by:** [Kenneth E. Sweet Jr.](https://kesjr.com). Solo founder building deterministic, logic-based systems whose outputs can be trusted and inherited.
- **Need it installed for you?** [ENTER HOW PEOPLE HIRE YOU HERE, e.g. a link to a booking page or an email address]

### Changelogs running LivingChangelog
<!-- REPLACE: list real changelogs here as they launch. Delete the example rows. Open a pull request to add yours. -->
| Product | Changelog |
|---|---|
| [ENTER PRODUCT NAME HERE] | https://[ENTER-CHANGELOG-URL-HERE] |
| [ENTER PRODUCT NAME HERE] | https://[ENTER-CHANGELOG-URL-HERE] |

## What makes it different

- **Evidence first.** Commits, merged PRs, releases, successful deployments, or your own webhook events are the raw material. The model does not get to invent a release from repository activity.
- **Merged is not shipped.** The safe default requires explicit release/deployment proof before customer-facing copy may imply something is live.
- **Silence is valid.** Chores, dependency bumps, refactors, tiny changes, and weak evidence can be ignored or held for a later bundle.
- **Adversarial review.** A Reader asks whether the entry is useful; a Skeptic asks whether every claim is actually supported. One repair pass is allowed.
- **Deterministic immune gate.** Code—not a model—screens for assistant leakage, hype, unsupported rollout claims, unevidenced statistics, retired wording, and malformed headings.
- **Public correction diary.** Old entries are periodically re-read against later evidence and current product facts. Corrections are dated and visible.
- **Receipts to genesis.** Every tick is hash-chained. Health pages through the complete stored history and verifies the chain starts at `GENESIS`.
- **NEXUS failover.** Multiple model providers can be configured; rate-limited or failing providers are benched and the ladder falls through.
- **Circuit breaker.** Repeated failures stop autonomous work until cooldown or owner reset.
- **Zero installed dependencies.** Plain TypeScript + `fetch` + Web Crypto.

## The loop

```text
source sync
   ↓
deterministic ignore rules
   ↓
triage: ignore / hold / publish
   ↓
shipping-proof gate
   ↓
draft changelog entry
   ↓
immune screen
   ↓
Reader + Skeptic
   ↓
one repair pass if needed
   ↓
fitness gates
   ↓
publish OR record silence
   ↓
sealed receipt
```

On audit ticks, the machine can choose an older entry instead, compare it with later evidence/current product facts, propose an amendment, run that amendment through the deterministic screen **and a separate Correction Skeptic**, then either append a public correction or refuse the rewrite.

## Evidence sources

### GitHub pull source
`adapters/github.ts` can pull:

- published GitHub Releases
- successful GitHub Deployments (including environment/ref/SHA metadata)
- merged pull requests
- default-branch commits

No GitHub SDK is used.

### Generic ingest endpoint
Anything else—Lovable, Vercel, Cloudflare, CI/CD, your substrate, a database trigger, an admin panel—can POST evidence to:

`POST /api/livingchangelog/evidence`

with the ingest or owner secret.

Example:

```json
{
  "source": "ci-deploy",
  "external_id": "deploy_2026_10_01_1842",
  "kind": "deployment",
  "title": "Production deployment",
  "summary": "Deployed the new export progress bar and the mobile layout fixes.",
  "url": "https://example.com/changelog-source/deploy_2026_10_01_1842",
  "author": "release-bot",
  "labels": ["production"],
  "occurred_at": "2026-10-01T23:42:00Z",
  "metadata": {
    "environment": "production",
    "shipped": true
  }
}
```

`kind` is one of `commit`, `pull_request`, `release`, `deployment`, `issue`, or `manual`.

## Shipping policies

**How proof is found.** Triage picks the meaningful change, usually a PR, and often skips the plain "Production deployment" event next to it. That's fine: before holding a change, the engine looks through recent shipping records in any state (pending, already used by another entry, or skipped by triage) for a production deployment or release that covers it. The covering record is attached to the entry as provenance, so one deploy can prove several entries. A deployment or manual event whose `environment` is not in `productionEnvironments` (say, `staging`) never counts, even if it also says `shipped: true`. A version number is only printed if the evidence actually contains it.

Configured in `livingchangelog.config.json`:

- **`explicit-only`** *(recommended)* — only a non-prerelease release, successful deployment to a configured production environment, or explicit manual-live event proves shipping.
- **`merge-to-production-is-live`** — a merged PR to your configured production branch may prove shipping.
- **`commit-on-production-is-live`** — a commit observed on the production branch may prove shipping.

Set `sourcePolicy.productionEnvironments` to the environment names your deploy system uses (defaults: `production`, `prod`, `live`). Developer-only entries can be allowed separately. That lets you publish API/SDK/internal developer changes without falsely saying a customer-facing feature is in production.

## Quick start (self-hosted)

```bash
npm test          # 106 checks, no keys, no network
npm run typecheck
npm run setup     # asks the setup questions, including the voice, and prints secrets
```

The self-test requires no keys and no network.

### 1. Configure

Run the wizard or fill `livingchangelog.config.json` manually. The engine refuses to tick while `[ENTER ... HERE]` placeholders remain.

### 2. Database

Run `schema.sql` against Postgres/Supabase/Lovable Cloud. It creates:

- `livingchangelog_entries`
- `livingchangelog_evidence`
- `livingchangelog_runs`
- `livingchangelog_state`
- atomic tick-lease functions
- an atomic shared admin rate bucket
- append-only/fork-resistant receipt constraints
- public read policy for published entries only

The schema is namespace-isolated and safe beside LivingPress.

### 3. Secrets

Server-side only:

| Env var | Purpose |
|---|---|
| `LIVINGCHANGELOG_DB_URL` | PostgREST/Supabase project URL |
| `LIVINGCHANGELOG_DB_SERVICE_KEY` | service-role/server database key |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` or `LIVINGCHANGELOG_AI_KEY` | primary model key (one of them). `LIVINGCHANGELOG_AI_KEY` alone uses the Lovable AI Gateway; add `LIVINGCHANGELOG_AI_URL` + `LIVINGCHANGELOG_AI_MODEL` for any other OpenAI-compatible endpoint |
| `LIVINGCHANGELOG_BACKUP_AI_KEY` | optional NEXUS backup key |
| `LIVINGCHANGELOG_BACKUP_AI_URL` | optional backup OpenAI-compatible base URL |
| `LIVINGCHANGELOG_BACKUP_AI_MODEL` | optional backup model |
| `LIVINGCHANGELOG_CRON_SECRET` | ≥32-char scheduler secret |
| `LIVINGCHANGELOG_OWNER_SECRET` | ≥32-char owner/admin secret |
| `LIVINGCHANGELOG_INGEST_SECRET` | optional ≥32-char evidence-ingest secret |
| `LIVINGCHANGELOG_GITHUB_REPO` | optional `owner/repo` |
| `LIVINGCHANGELOG_GITHUB_TOKEN` | token for private repos and API limits. Strongly recommended: without it GitHub allows 60 calls/hour, which a 15-minute schedule can exhaust |

### 4. Mount the API

`examples/worker.ts` shows the complete wiring. Mount `createHandler()` at:

`/api/livingchangelog/*`

Owner/admin endpoints:

- `POST /api/livingchangelog/tick`
- `POST /api/livingchangelog/tick?dry=1` — owner-only, publishes nothing
- `GET /api/livingchangelog/evidence`
- `POST /api/livingchangelog/evidence`
- `GET /api/livingchangelog/health`
- `GET /api/livingchangelog/dream`
- `POST /api/livingchangelog/dream`
- `POST /api/livingchangelog/reset`

### 5. Build the public changelog

Use your site's own framework/design. At minimum:

- `/changelog` — published entries newest first
- `/changelog/:slug` — title, date/version/categories, rendered Markdown, caveats if any, and `correctionDiary(entry)`

The public page can query `livingchangelog_entries` where `status='published'`. Call `guardPublic()` before server work and `recordView()` server-side for human views so DREAM can learn from actual readership rather than crawlers.

Add each entry to the sitemap and give it its own title/description/canonical/OG metadata. `renderAtom()` and `renderJsonFeed()` are included if you want `/changelog/atom.xml` and `/changelog/feed.json` without another dependency.

### 6. Schedule it

POST `/api/livingchangelog/tick` with the cron secret every 15–60 minutes or a few times per day. Frequent ticks do **not** mean frequent entries: the bundling window, evidence triage, shipping proof, review floors, and silence outcome still apply.

### 7. Prove the install

A correct install should satisfy all of these:

1. `npm test` passes.
2. `npm run typecheck` passes.
3. `validateConfig(config)` returns `[]`.
4. An owner dry run returns either a complete proposed entry or a reasoned silent outcome.
5. `GET /api/livingchangelog/health` reports `healthy: true` and `receipts.valid: true` once runs exist.

## Shared core

The parts LivingChangelog shares with [LivingPress](https://github.com/SweetKenneth/living/tree/main/modules/livingpress) (model failover, circuit breaker, hash-chained receipts, tick lease, rate gate, safe Markdown, deterministic choices) live in `core/`, a vendored copy of [livingcore](https://github.com/SweetKenneth/living/tree/main/core). The module stays standalone with zero dependencies, and the self-test fails if anyone edits `core/` in place instead of fixing it once in livingcore and syncing.

## Core files

| File | Job |
|---|---|
| `engine/engine.ts` | autonomous evidence→publication loop |
| `engine/evidence.ts` | ingestion, dedupe, ignore rules, shipping proof |
| `engine/prompts.ts` | triage, drafting, review, correction prompts |
| `engine/immune.ts` | deterministic publication safety gate |
| `engine/corrector.ts` | old-entry audit + public correction diary + Correction Skeptic |
| `engine/evolution.ts` | publication fitness gates |
| `engine/dream.ts` | proposes owner-approved strategy adjustments; never self-modifies |
| `engine/mechanic.ts` | repairs stale evidence / entry formatting state |
| `engine/nexus.ts` | provider failover/benching |
| `engine/breaker.ts` | circuit breaker + health state |
| `engine/receipts.ts` | full-history tamper-evident run ledger |
| `engine/defense.ts` | request classification, rate limits, secret comparison |
| `engine/feed.ts` | zero-dependency Atom + JSON Feed syndication |
| `engine/announce.ts` | composes posts and runs the announcement outbox |
| `adapters/announce.ts` | Bluesky, Mastodon, X, Discord, Slack and webhook channels |
| `engine/voice.ts` | the four voices: writing instructions plus CLI narration |
| `cli/main.ts`, `cli/preview.ts` | `npx livingchangelog preview` |
| `adapters/github.ts` | GitHub releases/deployments/PRs/commits |
| `adapters/postgrest.ts` | Postgres/PostgREST storage |
| `adapters/memory.ts` | in-memory test/demo storage |
| `adapters/models.ts` | model provider adapters |

## Product philosophy

A changelog is a public claim about what changed. Repository activity is not automatically a public change, and a merge is not automatically a deployment.

LivingChangelog therefore optimizes for **entries you can defend**, not entries per week.

If nothing meaningful and proven shipped, the correct changelog entry is no changelog entry.

## Publishing to npm (maintainers)

`npm publish` runs the tests and builds `dist/` first (`prepublishOnly`). The build exists only because Node will not run TypeScript from inside `node_modules`; the runtime still has zero dependencies. Check that the package name is still free with `npm view livingchangelog` before the first publish.

## License

MIT. See `LICENSE`.

---
<sub>LivingChangelog is maintained by [Kenneth E. Sweet Jr.](https://kesjr.com).</sub>
