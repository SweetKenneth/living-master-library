# LivingChangelog: Founder's Guide

LivingChangelog writes your public changelog for you. It watches where work actually happens (GitHub releases, merged pull requests, deploys), decides what deserves a public entry, and refuses to call something shipped until there's proof it reached production. Most of the time it says nothing, and it writes down why.

This guide has two parts: **getting it running**, step by step, and **how it thinks**, so you can read what it tells you.

---

# Part 1: Getting it running

Plan on about an hour the first time. If someone else (a developer or a coding agent) is doing the install, hand them the README and keep this guide for yourself: the steps below tell you what they should hand back to you.

## Step 0. Try it before you install anything

```bash
npx livingchangelog preview --repo your-github-name/your-repo
```

This reads your repo's last two weeks, shows which changes can be proven live, and what it would skip. Nothing is published or saved. Add an AI key to see the actual entries it would write, and try the voices side by side:

```bash
ANTHROPIC_API_KEY=your-key npx livingchangelog preview --repo your-github-name/your-repo --voice friendly
```

If you don't like what you see here, stop. The real install produces the same kind of entries.

## Step 1. Get the code and check it works

```bash
git clone https://github.com/SweetKenneth/living.git
cd living/modules/livingchangelog
npm test
```

You should see `106 passed, 0 failed`. No keys or internet needed for this.

## Step 2. Answer the setup questions

```bash
npm run setup
```

It asks about your product, who reads the changelog, the facts it's allowed to state, and which voice to use. It saves everything to `livingchangelog.config.json`. At the end it prints **three secrets**. Copy them somewhere safe right away (a password manager is ideal). They're explained in Step 6.

The engine refuses to run while any answer is still an `[ENTER ... HERE]` placeholder, so it can never write from half a brief.

## Step 3. Set up the database

LivingChangelog needs a Postgres database with a REST layer. Supabase (or Lovable Cloud, which runs on it) is the easiest.

1. Open your project's **SQL editor**.
2. Paste the whole contents of `schema.sql` and run it. It's safe to run again later, and safe next to LivingPress.
3. From the project's API settings, copy two things: the **project URL** and the **service role (secret) key**. The service key is powerful: it must only ever live on the server, never in your website's browser code.

## Step 4. Get an AI key

Any one of these works:

- an **Anthropic** key, stored as `ANTHROPIC_API_KEY`
- an **OpenAI** key, stored as `OPENAI_API_KEY`
- a **Lovable AI Gateway** key, stored as `LIVINGCHANGELOG_AI_KEY`
- **any other OpenAI-compatible provider** (OpenRouter, Groq, Together…): its key as `LIVINGCHANGELOG_AI_KEY`, plus `LIVINGCHANGELOG_AI_URL` and `LIVINGCHANGELOG_AI_MODEL`

A second provider is optional but recommended: put it in `LIVINGCHANGELOG_BACKUP_AI_KEY` (with `_URL` and `_MODEL`), and if the first runs out of credit it switches over automatically.

## Step 5. Tell it where your work happens

**GitHub (most people).** Create a read-only token: GitHub, Settings, Developer settings, fine-grained tokens. Give it access to your repo with read permission for Contents, Pull requests, Deployments and Metadata. It's needed for private repos and strongly recommended for public ones, because GitHub only allows 60 calls an hour without one.

**Your deploys (recommended).** The cleanest proof that something shipped is your deploy system saying so. If you deploy with GitHub Actions, add this step **after** your production deploy succeeds:

```yaml
      - name: Tell LivingChangelog this shipped
        if: success()
        run: |
          curl -fsS -X POST "$SITE/api/livingchangelog/evidence" \
            -H "Authorization: Bearer $INGEST" -H "content-type: application/json" \
            -d '{"source":"github-actions","external_id":"deploy-${{ github.run_id }}","kind":"deployment",
                 "title":"Production deployment","summary":"Deployed ${{ github.sha }} to production.",
                 "url":"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}",
                 "metadata":{"environment":"production","ref":"${{ github.ref_name }}","sha":"${{ github.sha }}","shipped":true}}'
        env:
          SITE: ${{ secrets.LIVINGCHANGELOG_SITE_URL }}
          INGEST: ${{ secrets.LIVINGCHANGELOG_INGEST_SECRET }}
```

