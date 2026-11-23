# LivingGuide — Founder's Guide

**Canonical status:** v1.0.2 package archive  
**Truth posture:** evidence-first; estimates and unknowns are labeled  
**Creator:** Kenneth E. Sweet Jr. (Solo Founder / Infrastructure Architect)  
**Product thesis:** **Your project remembers itself.**

This guide follows the same 18-section Founder Archive that LivingGuide's own `founder` preset produces, so the product is documented by its own standard. It does not claim users, revenue, deployments or market validation, because nothing in this package proves them.

## Status legend

- **Confirmed:** present in source, configuration or package metadata, or proven by the shipped self-test.
- **Observed:** present in the repository but not proven to be deployed anywhere.
- **Inferred:** a reasonable reading of the architecture, not implementation proof.
- **Planned / Speculative:** stated direction, not shipped behavior.
- **Unknown:** the package does not establish the answer.

---

# 1. Executive Summary

Projects forget themselves long before their source code disappears. The missing pieces are usually intent, decision rationale, current-state truth, abandoned approaches, ecosystem relationships, roadmap context and the difference between what was planned and what actually existed.

LivingGuide exists to keep that institutional memory alive without pretending uncertainty is knowledge.

**Confirmed:** LivingGuide 1.0.2 scans a project, extracts source-backed claims into a persistent claim/evidence graph, audits that graph with deterministic rules and an adversarial model pass, renders an Owner's Manual from whatever survives, and runs a Resurrection Test that asks whether a future operator could safely pick the project back up. The self-test reports 104 passed, 0 failed with no keys and no network.

**Current maturity:** functional engine with local and PostgreSQL storage, a CLI and a passing suite. **Unknown:** npm publication, production use, outside adopters.

# 2. Canonical Identity

- **Official name:** LivingGuide
- **Package name:** `livingguide`
- **CLI:** `livingguide`, also reachable as `living guide` inside Living Master Library
- **Version:** 1.0.2 (1.0.0 released 2026-10-01)
- **Tagline:** Your project remembers itself.
- **License:** MIT
- **Shared substrate:** vendored `livingcore` 1.0.0

**Confirmed:** `package.json` names the author as Kenneth E. Sweet Jr. (kesjr.com) and points to the single family repository, `SweetKenneth/living`, under `modules/livingguide`. **Unknown:** whether that repository is public yet.

# 3. Project Classification

**Confirmed:** a zero-runtime-dependency TypeScript engine (about 1,700 lines across `engine/`, `adapters/`, `cli/` and `presets/`) with a local CLI, a programmatic API and two storage backends.

**Inferred:** the category is closer to an archival system than a documentation tool. A README generator answers "what does this do"; LivingGuide is built to answer "what is true about this project, how do we know, and what would be lost if the creator vanished."

# 4. Core Concept

## Why the manual is not the source of truth

A static manual rots. Regenerating a static manual from scratch creates a different problem: the model can rewrite history each time.

LivingGuide therefore stores a claim/evidence graph first. The rendered Owner's Manual is a versioned view over that graph. Every strong claim must carry provenance. Changed source contaminates old certainty. Unknowns remain visible.

## Product roles

**ARCHIVIST** discovers and normalizes durable claims from project evidence.

**AUDITOR** tries to falsify certainty, find contradictions, expose continuity gaps and prevent valuation/roadmap/technical-maturity hype from becoming canonical truth.

**CURATOR** turns the surviving truth model into the appropriate human-facing dossier.

The roles share evidence but not incentives.

# 5. Full Feature Inventory

## 5.1 Truth statuses: Confirmed

Every claim carries one of eight statuses: `confirmed`, `observed`, `inferred`, `planned`, `speculative`, `unknown`, `needs_confirmation`, `requires_audit`, plus a confidence, evidence references, exact quotes, first-seen and last-verified timestamps, a stale flag and contradictions.

## 5.2 Exact-quote evidence gate: Confirmed

A claim marked `confirmed` or `observed` must quote text that actually exists in an active source artifact (whitespace and case normalized). If no quote survives, the claim drops to `needs_confirmation` and its confidence is capped at 0.49. A `confirmed` claim below the confidence floor (0.8 by default) drops to `observed`. The model cannot waive this; the rule runs in code after the model answers.

