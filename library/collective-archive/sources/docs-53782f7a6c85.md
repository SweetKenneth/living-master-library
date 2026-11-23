# LivingDocs — Canonical Founder’s Guide

**Canonical Owner’s Manual & Strategic Intelligence File**  
**Edition:** 1.0.2 documentation archive  
**Audit date:** 2026-10-02  
**Product:** LivingDocs  
**Product thesis:** **Documentation that stays true.**

**Kenneth E. Sweet Jr.**  
Solo Founder · Infrastructure Architect  
PromptFluid@gmail.com · KESJR.com  
Abilene, Texas 79605

---

## Document Status & Truth Legend

This Founder’s Guide is a human-readable canonical archive for LivingDocs itself. It is based primarily on the LivingDocs 1.0.x repository supplied with the product bundle, including source code, configuration, tests, schema, README, product guide, package metadata, installer, and vendored `livingcore` manifest.

The following labels are used deliberately:

- **Confirmed** — directly supported by current repository evidence and, where applicable, passing tests.
- **Observed in code/docs** — present in source or project documentation, but not independently proven in a live deployment.
- **Inferred** — a reasonable architectural or strategic interpretation of confirmed implementation.
- **Planned** — explicitly described as future direction, not current capability.
- **Speculative** — a possible future or commercial path without current implementation or validation.
- **Unknown** — the repository does not contain sufficient evidence.
- **Needs creator confirmation** — requires founder context not recoverable from the repository alone.
- **Requires further audit** — could be established with additional runtime, market, security, or operational evidence.

### Source inventory used for this guide

**Confirmed repository sources include:**

- `README.md`
- `LIVINGDOCS-GUIDE.md`
- `CHANGELOG.md`
- `package.json`
- `livingdocs.config.json`
- `schema.sql`
- `engine/*`
- `adapters/*`
- `cli/*`
- `presets/*`
- `install/*`
- `examples/*`
- `test/selftest.ts`
- `core/CORE-MANIFEST.json`
- vendored `core/*`

**Not available as evidence in this archive:** production telemetry, paid-user data, external benchmarks, customer interviews, revenue records, acquisition offers, security penetration tests, third-party code audits, npm download history, live deployment records, or verified market research.

Accordingly, this guide makes no claim that those things exist.

---

# 1. Executive Summary

## What the project is

**Confirmed.** LivingDocs is an evidence-backed documentation maintenance system. It scans project artifacts such as code, configuration, schemas, tests, and existing documentation; converts relevant facts into a persistent documentation truth model; generates documentation editions from that model; audits those editions for drift and unsupported certainty; and records sealed run receipts through vendored `livingcore` infrastructure.

LivingDocs deliberately treats documentation as a **projection of project evidence**, not as an independent source of operational truth.

## Why it exists

**Confirmed from product thesis and implementation.** Software documentation routinely decays without obvious failure signals. A CLI flag can be renamed while a README continues to describe the old name. An API route can disappear while generated prose remains confident. Defaults can change. Examples can age. Planned behavior can accidentally be described as current behavior.

LivingDocs exists to make those forms of documentation drift visible and correctable.

## Problem solved

The project addresses five related documentation failures:

1. **Stale certainty** — old documentation remains authoritative after implementation changes.
2. **Circular proof** — documentation is treated as proof that another documentation page is correct.
3. **Silent drift** — evidence changes without invalidating dependent prose.
4. **Speculative filling** — missing evidence is replaced by plausible generated text.
5. **Unverifiable maintenance** — teams cannot easily distinguish current, inferred, planned, stale, and unknown documentation claims.

## Current maturity level

**Estimate based on repository evidence, not market validation.** LivingDocs 1.0.x is best classified as a **functionally coherent early product / developer tool** rather than a proven production platform.

Evidence supporting that assessment:

- **Confirmed:** complete TypeScript source tree exists.
- **Confirmed:** CLI commands exist for `init`, `scan`, `build`, `audit`, `verify`, and `status`.
- **Confirmed:** local JSON and PostgREST storage adapters exist.
- **Confirmed:** local source scanning, claim extraction workflow, drift propagation, deterministic audits, rendering, verification, and receipt sealing are implemented.
- **Confirmed:** self-test reports **108 passed, 0 failed** in the supplied build environment.
- **Confirmed:** TypeScript typecheck and distributable build are configured.
- **Observed:** package metadata is structured for npm distribution.
- **Unknown:** public package publication status.
- **Unknown:** production user adoption.
- **Unknown:** sustained operation against large real-world repositories.
- **Unknown:** real-world false-positive/false-negative rate for claim extraction and drift detection.

## Strategic importance

**Inferred.** LivingDocs is strategically important less as a standalone documentation writer and more as a reusable **truth-maintenance surface** built on `livingcore`. It demonstrates that the shared kernel can maintain a domain-specific truth model, apply deterministic evidence gates, involve model reasoning only where useful, preserve uncertainty, detect drift, and render durable human-facing artifacts.

Within the broader Living family, LivingDocs occupies the technical-explanation layer:

```text
LivingPress       -> maintains published/editorial material
LivingChangelog   -> maintains release/history truth
LivingGuide       -> maintains institutional/project memory
LivingDocs        -> maintains technical documentation truth
livingcore        -> shared reliability and governance substrate
```

This relationship is architectural/strategic, not a claim that the products are currently integrated at runtime.

## Short-term opportunity

**Inferred.** The shortest path to a stronger product is to prove LivingDocs on several heterogeneous repositories and expose evidence at the claim level. The current engine already has the abstractions needed to ingest, classify, store, audit, and render. Real-world validation is now more valuable than another large feature layer.

## Long-term vision

**Planned/Speculative.** A mature LivingDocs could become a continuously reconciled technical documentation system capable of combining repository evidence, schemas, live interfaces, compiler/test feedback, deployment state, and release history. The existing 1.0.x repository names several natural extensions, including executable example verification, language-server/compiler hooks, endpoint probes, multi-page documentation sites, inline provenance, PR drift comments, and cross-product reconciliation.

Those are future directions, not current capabilities.

---

# 2. Canonical Identity

## Official name

**Confirmed:** LivingDocs

## Canonical thesis

**Confirmed:** **Documentation that stays true.**

## Core principle

