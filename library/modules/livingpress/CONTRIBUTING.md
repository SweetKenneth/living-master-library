# Contributing to LivingPress

Thanks for helping. A few ground rules keep the engine trustworthy.

## Before you open a pull request
1. `npm test` passes (no keys or network needed).
2. `npm run typecheck` is clean (strict mode).
3. Every bug fix adds a self-test check that fails without the fix.
4. No runtime dependencies. The engine is plain TypeScript, `fetch` and Web Crypto on purpose.
5. No `Math.random` in the engine. Use the seeded streams in `engine/oracle.ts`.

## What fits
- New storage, model or image adapters (in `adapters/`, implementing the ports in `engine/ports.ts`).
- Better safety-gate patterns in `engine/immune.ts`, with a test showing a real false negative or false positive.
- Fixes that make installs easier.

## What doesn't
- Anything that makes the engine publish more often by default. Silence is a feature.
- Site-specific content. All content lives in `livingpress.config.json`.

## Reporting a security issue
Please don't open a public issue. Email [ENTER SECURITY CONTACT EMAIL HERE] instead.

## Questions
[ENTER WHERE PEOPLE SHOULD ASK QUESTIONS HERE, e.g. GitHub Discussions or a community link]