The two `${{ secrets... }}` values are **GitHub repository secrets** (repo, Settings, Secrets and variables, Actions): `LIVINGCHANGELOG_SITE_URL` is your site's address, like `https://your-site.com`, and `LIVINGCHANGELOG_INGEST_SECRET` is the ingest secret from Step 2.

Any other deploy tool (Vercel, Netlify, Cloudflare, your own scripts) can send the same JSON. Only send it for production: a deploy marked `staging` is never treated as proof.

## Step 6. Put the secrets on your server

Every one of these goes into your host's secret or environment-variable settings (Cloudflare, Vercel, Netlify, Supabase, Lovable). Never into the website's browser code, and never into the repo.

| Name | What it is | Where it comes from |
|---|---|---|
| `LIVINGCHANGELOG_DB_URL` | Your database's address | Step 3 |
| `LIVINGCHANGELOG_DB_SERVICE_KEY` | Server-only database key | Step 3 |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or `LIVINGCHANGELOG_AI_KEY` | Your AI provider key (just one) | Step 4 |
| `LIVINGCHANGELOG_GITHUB_REPO` | `your-github-name/your-repo` | You |
| `LIVINGCHANGELOG_GITHUB_TOKEN` | Read-only GitHub token | Step 5 |
| `LIVINGCHANGELOG_CRON_SECRET` | Lets your scheduler run it | Printed in Step 2 |
| `LIVINGCHANGELOG_OWNER_SECRET` | **Your** key to everything | Printed in Step 2 |
| `LIVINGCHANGELOG_INGEST_SECRET` | Lets deploy tools report shipments | Printed in Step 2 |

**The three secrets, in plain words.** They're long random passwords you made in Step 2, not something a service gives you, and each one opens a different door:

- **Cron secret:** the scheduler's key. It can only ask for a normal run.
- **Ingest secret:** your deploy tool's key. It can only report "this shipped."
- **Owner secret:** yours alone. It can do dry runs, read the health report, accept suggestions and reset the safety switch.

If one leaks, generate a new one (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) and replace it. Keep all three different; the health report complains if two match or any is shorter than 32 characters.

## Step 7. Connect it to your website

This is the one step that needs a developer or a coding agent. Hand them `examples/worker.ts` and the README section "Mount the API" and "Build the public changelog." When they're done you should have:

- the engine answering at `https://your-site.com/api/livingchangelog/...`
- a `/changelog` page listing entries, and a page per entry
- optionally `/changelog/atom.xml` and `/changelog/feed.json`, so people can subscribe

## Step 8. Do a dry run

```bash
curl -X POST "https://your-site.com/api/livingchangelog/tick?dry=1" \
  -H "Authorization: Bearer YOUR_OWNER_SECRET"
```

It does everything a real run does, then stops and shows you the entry it would publish, the evidence behind it and which checks passed. Nothing goes live. If it says it's staying silent, the reason is right there in the response. "Nothing worth publishing yet" is a perfectly good first answer.

## Step 9. Schedule it

It should be called every 15 to 60 minutes. Frequent calls do not mean frequent entries: it stays silent unless something meaningful and proven shipped.

- **Cloudflare:** `examples/worker.ts` already includes a scheduled handler; add a Cron Trigger.
- **GitHub Actions** (works anywhere): add `.github/workflows/livingchangelog.yml`, and add `LIVINGCHANGELOG_CRON_SECRET` to the repository secrets next to `LIVINGCHANGELOG_SITE_URL`:

