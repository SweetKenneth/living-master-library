# LivingChangelog — installation questions

Ask these in order. Never invent an answer. Write the answers into `livingchangelog.config.json` or run `node install/wizard.mjs`.

## Product

1. What is the product/company name?
2. What is the public site URL?
3. What should the changelog be called? (`Product Changelog` is fine.)
4. Where should it live? (default `/changelog`)
5. One-line description/tagline for the changelog?
6. Who reads it: customers, developers, admins, partners, or a mix?

## Truth and voice

7. What stable facts about the product are true today? Include real plan names, surfaces, platforms, features, and important limitations.
8. What must the publisher never claim unless explicit evidence proves it?
9. What voice should release notes use? Default: compact, factual, user-impact first, no hype.
10. Any words/phrases you want retired from future and corrected historical copy?

## Evidence and shipping

11. What systems can provide evidence? GitHub, Lovable, Vercel, Cloudflare, CI/CD, internal deploy table, manual webhook, etc.
12. If GitHub: repository `owner/repo`; is it private; and should releases, successful deployments, PRs, and commits all be read?
13. What branch represents production? (default `main`)
14. What environment names count as production deployments? (defaults: `production`, `prod`, `live`)
15. Which shipping policy is true for this product?
   - `explicit-only` — release/deployment/manual-live event required *(recommended)*
   - `merge-to-production-is-live`
   - `commit-on-production-is-live`
16. Should developer-only changes be publishable even when they do not assert customer production availability? (default no)
17. What labels or title patterns should always be ignored? Typical: `chore`, `dependencies`, `dependabot`, `internal-only`, `no-changelog`.

## Publication behavior

18. Minimum hours between public entries? (default 4; small changes accumulate into bundles.)
19. How long before unconsumed evidence becomes stale? (default 30 days)
20. How often should old entries be audited? (default every 4th tick, with a 72-hour per-entry cooldown)
21. Desired length: update default 40–240 words; release default 80–500 words.
22. Review strictness: Reader 70/100, Skeptic 85/100, fitness 0.75 by default.

## Infrastructure

23. Postgres/PostgREST/Supabase/Lovable Cloud URL and server/service-role key.
24. Primary AI gateway/provider and server-side key.
25. Optional backup AI provider/key/model for NEXUS failover.
26. What will schedule `POST /api/livingchangelog/tick`?
27. Generate three independent ≥32-character secrets: cron, owner, and optional ingest.

## Public surface

28. Confirm the public routes, normally `/changelog` and `/changelog/:slug`.
29. Confirm each entry should be added to sitemap + page-specific canonical/title/description/OG metadata.
30. Decide whether evidence/source links are public UI or retained only as internal provenance.