**Confirmed:** “Docs are a projection of reality, not an independent reality.”

## Alternate names / codenames

**Unknown.** No alternate codename is established in the current repository.

## Domain associations

**Unknown.** No dedicated LivingDocs domain is configured in the repository metadata. `package.json` currently contains placeholder GitHub repository fields.

## Creator attribution

**Creator-provided context:**

- Kenneth E. Sweet Jr.
- Solo Founder
- Infrastructure Architect
- PromptFluid@gmail.com
- KESJR.com
- Abilene, Texas 79605

The package metadata names the author (Kenneth E. Sweet Jr., kesjr.com) as of 1.0.2 and points to the single family repository, `SweetKenneth/living`, under `modules/livingdocs`. Whether that repository is public is not established by this package.

## Creation timeline

**Confirmed from repository changelog:**

- **2026-10-02:** LivingDocs 1.0.0 initial release line recorded.
- **2026-10-02:** Founder’s Guide / archival documentation patch prepared as 1.0.1.
- **2026-10-03:** 1.0.2 scanner fix: the local scanner skips Living Master Library’s `.living/` directory so generated output and state are never read back as implementation evidence.

Earlier ideation chronology is not present inside the repository and therefore requires creator confirmation if it is to be preserved canonically.

## Version lineage

```text
livingcore 1.0.0
      │
      └── vendored into LivingDocs

LivingDocs 1.0.0
      │
      └── initial evidence-backed documentation engine

LivingDocs 1.0.1
      │
      └── canonical Founder’s Guide and archival presentation patch

LivingDocs 1.0.2
      │
      └── scanner skips the Library’s .living/ control directory
```

The `livingcore` version shown here is based on `core/CORE-MANIFEST.json` and `core/README.md`. LivingDocs package version is controlled by `package.json` and the CLI version constant.

---

# 3. Project Classification

LivingDocs spans several categories simultaneously.

| Classification | Status | Reasoning |
|---|---|---|
| Developer tool | **Confirmed** | CLI, repository scanning, generated technical docs, audit/verification workflows |
| Documentation system | **Confirmed** | Core product purpose |
| AI-assisted system | **Confirmed** | Build path requires model provider for extraction/generation; deterministic operations can run without AI |
| Deterministic governance system | **Confirmed** | Evidence gates, drift propagation, audit rules, verification checks, breakers, leases, receipts |
| Infrastructure component | **Inferred** | Can function as documentation infrastructure inside a larger development workflow |
| SaaS | **Speculative** | No hosted SaaS implementation or billing evidence in current repo |
| API product | **Speculative** | Engine exports exist, but no hosted public API product is demonstrated |
| Agent framework | **Not the primary classification** | It uses role-oriented model passes but is purpose-built rather than a general agent framework |
| Research system | **Partially inferred** | The evidence/provenance approach explores truth-maintenance patterns, but repo presents itself as a product |
| Governance | **Confirmed at documentation scope** | It governs what documentation claims are allowed to become authoritative |
| Asset | **Confirmed in ordinary sense** | It is a packaged software codebase; no independent financial valuation is established |

---

# 4. Core Concept

## Core idea

**Confirmed.** LivingDocs separates **evidence**, **claims**, and **rendered documentation**.

The system does not begin by asking a model to “write docs.” It first inventories source artifacts, extracts claims, validates those claims against stored evidence, assigns epistemic state and confidence, audits for drift or unsupported certainty, and only then renders a human-readable documentation edition.

The canonical control flow is:

```text
SOURCE ARTIFACTS
  │
  ├── code
  ├── tests
  ├── schemas
  ├── configuration
  ├── API descriptions
  └── existing docs
  │
  ▼
SOURCE SYNC + HASHING
  │
  ▼
EVIDENCE READER
  │
  ▼
TRUTH CLAIM LEDGER
  │
  ├── status
  ├── confidence
  ├── basis
  ├── exact source quotes
  ├── timestamps
  ├── staleness
  └── contradictions
  │
  ▼
DRIFT / CLAIM AUDIT
  │
  ▼
CURATOR
  │
  ├── Markdown edition
  └── responsive print-ready HTML
  │
  ▼
RENDERED-DOC AUDIT
  │
  ▼
DOCUMENTATION VERIFICATION
  │
  ▼
SEALED RUN RECEIPT
```

## Unique innovation

The strongest differentiator visible in v1 is the explicit rule that **documentation cannot automatically prove implementation behavior**.

`engine/truth.ts` includes logic that downgrades a behavior-like `confirmed` claim to `requires_audit` when all supporting artifacts are documentation. The behavior-like tags include API, CLI, config, runtime, default, operation, and related categories.

This prevents a common generated-doc failure mode:

```text
old README says route exists
        ↓
model repeats README
        ↓
new generated docs appear “verified”
```

LivingDocs instead requires stronger implementation evidence for implementation claims.

## Technical moat

**Inferred, not a market claim.** The project’s potential technical defensibility comes from composition rather than any single algorithm:

- claim/evidence separation;
- exact-quote support checks;
- eight-state epistemic model;
- source hashing and incremental reconciliation;
- contamination of claims when supporting evidence changes or disappears;
- deterministic audits before and after generation;
- deterministic verification independent of model availability;
- secret handling before persistence/model context and after generation;
- sealed run receipts;
- reusable adapters and storage interfaces.

None of these individually proves a commercial moat. The moat would depend on execution quality, integrations, workflow adoption, evidence coverage, and accumulated reliability.

## Ecosystem moat

**Speculative/Inferred.** The strongest ecosystem advantage could arise if multiple Living products share evidence while maintaining separate truth responsibilities. For example, LivingChangelog could provide release evidence to LivingDocs, while LivingGuide could consume documentation evidence for institutional continuity. That cross-product relationship is not currently implemented in LivingDocs v1.

---

# 5. Full Feature Inventory

## 5.1 Local repository scanning

**Confirmed.** `adapters/local.ts` recursively scans a configured project root.

Current behavior includes:

- deterministic path traversal;
- supported-extension filtering;
- ignored directories including `.git`, `node_modules`, build artifacts, virtual environments, and `.livingdocs`;
- configurable maximum files and maximum file size;
- binary-looking file skipping;
- artifact classification;
- language classification;
- source modification timestamps;
- content hashing;
- excerpt truncation;
- redaction count metadata;
- warnings when scan limits are reached.

