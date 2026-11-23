# livingcore

The shared engine under [LivingPress](https://github.com/SweetKenneth/living/tree/main/modules/livingpress), [LivingChangelog](https://github.com/SweetKenneth/living/tree/main/modules/livingchangelog) and LivingGuide. Zero dependencies. Plain TypeScript, `fetch` and Web Crypto.

| Module | What it does |
|---|---|
| `oracle.ts` | Determinism: canonical JSON, SHA-256, seeded random streams. No `Math.random`. |
| `nexus.ts` | Model failover ladder. Rate-limited, out-of-credit or sick providers are benched with a doubling cooldown; unreadable JSON is retried once. |
| `breaker.ts` | Circuit breaker and heartbeat: trips after repeated failures, half-open probe after cooldown, plain-language health findings. |
| `receipts.ts` | Hash-chained run receipts, generic over each product's row. Postgres-safe normalization, fork refusal with retry, verification back to GENESIS. |
| `lease.ts` | One tick at a time. Atomic with a database function, best effort otherwise. |
| `defense.ts` | Agent classification, day-rotating signatures (no raw IPs), rate gate, constant-time secret compare. |
| `markdown.ts` | Small, safe Markdown to HTML. All raw HTML escaped, protocol-relative links refused. |
| `models.ts` | OpenAI-compatible, Anthropic and Lovable Gateway providers, plus `modelsFromEnv()` with a per-product env prefix. |
| `vendor.ts` | The drift check products run against their vendored copy. |

## How products use it

Products don't install livingcore. They **vendor** it: a copy lives in each product's `core/` folder with a `CORE-MANIFEST.json` of file hashes. That keeps every product a single repo with zero dependencies, and each product's self-test fails if `core/` is edited in place.

To change the core:

```bash
npm test                     # 28 checks, no keys, no network
npm run typecheck
node scripts/sync.mjs ../livingpress ../livingchangelog ../livingguide
```

Then run each product's tests and commit the synced `core/` in each repo.

## Rules for code in here

- Nothing product-specific. If only one product needs it, it belongs in that product.
- No runtime dependencies, no `Math.random`, no Node-only APIs (the products run on Cloudflare Workers, Deno and Bun too).
- Never change how an existing receipt is hashed. Each product defines its own `payload` function; `createReceipts` only runs it.

## License

MIT. See [LICENSE](LICENSE).