```yaml
name: LivingChangelog
on:
  schedule: [{ cron: "*/30 * * * *" }]
  workflow_dispatch:
jobs:
  tick:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS -X POST "$SITE/api/livingchangelog/tick" -H "Authorization: Bearer $CRON"
        env:
          SITE: ${{ secrets.LIVINGCHANGELOG_SITE_URL }}
          CRON: ${{ secrets.LIVINGCHANGELOG_CRON_SECRET }}
```

## Step 9½. Announce it (optional)

Every published entry can also go out as a post. It's built from the entry itself, never rewritten by AI, so it can't say anything the changelog doesn't. Set the env vars for whichever channels you want, on the server like the other secrets:

- **Bluesky:** your handle (like `yourname.bsky.social`) as `LIVINGCHANGELOG_BLUESKY_HANDLE`, and an **app password** (Bluesky, Settings, Privacy and security, App passwords; never your real password) as `LIVINGCHANGELOG_BLUESKY_APP_PASSWORD`.
- **Mastodon:** your instance address (like `https://mastodon.social`) as `LIVINGCHANGELOG_MASTODON_URL`, and an access token (Preferences, Development, New application, with the `write:statuses` permission) as `LIVINGCHANGELOG_MASTODON_TOKEN`.
- **X:** create an app in the X developer portal with read and write permission, then copy the four keys it shows (API key and secret, access token and secret) into `LIVINGCHANGELOG_X_API_KEY`, `LIVINGCHANGELOG_X_API_SECRET`, `LIVINGCHANGELOG_X_ACCESS_TOKEN` and `LIVINGCHANGELOG_X_ACCESS_SECRET`. Generate the access token **after** setting write permission, or posting will be refused.
- **Discord:** channel settings, Integrations, Webhooks, New webhook, copy the URL into `LIVINGCHANGELOG_DISCORD_WEBHOOK_URL`.
- **Slack:** create an incoming webhook for a channel and put its URL in `LIVINGCHANGELOG_SLACK_WEBHOOK_URL`.

Then do a dry run (Step 8): the response includes the exact text of each post. If you'd like a few minutes to catch a mistake before anything goes out, add `"announce": { "delayMinutes": 15 }` to your config. If a channel keeps failing (expired token, wrong permission), the health report says which one and why, and the changelog itself keeps working.

## Step 10. Check its pulse

```bash
curl "https://your-site.com/api/livingchangelog/health" -H "Authorization: Bearer YOUR_OWNER_SECRET"
```

You want `"healthy": true`. If not, `findings` lists exactly what's wrong in plain words. After the first few runs, `receipts.valid` should also be `true`.

That's it. Check the health report now and then for the first week, and read the first few entries it publishes.

## When something looks wrong

| What you see | What it usually means | What to do |
|---|---|---|
| Always silent, "No pending release evidence" | It isn't receiving anything | Check the GitHub repo name and token, or that your deploy step is sending evidence |
| "Holding change until shipping is proven" | It saw the merge but no production deploy or release | Add the deploy step from Step 5, publish GitHub releases, or (if merging really means live for you) set `shippingPolicy` to `merge-to-production-is-live` |
| "Recent changelog entry exists; holding" | It's bundling small changes on purpose | Normal. Lower `minHoursBetweenEntries` if you want entries sooner |
| "Reviewers judged the entry unhelpful" | The change was real but not interesting to readers | Normal. It'll bundle it with something bigger |
| `401 unauthorized` | Wrong secret for that action | Health, dry runs and resets need the owner secret |
| `429 slow down` | Too many calls in a minute | Wait a minute; check nothing is calling it in a loop |
| "GitHub rate limit reached" | No GitHub token, or it's used up | Set `LIVINGCHANGELOG_GITHUB_TOKEN` |
| "Circuit breaker open" | Several runs in a row failed (often an AI account out of credit) | Fix the cause, then reset it: `curl -X POST .../api/livingchangelog/reset -H "Authorization: Bearer YOUR_OWNER_SECRET"` |
| "Announcement to bluesky ... failed" | A channel's password or token is wrong or expired | Fix that channel's env vars; new entries will post normally |
| `receipts.valid: false` | Someone edited or deleted its history | This should never happen. Find out who has database access |