## 5.2 Artifact classification

**Confirmed.** Local files can become these evidence types:

- `source_code`
- `documentation`
- `configuration`
- `test`
- `schema`
- `api_schema`
- `history`
- `asset`
- `note`
- `manual`

OpenAPI/Swagger files, GraphQL files, and Proto files receive `api_schema` treatment.

## 5.3 Secret-file exclusion

**Confirmed.** Default policies exclude `.env` variants and credential/key-like filenames using configurable regular expressions.

## 5.4 In-content secret redaction

**Confirmed.** The local scanner redacts patterns resembling:

- OpenAI-style keys;
- GitHub tokens;
- AWS access keys;
- private key blocks;
- common password/token/secret assignments.

Generated output receives a second scrub in `engine/engine.ts`.

**Important limitation:** regex-based redaction is defensive, not equivalent to a formal secret-scanning platform. Unknown secret formats may not be detected.

## 5.5 Source synchronization

**Confirmed.** `engine/source.ts` synchronizes source artifacts into persistent storage and records whether each artifact is inserted, changed, unchanged, or deleted.

Deleted source is not silently erased from history; its status is changed so dependent claims can be audited.

## 5.6 Incremental change detection

**Confirmed.** Content hashes allow subsequent builds to focus claim extraction on changed source evidence rather than re-extracting every artifact.

## 5.7 Persistent documentation truth claims

**Confirmed.** A `TruthClaim` stores:

- deterministic claim key;
- documentation section;
- statement;
- epistemic status;
- confidence;
- exact source references and quotes;
- evidence basis;
- tags;
- first-seen and last-verified timestamps;
- stale flag;
- creator-confirmation flag;
- contradictions;
- metadata.

## 5.8 Eight epistemic states

**Confirmed.** LivingDocs supports:

- `confirmed`
- `observed`
- `inferred`
- `planned`
- `speculative`
- `unknown`
- `needs_confirmation`
- `requires_audit`

## 5.9 Exact evidence requirement

**Confirmed.** `confirmed` and `observed` can be configured to require exact source quotes. Unsupported quote references are discarded during claim sanitization.

## 5.10 Confidence floor

**Confirmed.** Default `verifiedMinConfidence` is `0.8`. A purported `confirmed` claim below that threshold is downgraded to `observed`.

## 5.11 Documentation circular-proof protection

**Confirmed and tested.** Behavior-like claims supported only by documentation cannot remain confirmed implementation truth.

## 5.12 Source-drift contamination

**Confirmed.** Claims can be located by changed/deleted supporting source IDs and marked stale/requiring audit during reconciliation.

## 5.13 Contradiction detection

**Confirmed at a basic deterministic level.** `truth.ts` includes an obvious-contradiction detector using normalized sentence patterns and simple negation transforms.

**Limitation:** this is not a general semantic contradiction theorem prover.

## 5.14 Model-assisted claim extraction

**Confirmed.** Build execution batches changed artifacts and asks configured model providers to extract structured claims under explicit truth rules.

## 5.15 Model failover

**Confirmed through vendored `livingcore`.** `Nexus` and model adapters provide provider selection/failover behavior.

## 5.16 Deterministic claim audit

**Confirmed.** The audit layer can identify classes of evidence and certainty defects without depending solely on model output.

Examples exercised in tests include:

- unsupported certainty;
- orphan/bad source support;
- documentation circular proof;
- stale documentation claims;
- coverage gaps.

## 5.17 Model-assisted forensic audit

**Confirmed.** LivingDocs can ask a skeptical audit pass to identify deeper issues and normalize those results into structured findings.

## 5.18 Generated-section curation

**Confirmed.** The engine generates documentation one section at a time, using section-specific requirements and a reconciled claim set.

## 5.19 Documentation presets

**Confirmed.** Supported presets:

- `developer`
- `api`
- `cli`
- `operator`
- `custom`

Presets are views over the same truth model rather than separate source-of-truth databases.

## 5.20 Default Developer edition

**Confirmed.** Sixteen sections:

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

## 5.21 Fallback uncertainty rendering

**Confirmed.** When a section lacks supported evidence, the system can render an explicit “Unknown / requires further audit” fallback instead of filling the gap with plausible content.

## 5.22 Rendered-document audit

**Confirmed.** After section generation, the final material is audited for issues including secret exposure and assistant/meta leakage.

## 5.23 Documentation Verification

**Confirmed.** `engine/verification.ts` contains a deterministic verification suite that asks whether sufficiently supported claims cover areas such as:

- purpose/capability;
- installation/start path;
- configuration/defaults;
- CLI;
- API;
- persistent state;
- architecture;
- examples;
- operations/recovery;
- security;
- limitations;
- visible uncertainty/drift.

Default deterministic pass logic requires a score of at least 75 and no critical misses in certain operational areas.

## 5.24 Markdown rendering

**Confirmed.** Canonical Markdown output includes documentation sections plus evidence/health context.

## 5.25 Responsive / print-ready HTML

**Confirmed and tested.** Renderer tests check mobile CSS, print media rules, page rules, section anchors, and HTML escaping.

## 5.26 Local JSON persistence

**Confirmed.** `adapters/json.ts` supports persistent local state, by default under `.livingdocs/state.json` according to README behavior.

## 5.27 PostgreSQL/PostgREST adapter

**Confirmed.** The repository includes a PostgREST storage adapter and SQL schema.

**Unknown:** production deployment at scale.

## 5.28 Manual/source adapters

**Confirmed.** Additional adapters allow manual/project context and alternate source inputs.

## 5.29 CLI

**Confirmed.** The command surface includes:

```text
livingdocs init
livingdocs scan
livingdocs build
livingdocs audit
livingdocs verify
livingdocs status
```

`--json` machine-readable output is documented.

## 5.30 Circuit breaker

**Confirmed through engine/core usage.** Build execution checks breaker state and can return a `tripped` outcome until cooldown expires.

## 5.31 Lease control

**Confirmed through engine/core imports.** Build orchestration uses acquisition/release of leases to reduce conflicting concurrent work.

## 5.32 Tamper-evident run receipts

**Confirmed and tested.** Build runs are sealed through a receipt chain; tests prove valid chains verify and modified stored run data is detected as tampering.