## 5.3 Source drift contamination: Confirmed

When a source file changes or disappears, every claim citing it is marked stale and downgraded to `requires_audit` until it is re-established. Old certainty never quietly survives new evidence.

## 5.4 Deterministic audit: Confirmed

Before any model is consulted, the claim ledger is checked for unsupported certainty, confidence below the floor, stale claims, orphaned or deleted sources, quotes that no longer exist in the source, obvious yes/no contradictions and sections with no supporting claims. The rendered manual is then checked for assistant/meta phrasing, anything shaped like a credential, overconfident language and the absence of any visible uncertainty.

## 5.5 The Resurrection Test: Confirmed

The defining quality gate asks a deliberately uncomfortable question: if the creator vanished and a capable operator returned years later with only the project and this archive, could they safely continue?

LivingGuide tests for purpose, build/run procedures, deployment state, state/data location, subsystem relationships, unfinished work, architecture rationale, protected invariants, next work, stale assumptions, secure-access recovery and safe resumption guidance.

A missing answer is preserved as a continuity defect. That defect is more valuable than an invented answer.

**Confirmed mechanics:** the deterministic pass scores those twelve areas against claims that are neither stale nor unknown. It passes at 75 or above, and only if none of four critical areas is missing: build/run, data/state location, major subsystems, and secure access recovery. A model pass can add notes and defects on top.

## 5.6 Presets as lenses: Confirmed

`founder` (the full 18-section archive), `engineering`, `operator`, `acquisition` and `custom` all render from the same truth model. Presets do not create competing truths.

## 5.7 Security handling: Confirmed

`.env`, key, credential and token-named files are skipped by the scanner. Likely secrets inside readable files are redacted before they reach persistent state or a model. Generated output is scrubbed again. The PostgreSQL schema creates no anonymous read policy.

## 5.8 Storage, receipts and outputs: Confirmed

Atomic local JSON state or PostgreSQL via PostgREST. Run receipts are hash-chained through `livingcore`, so edited, deleted or forked run history is detectable. Each build writes `OWNER-MANUAL.md`, a print-ready `owner-manual.html`, `GUIDE-AUDIT.md` and `RESURRECTION-TEST.md`. Old editions stay in state.

## 5.9 What runs without a model: Confirmed

`scan`, `status`, the deterministic audit and the deterministic Resurrection Test need no AI provider. `build` deliberately refuses to fabricate a manual without one.

# 6. Architecture Analysis

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

## Strengths

- The truth rules live in code, not in prompts. A model can propose; it cannot promote.
- Incremental builds re-extract only changed sources, and contamination makes the cost of change visible.
- The engine is honest about its own floor: it would rather print `Unknown` than fill a gap.

## Weaknesses / technical debt

- **Observed:** the deterministic Resurrection Test is lexical. It checks whether usable claims contain words associated with each area (for example "run", "install", "npm" for build/run). A project can satisfy it with vocabulary rather than substance; the model pass is what catches that. The number should be read as a coverage signal, not proof of resumability.
- **Observed:** evidence is limited to each file's excerpt (24,000 characters by default). Facts that only appear later in a large file cannot be quoted, so they cannot become Confirmed. Truncation is recorded in artifact metadata but not yet surfaced in the manual.
- **Observed:** the deterministic contradiction detector only catches exact negations ("X is Y" against "X is not Y"). Semantic conflicts depend on the AUDITOR model.

# 7. Strategic Ecosystem Role

LivingGuide is designed as a sibling built on `livingcore`. It can coexist with other living systems without coupling their databases or prose. A release-history system can become evidence; a technical documentation system can become evidence; the canonical guide remains responsible for institutional/project truth.

**Confirmed:** inside Living Master Library it is the module that owns durable project knowledge, and its 18-section Founder Archive is the format the Library's own Founder's Guide follows.

**Inferred:** it is the most general member of the family. LivingDocs, LivingChangelog and LivingRoadmap each guard one truth surface; LivingGuide is where their outputs could be consumed as evidence about the whole project.

# 8. Development History