---

# Part 2: How it thinks

## What it does on a normal tick

1. Pull new source evidence and deduplicate it.
2. Drop deterministic garbage before paying a model: ignored labels, dependency/chore patterns, non-publishable kinds.
3. Optionally audit an old entry instead of writing a new one.
4. Respect the bundling window after the most recent entry.
5. Triage pending evidence into **ignore**, **hold**, or **publish**.
6. Prove shipping before customer-facing availability language is allowed.
7. Draft a compact release note from only the selected evidence + your stable product facts.
8. Run the deterministic immune screen.
9. Let Reader and Skeptic independently judge usefulness and factual support.
10. Permit one repair pass.
11. Publish only if the final fitness gates pass; otherwise record silence.
12. Seal the run into the receipt chain either way.

## The important distinction: activity vs. shipping

A commit means code changed. A merged pull request means code was accepted. Neither necessarily means a user can access the change.

The recommended `explicit-only` policy requires a release, successful deployment, or explicit manual-live event before normal public copy can imply that a change is live.

That single rule prevents a large class of embarrassing changelog lies.

## Evidence states

- **pending** — the publisher can still use it.
- **used** — it supported a published entry.
- **ignored** — it was intentionally removed from consideration with a reason.

Holding does not change the state; the evidence remains pending so it can bundle with later related work.

## Silence is normal

Silence can mean:

- no new evidence
- only chores/refactors/dependency work arrived
- the change is too small and is being held for a bundle
- code changed but shipping has not been proven
- the reviewers found the entry unhelpful or unsupported
- the quality floor was not met

The machine is not paid by the post.

## Corrections

LivingChangelog periodically re-reads older entries against later evidence and current product facts. It is conservative about history: something that was true when published does not become “wrong” just because the product later changed.

When an amendment is actually needed, the corrected body must pass:

1. the deterministic immune gate, and
2. an independent Correction Skeptic that checks newly introduced/changed claims against original evidence, later evidence, and current product facts.

Accepted amendments append a dated public correction note. Rejected amendments leave the public entry untouched.

## DREAM

DREAM looks at publication/rejection/readership history and can propose strategy adjustments. It **never edits its own configuration**. The owner must explicitly accept a proposal.

## NEXUS + breaker

NEXUS moves between configured model providers when one is unavailable or rate limited. Repeated total failures trip the circuit breaker so the publisher stops burning calls while infrastructure is unhealthy.

## Receipts

Every tick—published, silent, blocked, audited, repaired, errored—is canonicalized and hash-chained to the previous run. The database refuses a second child for the same parent hash. Health verifies the stored chain all the way back to `GENESIS`.

This is an integrity signal, not a blockchain. It detects mutation/deletion/forking inside the stored ledger; it does not magically make the underlying evidence source trustworthy.

## What you control

Everything product-specific lives in `livingchangelog.config.json`:

- product/site/changelog naming
- audience and voice
- stable product facts
- forbidden/retired claims
- public categories
- shipping policy + production branch
- source ignore rules
- developer-only publication policy
- word targets
- quality floors
- cadence/audit timing
- breaker and rate limits

## Before letting it publish (recap)

Use an owner dry run:

`POST /api/livingchangelog/tick?dry=1`

A dry run can pull/inspect evidence and show the complete proposed entry plus gate results, but it does not publish or consume the selected evidence.

Then check:

`GET /api/livingchangelog/health`

You want no config/secret/breaker findings and a valid receipt chain once runs exist.

## Choosing a voice
LivingChangelog can sound plain, friendly, dry or technical. The voice only changes the wording. It still can't claim anything the evidence doesn't prove, and the dry voice never jokes about security issues or bugs that hurt people. Try them side by side before you choose:

```bash
npx livingchangelog preview --repo your/repo --voice friendly
npx livingchangelog preview --repo your/repo --voice dry
```