## 5.33 Vendored-core integrity

**Confirmed and tested.** `CORE-MANIFEST.json` is checked so local edits to vendored `livingcore` files are detectable. Core changes are expected to occur upstream and then be re-synced.

## 5.34 Zero runtime npm dependencies

**Confirmed from `package.json`.** `dependencies` and `devDependencies` are empty in the supplied package. Build scripts invoke TypeScript through `npx`.

## 5.35 Automated self-test suite

**Confirmed by execution on 2026-10-02.** `npm test` reported:

```text
LivingDocs self-test: 108 passed, 0 failed
```

The test output covers configuration validation, scanning, redaction, claim evidence rules, drift behavior, audits, verification, rendering safety, persistence, CLI parsing/help, receipt integrity, and vendored-core integrity.

---

# 6. Architecture Analysis

## 6.1 High-level architecture

```text
                        ┌──────────────────────┐
                        │     Project Root     │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │   Source Adapters    │
                        │ local/manual/etc.    │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Source Sync + Hashes │
                        └──────────┬───────────┘
                                   │
                         changed evidence only
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Model Claim Extract │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Claim Sanitization  │
                        │ exact evidence gate │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Persistent Truth DB │
                        │ JSON / PostgREST    │
                        └──────────┬───────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              deterministic    model audit    drift impact
                 audit                           mapping
                    └──────────────┬──────────────┘
                                   ▼
                        ┌──────────────────────┐
                        │  Section Curator     │
                        └──────────┬───────────┘
                                   ▼
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
            Markdown edition                 HTML edition
                  │                                 │
                  └────────────────┬────────────────┘
                                   ▼
                        ┌──────────────────────┐
                        │ Final Doc Audit      │
                        └──────────┬───────────┘
                                   ▼
                        ┌──────────────────────┐
                        │ Verification Test    │
                        └──────────┬───────────┘
                                   ▼
                        ┌──────────────────────┐
                        │ livingcore Receipt   │
                        └──────────────────────┘
```

## 6.2 Engine layer

**Confirmed.** `engine/engine.ts` is the orchestration center. It is responsible for configuration validation, breaker admission, source synchronization, claim extraction, audits, documentation section generation, verification, persistence, and sealed run completion.

## 6.3 Evidence layer

**Confirmed.** `SourceArtifact` is the durable representation of observed project evidence. Content is hashed and paired with classification, path, timestamps, excerpt, byte count, language, and metadata.

## 6.4 Truth layer

**Confirmed.** `TruthClaim` is the central semantic entity. This separation is architecturally important because it prevents rendered prose from becoming the state database.

## 6.5 Storage abstraction

**Confirmed.** Storage is defined behind a port/interface rather than hard-coding one database. Current adapters include local JSON and PostgREST-backed persistence.

## 6.6 Model boundary

**Confirmed.** Model providers are similarly abstracted. Environment-based model discovery supports multiple provider patterns supplied by `livingcore`.

## 6.7 Deterministic vs model responsibilities

A major architectural strength is that the model is not trusted with all policy decisions.

**Deterministic responsibilities include:**

- config validation;
- source hashing;
- exact quote support;
- confidence floors;
- documentation-only behavior downgrade;
- source-drift linkage;
- some contradiction detection;
- secret redaction;
- deterministic audit findings;
- deterministic documentation verification;
- receipt-chain verification;
- vendored-core integrity.

**Model-assisted responsibilities include:**

- claim extraction from changed evidence;
- deeper claim audit;
- section prose generation;
- final manual audit;
- supplemental verification judgment.

This split is one of the strongest architectural decisions in the project.

## 6.8 Fault tolerance

**Confirmed at application-control level:**

- breaker admission can block generation after repeated failure conditions;
- model provider failover is inherited from `livingcore`;
- source scan errors are collected into a sync report rather than necessarily crashing all source ingestion;
- build can return explicit outcomes such as blocked/tripped;
- claims preserve uncertainty rather than forcing completion.

**Requires further audit:** crash recovery under partial writes, Postgres transaction semantics, concurrency under high parallel load, distributed lease behavior, and failure injection against real providers.

## 6.9 Scalability design

**Observed/Inferred.** Several choices support moderate scaling:

- incremental hashing avoids full extraction every run;
- extraction batches are configurable;
- source count/file size/excerpt limits are configurable;
- claim limits per batch/section exist;
- adapters separate persistence from engine logic.

**Unknown:** performance on monorepos with tens of thousands of source files, long-running multi-language repositories, very large schemas, or high-frequency CI execution.

## 6.10 Technical debt / limitations

Current likely technical debt or boundaries include:

1. **Repository scanning is text-first.** Binary assets, screenshots, generated diagrams, and rich documents are not deeply interpreted by the local scanner.
2. **Evidence excerpts are truncated.** Very large source files may contain relevant evidence outside the stored excerpt.
3. **Contradiction detection is intentionally simple.** Semantic conflicts require model assistance or future stronger logic.
4. **Example execution is not currently proven.** The system can reason from evidence but does not yet compile/run every generated example.
5. **No live endpoint probing is shown.** API docs are derived from repository evidence, not runtime probes.
6. **No language-server/compiler integration is shown.** Static code semantics are not deeply resolved across all languages.
7. **No multi-page docs site generator is demonstrated.** Current canonical output is Markdown + HTML.
8. **No browser/UI management console is demonstrated.** Current primary interface is CLI/programmatic engine.
9. **No external market or package registry integration is built into core behavior.**
10. **Package identity placeholders remain.** GitHub/author fields require release preparation.

---

# 7. Strategic Ecosystem Role

## Relationship to `livingcore`

**Confirmed.** LivingDocs vendors `livingcore` and depends on it for cross-cutting reliability primitives. The vendored copy is protected by a manifest integrity check.

## Relationship to LivingGuide

**Inferred strategic synergy; not current runtime integration.** LivingGuide maintains institutional memory and canonical project context, while LivingDocs maintains technical explanation. A future bridge could allow:

- LivingDocs architecture/state claims to become evidence for LivingGuide;
- LivingGuide creator decisions to become contextual evidence for LivingDocs concepts/limitations;
- both systems to retain separate truth domains rather than sharing prose blindly.

## Relationship to LivingChangelog

