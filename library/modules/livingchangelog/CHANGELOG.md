# Changelog

## 1.2.0 (2026-10-02)

### Added
- **Announcements.** Published entries can be posted to Bluesky, Mastodon, X, Discord, Slack or a signed webhook. Posts are built from the entry's own gated title and excerpt with no extra model call, so they can never claim more than the changelog.
  - Fitted to each channel: link always last and never cut, links counted as 23 on X and Mastodon, emoji counted as one character for Bluesky, excerpt trimmed at a word before the title is touched.
  - Delivered through an outbox: text fixed and receipted at publish, retries with backoff, given up after 5 attempts, never posted twice, never fails a tick. `/health` reports failed channels and half-configured ones.
  - Optional `announce` config: `template`, `hashtags`, `delayMinutes`, `enabled`.
  - X uses OAuth 1.0a user tokens (they don't expire); the signing is verified against X's documented example. Discord posts can't ping `@everyone`. Bluesky posts get a clickable link and a link card.
  - Dry runs and `npx livingchangelog preview` show the exact post text.
- Founder's Guide: step-by-step setup for every channel.

### Changed
- **Moved onto livingcore.** NEXUS, the breaker, receipts, the tick lease, the rate gate, Markdown and ORACLE now come from `core/`, a vendored copy of livingcore shared with LivingPress. Existing receipts still verify (checked on a real database holding receipts sealed before the move). The self-test fails if `core/` is edited in place.

### Validation
- 106 self-tests (22 new). The real-database test now covers posting once and never re-posting across overlapping ticks.

## 1.1.0 (2026-10-02)

### Added
- **`npx livingchangelog preview --repo owner/name`.** Runs the real engine against any public GitHub repo with in-memory storage and publishes nothing. Without an AI key it shows which changes can be proven live and what would be skipped; with `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or any OpenAI-compatible endpoint it drafts the entries. Supports `--since`, `--voice`, `--policy explicit|merge`, `--max`, `--commits`, `--json`, `--token`, and `--api` for GitHub Enterprise.
- **Voices:** `plain`, `friendly`, `dry` and `technical`. Each sets the writing style and how the CLI narrates what it skipped. Voices never change what may be claimed. The setup wizard offers them, and a test keeps the wizard and engine presets in sync.
- **npm packaging:** `bin`, `exports`, `files`, and a `dist/` build (`npm run build`, run automatically before publish), because Node will not strip TypeScript inside `node_modules`. Runtime dependencies are still zero.
- **Founder's Guide setup walkthrough:** ten plain-language steps from first preview to health check, a table explaining the three secrets and where every key goes, copy-paste GitHub Actions snippets for the deploy webhook and the schedule, and a troubleshooting table.
- **One set of AI key rules everywhere:** the server example and the CLI now share `modelsFromEnv()`, so `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` and `LIVINGCHANGELOG_AI_KEY` (+ `_URL`/`_MODEL`) work in both. Previously the server sent any key to the Lovable gateway.
- README: a 60-second try-it section, voices, and a comparison with release-please, semantic-release, changesets and git-cliff.

### Fixed
- **Short, good releases went silent.** The release length floor (about 56 words) rejected tight entries, so terse voices and two-bullet releases were refused for being brief. Defaults are now 40 words for releases and 20 for updates.

### Validation
- 84 self-tests (23 new). The installed package was exercised end to end through `npm pack` and `npx` against a mock GitHub API and a mock OpenAI-compatible model in all four voices, and the storage layer against real Postgres + PostgREST.

## 1.0.1 (2026-10-02)

Fixes found by reading the code against real-world release flows, plus a full end-to-end run on Postgres + PostgREST. Every fix has a self-test that fails on 1.0.0 (12 new checks, 61 total).

### Fixed
- **A PR could be stuck forever when triage discarded its deploy.** Triage naturally keeps the meaningful PR and drops the bare "Production deployment" event, which was the only proof the PR shipped. Shipping proof now searches recent shipping records in any status and attaches the covering one as provenance. One deploy can now prove several entries.
- **A staging deploy could prove a change was live.** A deployment or manual event naming a non-production `environment` is no longer proof, even when a webhook also sends `shipped: true`.
- **Versions could be invented.** A version from triage is only printed if the evidence contains it; otherwise it is dropped and recorded in the receipt.
- **Audits only ever saw the oldest 60 evidence rows,** so later reversals were invisible after a while. Evidence can now be listed newest first, and audits use it.
- **Entries were audited minutes after publishing.** An entry must be public for one audit cooldown first.
- **Commits merged late were missed.** GitHub lists commits by commit date, so a branch merged today with week-old commits fell behind the cursor. Commits are now re-read over a lookback window (`commitLookbackHours`, default 72); the database drops duplicates.
- **Ingest accepted any `kind`** and echoed raw database errors to webhook callers. Kinds are validated up front; storage errors return a generic message.
- **Owner evidence view showed the oldest ignored items** instead of the most recent.
- **Atom feed was missing the required author** and had no entry content. Both feeds now include full HTML content with public corrections.

### Improved
- GitHub rate limiting is reported plainly, with a hint to set a token.
- `test:db` is now a full end-to-end run on a real database: publish, proof attachment, overlapping-tick lease and receipt chain back to `GENESIS`.
- README: placeholders for live example, maintainer credit, install offer and a showcase table.

## 1.0.0 (2026-10-01)

Initial release, split from the LivingPress architecture and rebuilt around release evidence rather than content planning.

### Added
- Evidence-first autonomous changelog loop: sync → triage → shipping proof → draft → immune screen → Reader/Skeptic → one repair pass → publish/silence.
- GitHub source for published Releases, successful Deployments, merged pull requests, and default-branch commits.
- Generic authenticated evidence-ingest endpoint for CI/CD, Lovable, Vercel, Cloudflare, internal systems, and manual release events.
- Three shipping policies, with `explicit-only` as the safe default.
- Evidence deduplication, deterministic ignore rules, hold/bundle behavior, stale-evidence repair, and used/ignored provenance.
- Public changelog entry model with categories, audience, version, caveats, epistemic status, source evidence IDs/URLs, and correction diary.
- Independent Correction Skeptic for historical amendments.
- NEXUS provider failover, circuit breaker, DREAM proposals, deterministic ORACLE choices, DEFENSE rate gates, dry runs, and framework-neutral HTTP handler.
- Append-only, fork-resistant, full-history receipt verification to `GENESIS`.
- Atomic tick lease and atomic shared admin-rate bucket in Postgres.
- Separate `livingchangelog_*` SQL/API/config/secret namespace so LivingPress and LivingChangelog can coexist.
- Zero-dependency Atom + JSON Feed renderers for public changelog syndication.
- Zero installed runtime dependencies.

### Validation
- 48 self-tests covering config, evidence policy, shipping proof, publication gates, correction safety, receipt integrity, failover, HTTP auth/ingest, Markdown safety, GitHub mappings, and determinism.
- Strict TypeScript type-check.
