# Changelog

## 1.2.0 (2026-10-02)

### Changed
- **Moved onto livingcore.** Model failover, circuit breaker, receipts, tick lease, rate gate, Markdown and deterministic choices now come from `core/`, a vendored copy of livingcore shared with LivingChangelog, so a fix lands in both products at once. The self-test fails if `core/` is edited in place.
- Receipts sealed by 1.1.x still verify (checked against a fixture of Postgres-shaped 1.1.1 receipts).

### Improved (inherited from the core)
- **`/health` verifies receipts all the way back to GENESIS,** not just the newest 500. Both bundled storage adapters can page through history.
- **Any AI key works on the server.** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `LIVINGPRESS_AI_KEY` with optional `LIVINGPRESS_AI_URL` and `LIVINGPRESS_AI_MODEL`. Before, the example server sent every key to the Lovable gateway.
- The rate gate uses an atomic database counter when the storage offers one.

### Fixed
- The real-database test cleans up after itself, so it can be re-run on the same scratch database.

### Validation
- 60 self-tests (4 new), plus the real-database test passing three times in a row on one database.

## 1.1.1 (2026-10-01)

Found by reading a live blog running the pre-release engine, which had published reworded twins such as "Link SBOM entries to exact source commits" and "Linking SBOM Entries to Exact Source Commits".

- **The planner only saw the 60 newest titles.** Past 60 posts, old topics fell out of view and came back reworded. It now sees every title, grouped by topic with counts, within a size budget, and is told to treat a crowded theme as saturated.
- **Duplicate check was exact-match only.** New stem-based similarity (`similar.ts`): a proposed topic that rewords an existing post, queued topic, or previously used or rejected topic is never queued. Close-but-different topics are kept at half priority.
- **Reviewer could rename a post into an existing title.** The final title is checked too; it falls back to the planned title, or the tick stays silent and records why.
- **Skeptic brain** now deducts for a title that promises what the body does not deliver, and for imprecise technical statements.
- Rejected twins are listed in the tick receipt (`duplicatesRejected`).
- Title stemming folds a trailing "e" (store/storing, price/pricing). 7 new self-test checks (56 total).

## 1.1.0 (2026-10-01)

Bug fixes and hardening. Every fix below has a test that fails on 1.0.1 and passes on 1.1.0 (27 of the 49 self-test checks), plus a new real-database integration test.

### Fixed: correctness
- **Receipts always verified as invalid on Postgres.** Postgres returns `+00:00` timestamps and the hash expected `Z`. The hashed payload is now normalized, so health reports `receipts.valid: true`, including for rows 1.0.1 already wrote.
- **Overlapping scheduler calls published twice.** New atomic tick lease (`livingpress_try_lease` in SQL, with a best-effort fallback for other storages).
- **Receipt chain could fork** when two ticks sealed at once. A unique index on `prev_hash` refuses the second, which retries against the new tip.
- **Audits stopped after 50 ticks** (tick number came from a query capped at 50) and **advocacy cadence froze after 200 posts.** Both now use a durable counter in state.
- **Engine ran on a placeholder config,** despite the docs. It now seals a `blocked` receipt and calls no model.
- **Malformed model JSON crashed ticks** (and could trip the breaker). All model output is type-checked; an unparseable review is retried once before counting as a failure.
- **Corrector amendments skipped the safety gate.** They are now screened; a fix that adds leakage, fake proof or unsafe advice is refused. Truncated rewrites are refused too.
- **Audit errors were silently swallowed.** They are recorded in the receipt.

### Fixed: safety gate
- `Certainly!` leakage never matched (a trailing `\b` after `!`).
- Links to the blog index, and site links configured with a trailing slash, were flagged as dead.
- Numbers and phrases inside code blocks were treated as claims.
- `50 %` vs `50%` no longer counts as a number missing from the house facts.
- A bare mention of "testimonials" no longer blocks a post; claims like "our customers love" still do.

### Fixed: rendering and media
- Markdown renderer rewritten line by line: fenced code with blank lines, a heading directly above its paragraph, lazy list lines, nested blockquotes, inline code protected from emphasis, protocol-relative `//host` links refused, images supported with safe URLs only.
- Generated images returned as hosted URLs (which expire) are now downloaded and re-uploaded. Filenames no longer collide. Image size is configurable.
- `curatedLibrary` refuses placeholder entries from `images.json` instead of publishing broken image links, and matches multi-word tags.
- H1 demotion ignores `#` lines inside code. Posts wrapped in a ```` ```markdown ```` fence are unwrapped.

### Fixed: infrastructure
- Rate gate wrote one permanent database row per visitor per day. Now one row per surface, reset every minute; public reads use per-isolate memory (`guardPublic`) and cost no database call at all.
- AI crawlers like GPTBot were misclassified once a generic bot rule existed; uptime monitors were counted as humans.
- `insertTopic` hid every database error as "duplicate". Only a 409 is a duplicate now.
- HTTP handler returns clean JSON 500s instead of throwing; `GET /tick` is a 405.
- Example worker built its whole dependency graph on every request and relied on `this` in `scheduled`.

### Improved
- **Dry run:** `POST /api/livingpress/tick?dry=1` (owner only) drafts, screens and reviews, publishes nothing, generates no image, and returns the draft.
- **NEXUS** benches providers on timeouts, network errors and 5xx (short, doubling cooldown), so a dead primary no longer costs 90 seconds per call. Bench state is read once per tick. OpenAI-compatible hosts that reject `response_format` are detected and retried without it.
- **Health** now returns `healthy` and a single `findings` list covering breaker, heartbeat, config problems and weak or identical secrets, plus counters and benched models.
- **validateConfig** checks URLs, paths, regexes, number ranges and cluster ids, not just placeholders.
- **Install wizard** validates and normalizes answers, de-duplicates cluster ids, asks for retired words, backs up the old config, prints two fresh 256-bit secrets, and lists anything still unanswered.
- **Schema** is idempotent (re-run to upgrade), blocks `TRUNCATE` on receipts, revokes anon access explicitly, and indexes the topic queue.
- Slugs fold accents (`café` → `cafe`). Excerpts fall back to the first sentence. Support posts attach to the pillar with the fewest supports.
- `tsconfig.json` and `npm run typecheck` (strict, clean); `npm run test:db` for a real database.

## 1.0.1
Initial packaged release (private).