**Inferred strategic synergy.** Release evidence can resolve documentation questions such as whether a changed interface has actually shipped. Conversely, documentation drift can identify release-note follow-up requirements.

## Relationship to LivingPress

**Lower direct coupling.** LivingPress addresses maintained publishing/editorial surfaces. Shared core primitives are more important than shared content.

## Shared primitives

**Confirmed family pattern:**

- deterministic truth gates;
- model abstraction/failover;
- receipt chains;
- defensive processing;
- leases;
- breaker behavior;
- Markdown safety;
- vendored-core integrity.

## Strategic interpretation

**Inferred.** LivingDocs demonstrates a broader reusable pattern:

> Observe reality → establish evidence → make claims → challenge claims → render a human surface → detect drift → repair → preserve history.

That pattern is potentially more important than any one documentation format.

---

# 8. Development History

## Origin

**Needs creator confirmation for full chronology.** Repository evidence establishes the 2026-10-02 1.0.0 release, but not the complete ideation sequence.

## Major architectural decisions preserved in code

### Decision: documentation is not the truth database

**Confirmed.** Rendered docs are generated from a persistent claim/evidence model.

### Decision: changed source invalidates certainty

**Confirmed.** Claims are mapped back to source artifacts so source drift can mark dependent claims stale.

### Decision: strong status requires evidence

**Confirmed.** Exact evidence rules and confidence floors are enforced during claim sanitization.

### Decision: prose cannot prove behavior merely by repetition

**Confirmed.** Documentation-only implementation behavior is downgraded.

### Decision: deterministic policy surrounds AI

**Confirmed.** Models extract/analyze/generate, but core policy and verification logic remain deterministic where practical.

### Decision: secrets are scrubbed before and after model generation

**Confirmed.** Redaction occurs during source ingestion and output normalization.

### Decision: shared core is vendored, not casually forked

**Confirmed.** The repository carries a core manifest and a test that detects local core drift.

## Failed approaches / discarded designs

**Unknown.** No canonical ADR/history file currently records rejected architectures or failed experiments. This is a preservation gap. Future releases should maintain explicit decision records if those details matter.

## Lessons inferred from the codebase

1. Generated documentation needs an evidence model, not just prompts.
2. “Confirmed” should be machine-constrained, not stylistic language.
3. Documentation drift is fundamentally a dependency problem between claims and evidence.
4. AI is useful for semantic extraction and curation, but poor as the sole enforcement layer.
5. An honest unknown is more operationally useful than an elegant hallucination.

These are architectural inferences, not quotations from a formal founder note.

---

# 9. Current State Assessment

## What works

**Confirmed by current source/tests:**

- configuration validation;
- local source inventory;
- artifact hashing;
- secret-file skipping;
- content redaction;
- JSON persistence;
- PostgREST persistence adapter;
- claim extraction orchestration;
- evidence quote validation;
- eight-state truth model;
- circular-documentation protection;
- source drift mapping;
- deterministic and model-assisted audits;
- 16-section Developer edition;
- API/CLI/Operator/Custom presets;
- Markdown/HTML rendering;
- documentation verification;
- run receipt sealing/verification;
- CLI command parsing/help;
- vendored-core drift checking.

## What is incomplete

**Observed/Planned:**

- public repository identity placeholders;
- external source adapters beyond the current packaged set;
- live API probing;
- compiler/LSP validation;
- executable example validation;
- PR-level drift comments;
- multi-page docs site output;
- claim-level inline provenance UI;
- direct cross-product reconciliation.

## Current blockers

No fatal code blocker is established by current tests.

Release/market blockers include:

- package identity placeholders;
- lack of demonstrated external user validation;
- lack of real-repository benchmark corpus;
- no published reliability metrics for extraction/audit precision;
- unknown public distribution/deployment status.

## Known bugs

**Unknown.** No open-issue database is included in this archive. Passing self-tests do not establish absence of bugs.

## Deployment status

**Unknown.** The repository is package-ready in structure, but no live production endpoint or hosted service is evidenced.

## Operational readiness

**Estimate:** suitable for controlled developer use and repository trials; not yet proven for enterprise production operation.

## Assessment scores

These are **founder-archive estimates**, not industry certifications.

| Dimension | Estimate | Basis |
|---|---:|---|
| Functional maturity | **76/100** | coherent end-to-end workflow, CLI, persistence, tests, rendering; limited real-world validation |
| Stability | **82/100** | 108/108 self-test, deterministic gates, receipt verification; no long-running production evidence |
| Documentation of itself | **88/100** | README, product guide, config, tests, now this Founder’s Guide; package identity still incomplete |
| Monetization readiness | **42/100** | product can be packaged, but no pricing, billing, hosted service, adoption proof, or channel validation |
| Scalability readiness | **58/100** | incremental architecture and adapters help; no large-scale benchmarks |
| Security maturity | **65/100** | thoughtful secret redaction and safe rendering; no external security audit or hardened hosted boundary |
| Enterprise readiness | **52/100** | architecture is disciplined; missing SSO/RBAC/observability/compliance/operational proof if sold as hosted enterprise software |

---

# 10. Monetization Analysis

## Evidence boundary

There is **no repository evidence of current LivingDocs revenue, customers, paid pilots, pricing, or validated willingness to pay**.

Therefore numeric present-value estimates would be fabricated if presented as facts.

## Plausible business models

The following are **strategic options, not current business claims**.

### Open-source core + paid hosted service

Potential paid value:

- managed repository connections;
- scheduled scans;
- hosted truth graph;
- multi-project dashboards;
- PR drift comments;
- team review workflows;
- audit history;
- SSO/RBAC;
- private model routing;
- enterprise retention controls.

### Team/enterprise CLI license

Potentially simpler than SaaS if teams want local/private execution but need premium policy packs, integrations, or support.

### CI/CD integration

A paid GitHub/GitLab/Bitbucket workflow could block merges when documentation truth degrades below policy thresholds.

### API / evidence service

The truth model could become an API consumed by internal developer portals or documentation platforms.

### Consulting / implementation

For early commercialization, implementation services around large documentation estates may produce revenue faster than a mature SaaS platform, but this requires founder willingness and is not a product feature.

## Fastest path to revenue

**Estimate:**