- **2026-10-01, 1.0.0:** initial release with the truth model, quote gate, contamination, presets, the three-role build, Resurrection Test, HTML renderer, scanner, redaction, JSON and PostgreSQL storage, receipts and CLI.
- **1.0.1:** this Founder's Guide, expanded from a short thesis into the full archive format. No engine behavior changed.
- **1.0.2:** first self-run. Pointed at Living Master Library, the scanner walked the Library's `.living/` directory, so a previous edition, its own state file or the project config could become evidence for the next build. The scanner now skips `.living/` as well as `.livingguide/`. Author identity filled in package metadata.

**Unknown:** ideation history before 1.0.0 is not recorded in the repository.

# 9. Current State Assessment

**What works, Confirmed:** every feature in section 5, exercised by 104 passing self-tests covering quote enforcement, uncertainty downgrades, source drift, secret handling, incremental sync, the full multi-phase build, audit and resurrection flow, HTML safety, persistent state, receipt tamper detection and vendored-core integrity.

**Incomplete or unknown:** registry publication, production deployments, real-world accuracy on large repositories, and how the deterministic Resurrection score correlates with an actual handoff.

**Estimated maturity, Inferred:** beta-quality engine. The core rules are tested; the product has not yet been proven on outside projects.

# 10. Monetization Analysis

**Inferred:** the clearest buyers are people who carry continuity risk: solo founders, agencies handing projects to clients, and anyone preparing a project for sale, transfer or long dormancy. The `acquisition` preset already points at due diligence.

**Speculative:** a hosted continuity archive with signed, exportable editions could be priced per project. No pricing, customers or revenue exist today.

# 11. Competitive Positioning

**Inferred:** README and wiki generators produce prose; LivingGuide produces a claim ledger with provenance, and treats the prose as disposable. Its distinct claim is that it refuses to upgrade certainty and records what it cannot answer. No comparative benchmark has been run.

# 12. Future Vision

v1 is intentionally strongest on textual project evidence: repositories, configuration, schemas, docs and supplied creator/research notes. Images/screenshots should be converted to explicit textual observations before ingestion. External competitive research is not silently performed or treated as source truth by the local engine.

That boundary keeps the first version auditable.

The natural extensions are richer source adapters, claim-history visualization, decision records, diagram synthesis from the truth graph, signed/exportable continuity packages, and selective reconciliation with live infrastructure. Those are directions, not claims about current implementation.

# 13. Priority Roadmap

**Planned / Speculative:**

1. Publish the `SweetKenneth/living` repository and decide on registry publication.
2. Surface truncated sources in the manual so missing evidence is visible, not silent.
3. Make the Resurrection Test require cited claims per area instead of keywords alone.
4. Accept LivingDocs, LivingChangelog and LivingRoadmap outputs as first-class evidence sources.

# 14. Risk Analysis

- **Technical:** lexical resurrection scoring can overstate readiness; excerpt limits can understate it.
- **Product:** a strict gate produces manuals full of `Unknown` on thin repositories, which is correct but can read as failure to a first-time user.
- **Security:** the tool handles owner-level material. Redaction is pattern-based, so a secret in an unusual format could reach state. The README already says not to treat LivingGuide as a secret manager.

# 15. Preservation & Continuity

To resume this product: run `npm test` (expect 104 passed, 0 failed), then `livingguide scan` and `livingguide status` on any project; neither needs keys. A model key is only needed for `build`. Engine rules live in `engine/truth.ts`, `engine/audit.ts` and `engine/resurrection.ts`. Do not edit the vendored `core/` files; change `livingcore` and re-sync, and Living Master Library's doctor will flag any divergence.

# 16. Strategic Importance Ranking

**Inferred:** high within the family. It is the module whose output the others feed, and the one whose format the family already uses for its own memory.

# 17. Recommended Next Actions

1. Finish the self-run on Living Master Library with a model key (scan already ran; it found the `.living/` bug fixed in 1.0.2) and compare the generated manual to this guide.
2. Ship the truncation notice and the cited-claims resurrection rule before wider release.
3. Add one real outside project as a public example edition.

# 18. Canonical Summary

LivingGuide keeps a project's memory as claims with evidence, not as prose. It downgrades anything it cannot quote, contaminates anything whose source changed, and records gaps as defects instead of filling them. Version 1.0.1 is a tested engine with known limits in how it scores resumability and how much of each file it can see. Everything beyond that, including adoption and value, is still unknown.
