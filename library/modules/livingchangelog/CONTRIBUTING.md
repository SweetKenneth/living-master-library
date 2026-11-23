# Contributing to LivingChangelog

Run `npm test` and a TypeScript typecheck before submitting changes.

Useful contributions include:
- evidence-source adapters (GitLab, Linear, Jira, Vercel, Netlify, Render, Fly, custom CI/CD)
- storage adapters implementing `engine/ports.ts`
- model adapters
- additional deterministic safety checks
- receipt/lease/defense hardening
- tests for false “shipped” claims and evidence edge cases

Keep the core vendor-neutral and dependency-free. Do not add product-specific copy or facts to the engine; those belong in `livingchangelog.config.json` and incoming evidence.

## Before you open a pull request
1. `npm test` passes (no keys or network needed).
2. `npm run typecheck` is clean (strict mode).
3. Every bug fix adds a self-test check that fails without the fix.
4. No runtime dependencies, and no `Math.random` in the engine (use `engine/oracle.ts`).
5. Never loosen shipping proof by default. "Merged is not shipped" is the product.

## Reporting a security issue
Please don't open a public issue. Email [ENTER SECURITY CONTACT EMAIL HERE] instead.

## Questions
[ENTER WHERE PEOPLE SHOULD ASK QUESTIONS HERE, e.g. GitHub Discussions or a community link]