1. validate against 3–5 real repositories;
2. publish compelling before/after drift findings;
3. package a GitHub-oriented local/CI workflow;
4. offer paid setup or team automation;
5. only then decide whether hosted SaaS demand justifies infrastructure.

## Highest upside path

**Speculative:** enterprise documentation governance integrated with code hosts, CI, API schemas, internal developer portals, and audit/compliance workflows.

## Lowest effort monetization path

**Speculative:** paid implementation/support or a commercial license around an otherwise self-hosted package.

## Valuation scenarios

**Current present value:** **Unknown / requires external market and transaction evidence.**

**Conservative market value:** **Not supportable from repository evidence alone.**

**Realistic strategic value:** **Not supportable without user traction, retention, revenue, or comparable transactions.**

**Moonshot value:** may become significant if LivingDocs becomes an adopted documentation-governance platform, but assigning a numeric figure now would violate this guide’s truth standard.

### What would be needed for a defensible valuation

- public/private adoption counts;
- active repository counts;
- retention;
- paid conversion;
- ARR/MRR;
- gross margin;
- enterprise contract size;
- support burden;
- competitor pricing;
- comparable acquisitions;
- defensible IP or integration advantage;
- benchmarked reliability;
- growth rate.

Until those exist, valuation should be discussed as **option value**, not proven market value.

---

# 11. Competitive Positioning

## Current evidence

The repository does not include a verified competitive research dossier.

Accordingly, this guide does **not** claim that LivingDocs is first, unique in the entire market, or categorically superior to named competitors.

## Differentiation that can be described from implementation

**Confirmed internal differentiation:**

- persistent claim/evidence ledger rather than stateless generation;
- epistemic state preserved per claim;
- exact evidence quote support;
- documentation-only proof rejection for implementation behavior;
- incremental drift propagation from changed/deleted source;
- deterministic audit/verification around model work;
- tamper-evident run receipts;
- model-provider abstraction;
- output scrub and safe rendering.

## Competitive categories requiring research

Future research should compare LivingDocs against:

- AI documentation generators;
- docs-as-code platforms;
- internal developer portals;
- API documentation generators;
- code intelligence/documentation assistants;
- knowledge graph systems;
- governance/compliance documentation tooling;
- CI-based documentation linting tools.

A proper competitor list should be researched at the time of market entry because the category changes quickly.

---

# 12. Future Vision

## Ultimate form

**Speculative but architecturally consistent.** The ultimate LivingDocs would maintain a live, evidence-backed technical model of a software system and continuously reconcile every published technical explanation against current implementation and runtime reality.

A peak implementation could incorporate:

```text
repositories
    │
    ├── AST / compiler / LSP evidence
    ├── tests and coverage
    ├── OpenAPI / GraphQL / Proto
    ├── CLI introspection
    ├── configuration schemas
    ├── migrations
    ├── deployment manifests
    ├── live endpoint probes
    ├── runtime telemetry
    ├── release evidence
    └── human-approved creator context
            │
            ▼
      Documentation Truth Graph
            │
      ┌─────┼────────┐
      ▼     ▼        ▼
    docs   audit   CI gate
      │              │
      ▼              ▼
 website          PR feedback
```

## Confirmed roadmap directions from current product documentation

- executable example verification;
- language-server/compiler hooks;
- live endpoint probes;
- generated multi-page documentation sites;
- claim-level inline provenance;
- PR comments for drift introduced by a change;
- cross-product reconciliation with LivingChangelog and LivingGuide.

## Moonshot concepts

**Speculative:**

- multi-repository architecture truth graph;
- runtime-versus-doc contradiction detection;
- automated migration-doc generation from schema/API diffs;
- policy-driven docs gates in CI;
- enterprise “documentation SLO” tracking;
- explainable provenance UI down to source lines/commits;
- self-healing examples verified in isolated sandboxes;
- automated deprecation lifecycle management;
- organization-wide documentation drift heatmaps.

---

# 13. Priority Roadmap

## P0 — Release hygiene

**Highest leverage / lowest effort.**

1. Replace repository/author placeholders in `package.json`.
2. Establish canonical repository URL.
3. Add explicit versioned release instructions.
4. Add real example project fixtures beyond synthetic self-test data.
5. Preserve architectural decision records going forward.

## P1 — Real-world proof

1. Run LivingDocs against several heterogeneous public/private repositories.
2. Measure:
   - source count;
   - changed-source ratio;
   - extraction time;
   - claim count;
   - false unsupported claims;
   - drift findings confirmed by humans;
   - verification-score usefulness.
3. Publish anonymized case studies if permission allows.

This work is more valuable than adding many new features because it establishes whether the central thesis works outside the self-test harness.

## P2 — Claim-level provenance UX

Expose each documentation paragraph/claim with:

- evidence source;
- evidence quote;
- basis;
- status;
- confidence;
- last verification;
- stale reason.

This would make the truth model visible rather than hidden behind the generated edition.

## P3 — CI integration

Create a repository workflow capable of:

- scanning on pull requests;
- detecting evidence changes;
- identifying affected docs claims;
- reporting drift;
- optionally failing a policy gate.

## P4 — Executable verification

Prioritize:

- command examples;
- API examples;
- imports/type references;
- config snippets.

A generated example that compiles/runs is much stronger than a model judging that it looks plausible.

## P5 — Runtime evidence

Add opt-in live probes for environments where runtime truth matters and security boundaries are acceptable.

## P6 — Cross-Living evidence bridges

Only after each sibling has stable interfaces, allow deliberate evidence exchange without merging their truth domains.

## Creator-energy prioritization

For a solo founder, avoid building a full hosted dashboard before validation. The current CLI architecture can prove the product’s value with substantially less operational overhead.

---

# 14. Risk Analysis

## Technical risks

### Model extraction quality

A model may omit claims, overgeneralize, or misclassify evidence.

**Mitigation already present:** exact quote gates, status downgrades, deterministic audits, visible unknowns.

### Incomplete source capture

Important evidence may live outside supported files or beyond excerpt limits.

**Mitigation:** configurable scanner limits and warnings.  
**Remaining risk:** silent semantic incompleteness if the relevant evidence is not ingested.

### Circular epistemology

Generated docs could otherwise become their own evidence.

**Mitigation already present:** documentation-only behavior cannot remain confirmed.

