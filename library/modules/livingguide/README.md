# LivingGuide

**Your project remembers itself.**

LivingGuide is a self-auditing canonical project intelligence system. It scans a project, extracts source-backed claims into a durable truth model, generates an Owner's Manual / architecture dossier from that model, attacks the result with an independent audit pass, and keeps continuity defects visible instead of inventing answers.

It is not a README generator. The rendered manual is a view over a persistent claim/evidence graph.

## What it produces

The Founder preset maintains an 18-section canonical archive covering:

1. Executive Summary
2. Canonical Identity
3. Project Classification
4. Core Concept
5. Full Feature Inventory
6. Architecture Analysis
7. Strategic Ecosystem Role
8. Development History
9. Current State Assessment
10. Monetization Analysis
11. Competitive Positioning
12. Future Vision
13. Priority Roadmap
14. Risk Analysis
15. Preservation & Continuity
16. Strategic Importance Ranking
17. Recommended Next Actions
18. Canonical Summary

Every edition also includes a source inventory, claim-status ledger, unknown/confirmation queue, audit scorecard and a **Resurrection Test**: could a capable future operator safely resume the project years later without guessing about critical architecture?

## The important design decision

```text
source artifacts
      │
      ▼
  ARCHIVIST ──────► claim/evidence graph
                         │
                         ▼
                      AUDITOR
                         │
             downgrade / flag / preserve
                         │
                         ▼
                      CURATOR
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
   canonical Markdown            PDF-ready HTML
          │
          ▼
    Resurrection Test
```

The guide is **not** the database. A claim stores its status, confidence, evidence references, exact evidence quotes, first-seen/last-verified timestamps, staleness, confirmation requirement and contradictions.

## Truth statuses

- `confirmed`
- `observed`
- `inferred`
- `planned`
- `speculative`
- `unknown`
- `needs_confirmation`
- `requires_audit`

`confirmed` and `observed` claims cannot survive the deterministic gate unless their quoted evidence actually exists in the ingested source artifact. A model cannot waive that rule.

If a source file changes or disappears, dependent claims are contaminated automatically. Confirmed/Observed claims are downgraded to `requires_audit` until they are re-established.

## Security behavior

LivingGuide is designed for owner-level material, so it is deliberately conservative:

- `.env`, private-key, credential and token-named files are skipped by the local scanner.
- likely secrets found inside otherwise-readable source are redacted **before** they enter persistent LivingGuide state or model context.
- generated output is scrubbed again before it can become a canonical guide.
- continuity instructions use secure-reference placeholders instead of printing credentials.
- the supplied PostgreSQL schema creates no anonymous read policy.

Do not treat LivingGuide as a secret manager. Store credentials in a real vault and document only the access procedure.

## Quick start

Requires Node 22.6+.

```bash
npx livingguide init --path .
```

Fill the remaining `[ENTER …]` fields in `livingguide.config.json`, then:

```bash
npx livingguide scan --path .
npx livingguide build --path .
```

The default output directory is:

```text
.livingguide/output/
├── OWNER-MANUAL.md
├── owner-manual.html
├── GUIDE-AUDIT.md
└── RESURRECTION-TEST.md
```

Persistent local truth state lives in `.livingguide/state.json` and should generally remain private.

## AI configuration

LivingGuide uses the model ladder in vendored `livingcore`.

Any one of these works:

```bash
# Anthropic
export ANTHROPIC_API_KEY=...

# OpenAI
export OPENAI_API_KEY=...

# Any OpenAI-compatible endpoint
export LIVINGGUIDE_AI_KEY=...
export LIVINGGUIDE_AI_URL=https://example.com/v1
export LIVINGGUIDE_AI_MODEL=your-model
```

`scan`, `status`, deterministic audit checks and the deterministic Resurrection Test can run without an AI provider. A canonical `build` intentionally refuses to fabricate a manual without a model.

## Commands

```text
livingguide init          create project configuration
livingguide scan          update the source-artifact inventory; no AI needed
livingguide build         extract/reconcile claims, audit, render a new edition
livingguide audit         forensic truth/completeness/continuity audit
livingguide resurrection  test whether a future operator can resume safely
livingguide status        state + open findings + sealed-receipt health
```

Use `--json` for machine-readable command output.

## Incremental behavior

On the first build, active source artifacts are extracted into claims. On later builds:

1. files are rescanned;
2. unchanged source is not re-extracted;
3. changed/deleted source contaminates dependent claims;
4. changed source is re-extracted;
5. the claim ledger is audited;
6. only then is a new canonical edition rendered.

Old guide editions remain in the state store. Run receipts are hash-chained so editing, deleting or forking run history is detectable.

## Presets

`founder` is the full canonical Owner's Manual and Strategic Intelligence File.

Other built-in views use the same truth model:

- `engineering` — architecture, capabilities, current state, risks and continuation
- `operator` — operational understanding, dependencies, risks, continuity and next actions
- `acquisition` — product/architecture/state/monetization/defensibility/risk/continuity view
- `custom` — choose section IDs explicitly

This is important: presets do not create separate competing truths. They are lenses over one project model.

## Programmatic sources

The local scanner handles repositories and text documentation. For creator notes, exported chats, research notes or any pre-extracted textual source, use `manualSource`:

```ts
import { manualSource } from "livingguide/adapters/manual";

const notes = manualSource("creator-notes", [
  {
    id: "decision-2026-10-01",
    title: "Architecture decision",
    text: "We chose ... because ...",
    kind: "note"
  }
]);
```

The same provenance and secret-redaction rules apply.

## Storage

For local use, `adapters/json.ts` keeps the full truth state in one atomic JSON file.

For server/private infrastructure, run `schema.sql` on PostgreSQL/Supabase and use `adapters/postgrest.ts` with a server-side service key. The schema stores artifacts, claims, guide editions, audit findings, sealed runs and engine state.

## HTML / PDF

LivingGuide generates a responsive, print-optimized HTML edition with:

- linked section anchors
- mobile layout
- print page rules
- table/code overflow handling
- archival light theme
- safe Markdown rendering (raw HTML is escaped)

Print that HTML to PDF from a browser or another trusted PDF renderer. No browser engine is bundled into the runtime.

## livingcore

`core/` is a vendored copy of `livingcore` and supplies:

- ORACLE deterministic utilities
- NEXUS provider failover
- breaker/health state
- lease control
- tamper-evident receipt chains
- DEFENSE primitives
- safe Markdown
- model adapters
- vendored-core drift verification

Do not patch the vendored files inside LivingGuide. Change `livingcore`, test it, then re-sync.

## Tests

```bash
npm test
npm run typecheck
npm run build
```

The v1.0.0 self-test covers evidence quote enforcement, uncertainty downgrades, source drift, secret handling, incremental source sync, the full multi-phase guide build, audit/resurrection flow, HTML safety, persistent JSON state, sealed receipt tamper detection and vendored-core integrity.

## What LivingGuide does not claim

- It does not prove market value merely by generating a valuation section.
- It does not infer production deployment from code alone.
- It does not make undocumented history true.
- It does not turn speculation into roadmap commitment.
- It does not recover credentials.
- It does not make an incomplete source inventory complete.

When the source set cannot answer something important, the product is supposed to leave a scar: `Unknown`, `Needs confirmation`, `Requires audit`, or a Resurrection Test defect.

## License

MIT. See `LICENSE`.
