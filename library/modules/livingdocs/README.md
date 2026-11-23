# LivingDocs

**Documentation that stays true.**

LivingDocs is an evidence-backed documentation maintenance system. It scans code, configuration, schemas, tests and existing documentation, builds a persistent documentation truth model, generates a maintained docs edition, then audits that edition for drift.

It is not a README generator and it does not treat existing prose as proof that current behavior still exists.

## Core idea

```text
implementation evidence ─┐
                         ├──► EVIDENCE READER ─► documentation truth model
existing documentation ──┘                           │
                                                    ▼
                                              DRIFT AUDITOR
                                                    │
                                    downgrade / flag / preserve
                                                    │
                                                    ▼
                                                 CURATOR
                                                    │
                                  ┌─────────────────┴───────────────┐
                                  ▼                                 ▼
                           canonical Markdown                printable HTML
                                  │
                                  ▼
                         Documentation Verification
```

The rendered docs are not the source of truth. Claims store evidence, status, confidence, basis, timestamps and staleness. If source evidence changes or disappears, dependent claims become stale before a new edition can pretend nothing happened.

## What LivingDocs catches

- a README says a flag exists after the CLI renamed it
- an API page documents a route that disappeared
- a config guide lists an old default
- an example imports an interface that no longer exists
- a feature exists in code but has no documentation coverage
- docs claim behavior using only other docs as evidence
- planned/TODO behavior is presented as shipped
- generated docs leak secrets or overpromise compatibility
- source evidence changes underneath an existing claim

## Documentation sections

The default `developer` preset maintains:

1. Overview
2. Getting Started
3. Installation
4. Configuration
5. Core Concepts
6. Architecture
7. API Reference
8. CLI Reference
9. Data Model & State
10. Examples
11. Operations
12. Security
13. Troubleshooting
14. Migration & Upgrades
15. Known Limitations
16. Reference Index

Other built-in lenses use the same truth model: `api`, `cli`, `operator`, and `custom`.

## Evidence rules

LivingDocs uses the same eight epistemic states as the Living family:

- `confirmed`
- `observed`
- `inferred`
- `planned`
- `speculative`
- `unknown`
- `needs_confirmation`
- `requires_audit`

`confirmed` and `observed` claims require an exact quote that actually exists in an ingested source artifact.

For behavior claims tagged as API, CLI, configuration, runtime, operation, default or example behavior, **documentation prose alone cannot prove current implementation**. A behavior claim supported only by documentation is downgraded until code, tests, configuration, schema or another executable interface supports it.

## Quick start

Requires Node 22.6+.

```bash
npx livingdocs init --path .
npx livingdocs scan --path .
npx livingdocs build --path .
```

Default output:

```text
.livingdocs/output/
├── LIVING-DOCS.md
├── living-docs.html
├── DOCS-AUDIT.md
└── DOCS-VERIFICATION.md
```

Persistent local state lives in `.livingdocs/state.json`.

## Commands

```text
livingdocs init      create configuration
livingdocs scan      inventory and hash source evidence; no AI required
livingdocs build     extract/reconcile claims, audit drift, render a new edition
livingdocs audit     forensic drift and coverage audit
livingdocs verify    test whether the docs are safe enough to use without guessing
livingdocs status    state, findings and sealed receipt-chain health
```

Use `--json` for machine-readable output.

## AI providers

Any one of these works:

```bash
export ANTHROPIC_API_KEY=...
export OPENAI_API_KEY=...

# OpenAI-compatible endpoint
export LIVINGDOCS_AI_KEY=...
export LIVINGDOCS_AI_URL=https://example.com/v1
export LIVINGDOCS_AI_MODEL=your-model
```

Scanning, deterministic drift checks, status and deterministic verification do not require a model. A documentation build intentionally refuses to invent prose without a model provider.

## Security behavior

- `.env`, private-key and credential-named files are skipped by the local scanner.
- likely secrets inside otherwise-readable source are redacted before persistence/model context.
- generated output is scrubbed again before it becomes an edition.
- secret values are never required in documentation; document the variable or access procedure, not the credential.

LivingDocs is not a secret manager.

## Incremental behavior

On the first build, active artifacts are extracted into claims. Later builds:

1. rescan source evidence;
2. leave unchanged sources alone;
3. mark claims backed by changed/deleted sources stale;
4. re-extract changed evidence;
5. run deterministic + model drift audit;
6. generate documentation from the reconciled ledger;
7. run a final rendered-doc audit;
8. seal the run in the livingcore receipt chain.

## livingcore

`core/` is a vendored copy of `livingcore`, supplying deterministic utilities, model failover, breakers, leases, receipt chains, DEFENSE primitives, safe Markdown, model adapters and vendored-core drift verification.

Do not patch the vendored core inside LivingDocs. Change livingcore, test it, then re-sync.

## Tests

```bash
npm test
npm run typecheck
npm run build
```

The self-test exercises evidence gates, circular-doc-proof rejection, source drift, secret handling, local scanning, documentation verification, rendered HTML safety, persistence, sealed receipts and vendored-core integrity.

## Founder’s Guide

LivingDocs ships with a canonical founder/archive dossier in two forms:

- `FOUNDERS-GUIDE.md` — source-friendly archival Markdown
- `FOUNDERS-GUIDE.html` — responsive, print-ready standalone edition

The Founder’s Guide documents LivingDocs itself: architecture, truth invariants, feature inventory, current state, risks, roadmap, continuity/resurrection guidance, strategic options and unresolved unknowns. It deliberately refuses unsupported claims about adoption, deployment or valuation.

## Product thesis

> **Docs are a projection of reality, not an independent reality.**

When evidence is insufficient, LivingDocs leaves the gap visible rather than writing something plausible.

## License

MIT. See `LICENSE`.