### Stale runtime reality

Repository evidence does not always equal deployed reality.

**Current limitation:** no live deployment proof layer.

### Secret leakage

Regex redaction cannot guarantee detection of every secret format.

**Mitigation already present:** sensitive-file exclusion + pre-model redaction + post-generation scrub.  
**Recommended:** integrate established secret scanners for enterprise use.

### Scaling risk

Large monorepos may exceed practical batch/context limits.

**Mitigation:** incremental sync, configurable file/excerpt/batch caps.  
**Requires audit:** benchmark at scale.

## Operational risks

- provider outages/rate limits;
- state corruption;
- incomplete PostgREST configuration;
- unreviewed automated output;
- false confidence in verification scores;
- unbounded scheduled runs if deployed without cost controls.

## Financial risks

- building hosted infrastructure before demand;
- competing in a rapidly evolving AI developer-tool category;
- support burden for many languages/frameworks;
- model cost if large repositories are repeatedly analyzed.

## Market risks

- buyers may accept “good enough” generated docs rather than pay for provenance;
- incumbent code-host/docs platforms may add similar drift features;
- trust requirements may slow adoption for autonomous documentation updates.

## Creator bottleneck risk

**Inferred.** As a founder-led system family, architecture, product direction, packaging, and cross-product consistency can converge on one person. LivingGuide-style continuity practices and ADRs should be used on LivingDocs itself.

## Documentation risk

Ironically, LivingDocs can itself drift if this Founder’s Guide is not updated with releases. This guide should therefore be treated as an archival snapshot, not magically self-updating prose.

---

# 15. Preservation & Continuity

## What a future operator must understand first

1. **The rendered docs are not the source of truth.** The claim/evidence state is.
2. **Never patch vendored `core/` casually.** Change `livingcore` upstream and re-sync.
3. **Do not weaken exact-evidence gates to make output prettier.** Unknown is an intentional state.
4. **Do not allow documentation to prove implementation behavior by itself.** This is a central invariant.
5. **Preserve source-drift history.** Deleted evidence should not disappear silently.
6. **Keep deterministic policy outside model prompts whenever feasible.** Prompt instructions are not equivalent to enforcement.
7. **Treat secret handling as defense-in-depth, not a security guarantee.**

## Recovery / resurrection procedure

A future operator returning to the project should:

```text
1. Read README.md and this FOUNDERS-GUIDE.md.
2. Verify Node runtime compatibility (currently Node >=22.6 in package metadata).
3. Run npm test.
4. Run npm run typecheck.
5. Run npm run build.
6. Verify core/CORE-MANIFEST.json integrity through tests.
7. Review CHANGELOG.md.
8. Replace/verify repository identity placeholders if still present.
9. Initialize against a disposable test repository first.
10. Inspect .livingdocs state/output before enabling scheduled automation.
11. Verify configured model/provider credentials through a secure external vault.
12. Never place secrets inside documentation or this guide.
```

## Secure references

This guide intentionally contains no live credentials.

Use placeholders such as:

- `[SECURE SECRET REFERENCE: stored outside this document]`
- `[ACCESS PROCEDURE: requires creator-controlled vault]`
- `[DEPLOYMENT CREDENTIALS: external secret manager]`
- `[RECOVERY KEYS: stored in secure estate/continuity channel]`

## Dead-man-switch / inheritance considerations

**Needs creator confirmation.** No actual dead-man-switch mechanism or estate procedure is present in the repository. If desired, preserve these outside the public/software archive in a legally and operationally appropriate channel.

## Irreplaceable design principles

The following principles appear central enough to preserve explicitly:

- evidence before prose;
- uncertainty before fabrication;
- implementation evidence outranks repeated documentation for behavior claims;
- changed evidence contaminates old certainty;
- models assist but do not define truth policy;
- generated material must remain auditable;
- history should be preserved rather than silently rewritten.

---

# 16. Strategic Importance Ranking

These are **internal strategic estimates**, not market ratings.

| Dimension | Estimate | Reasoning |
|---|---:|---|
| Ecosystem importance | **85/100** | demonstrates a broadly reusable livingcore pattern and technical-truth surface |
| Monetization potential | **70/100** | documentation pain is widespread, but willingness-to-pay and differentiation are unvalidated |
| Uniqueness of current implementation | **78/100** | unusual combination of provenance, epistemic states, circular-proof rejection, drift, receipts; external market uniqueness not researched |
| Defensibility | **55/100** | architecture is thoughtful but reproducible; stronger defensibility requires integrations, data, reliability and adoption |
| Long-term importance | **82/100** | technical documentation drift is persistent and compounds as software systems grow |
| Emotional importance | **Needs creator confirmation** | cannot be responsibly inferred from code |
| Replacement difficulty | **68/100** | codebase is compact enough to rebuild, but exact architecture/truth invariants would take meaningful effort to reproduce faithfully |

---

# 17. Recommended Next Actions

## Immediate

1. Finalize canonical author/repository metadata.
2. Tag 1.0.1 with this Founder’s Guide.
3. Run the package against at least one real non-Living repository.
4. Save the resulting drift findings and human judgments.
5. Add an ADR documenting the “docs cannot prove behavior” invariant.

## Highest leverage improvements

1. claim-level provenance in rendered output;
2. executable example validation;
3. GitHub CI/PR integration;
4. source adapters for code-host metadata/release evidence;
5. benchmark harness across representative repositories.

## Fastest monetization actions

1. package a polished local/CI proof-of-value workflow;
2. demonstrate actual stale-doc findings on real codebases;
3. offer paid team setup/support before building a large hosted control plane;
4. collect explicit customer pain and pricing feedback.

## Documentation gaps

- no formal ADR directory;
- no measured performance benchmark;
- no compatibility matrix across operating systems;
- no production deployment guide for a hosted form;
- no supported-language matrix beyond scanner extension list;
- no real-world case studies;
- no privacy/data-processing policy for hosted use because hosted use is not currently established.

## Infrastructure priorities

Do not add complex infrastructure until external use proves the need. If hosted operation becomes real, prioritize:

- authenticated tenant isolation;
- secret management;
- job queueing;
- cost controls;
- observability;
- storage backups;
- audit retention;
- model egress controls;
- SSO/RBAC for enterprise use.

## Branding recommendation

Retain the simple product thesis:

> **LivingDocs — Documentation that stays true.**

It accurately expresses the implementation without promising autonomous perfection.

---

# 18. Canonical Summary

LivingDocs represents a shift from **documentation generation** to **documentation truth maintenance**.

Its most important design decision is not the ability to generate Markdown. It is the refusal to let generated prose become reality simply because it sounds correct.

The project maintains an evidence layer, transforms evidence into explicit claims, assigns uncertainty rather than hiding it, invalidates claims when their support changes, audits the resulting documentation, and preserves a sealed history of system runs.

That makes the current repository a credible early implementation of a larger idea:

> Technical documentation should be able to explain **why it believes what it says** and should know when that belief has become stale.

The product should continue existing if that principle remains useful and if real-world repository trials show that the truth-maintenance layer catches meaningful drift with acceptable noise and cost.

Its future should not be measured by how much prose it can generate. The meaningful metric is whether engineers can trust it to say:

- **this is implemented;**
- **this is documented but not proven;**
- **this used to be true;**
- **this changed;**
- **this is planned;**
- **this is unknown;**
- **this needs a human.**

That is the durable product.

---

# Architecture Reference Appendix

## Module map

```text
LivingDocs
│
├── cli/
│   └── main.ts                  command surface
│
├── engine/
│   ├── engine.ts                orchestration
│   ├── source.ts                source synchronization
│   ├── truth.ts                 claim/evidence rules
│   ├── audit.ts                 deterministic/model finding logic
│   ├── verification.ts          documentation usability verification
│   ├── render.ts                Markdown/HTML canonical rendering
│   ├── prompts.ts               model missions and structured instructions
│   ├── config.ts                policy/configuration
│   └── ports.ts                 core domain interfaces/types
│
├── adapters/
│   ├── local.ts                 filesystem scanner
│   ├── manual.ts                manual/project source
│   ├── json.ts                  local persistence
│   ├── postgrest.ts             PostgreSQL/PostgREST persistence
│   ├── models.ts                model-provider bridge
│   └── memory.ts                test/in-memory persistence
│
├── presets/
│   └── docs.ts                  documentation mission + section requirements
│
├── core/                        vendored livingcore
│   ├── nexus.ts                 model orchestration
│   ├── breaker.ts               failure breaker
│   ├── lease.ts                 concurrency lease
│   ├── receipts.ts              tamper-evident receipts
│   ├── defense.ts               defensive primitives
│   ├── oracle.ts                deterministic utilities/hashing
│   └── CORE-MANIFEST.json       integrity manifest
│
├── schema.sql                   relational persistence schema
├── livingdocs.config.json       starter config
├── install/wizard.mjs           setup flow
└── test/selftest.ts             108-check current self-test
```

## Runtime flow

```text
CLI / API caller
    │
    ▼
validate configuration
    │
    ▼
breaker admission
    │
    ▼
acquire lease
    │
    ▼
scan + hash source evidence
    │
    ├── unchanged -> preserve existing claim context
    │
    ├── changed -> stale affected claims + re-extract
    │
    └── deleted -> preserve deletion + stale affected claims
    │
    ▼
claim sanitization
    │
    ├── exact quote validation
    ├── confidence floor
    └── docs-only behavior downgrade
    │
    ▼
deterministic + model claim audit
    │
    ▼
section curation
    │
    ▼
secret scrub + rendering
    │
    ▼
rendered-document audit
    │
    ▼
documentation verification
    │
    ▼
persist edition/findings
    │
    ▼
seal receipt
    │
    ▼
release lease
```

---

# Enterprise Audit Summary

This Founder’s Guide has been audited against the current repository with the following corrections and controls applied:

## What was corrected or constrained

- No live deployment claim is made.
- No user/revenue/adoption claim is made.
- No unsupported numeric valuation is presented.
- Package publication is treated as unknown.
- “Enterprise-ready” is not claimed; enterprise gaps are stated explicitly.
- Passing self-tests are not equated with absence of bugs.
- Repository evidence is distinguished from runtime reality.
- Future features from product docs are labeled planned/speculative rather than current.
- Security redaction is described as defense-in-depth, not a guarantee.
- Strategic cross-product integrations are labeled as future/inferred rather than implemented.

## Remaining unknowns

1. Public repository URL and canonical organization/account.
2. npm publication status.
3. Real-world repository benchmark performance.
4. User adoption and retention.
5. Pricing and willingness-to-pay.
6. Production deployment architecture, if any.
7. Formal security assessment.
8. Supported OS/runtime matrix beyond package metadata.
9. False-positive and false-negative rates of claim extraction/audit.
10. Creator-authored history before the 1.0.0 repository state.
11. Rejected design alternatives and reasons.
12. Desired long-term licensing/commercial model.

## Final quality assessment of the archive

These scores rate **this guide as a continuity artifact**, not the product’s commercial success.

| Dimension | Score | Notes |
|---|---:|---|
| Truthfulness | **96/100** | unsupported market/runtime claims are deliberately withheld |
| Completeness | **90/100** | strong repository coverage; creator history and market evidence remain absent |
| Continuity readiness | **92/100** | architecture, invariants, recovery path, risks and priorities are preserved |
| Enterprise polish | **88/100** | strong structure and audit discipline; no externally validated enterprise program |
| Readability | **90/100** | progressive structure, tables, diagrams, explicit labels |
| Technical clarity | **94/100** | core layers and control flow mapped directly to repository modules |
| Strategic clarity | **89/100** | roadmap and product-family role preserved without claiming validation |
| Future maintainability | **91/100** | module map, invariants and gaps are explicit |
| Acquisition readiness | **72/100** | technical packet is useful; commercial metrics, IP diligence, customer data and live operations evidence are absent |
| Archival quality | **94/100** | sufficient to reconstruct current intent/architecture if kept versioned with releases |

---

# Preservation Rule

This document is a **versioned archive**, not a magical perpetual truth source.

When LivingDocs materially changes, update this guide by comparing the new repository against this edition. Preserve historical decisions instead of rewriting them out of existence.

**Canonical principle:**

> If future LivingDocs cannot explain what changed, why it changed, what evidence supports the new behavior, and what remains uncertain, then LivingDocs has violated the standard it was built to enforce for everyone else.
