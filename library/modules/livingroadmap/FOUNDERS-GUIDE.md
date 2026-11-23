# LivingRoadmap — Founder’s Guide

**Canonical product archive · Version 1.0.0**

LivingRoadmap exists to preserve the relationship between **what a project intends to become** and **what the project is actually becoming**.

Its product thesis is:

> **Plans that know when reality changed.**

## 1. Executive Summary

LivingRoadmap is an evidence-aware planning and continuity engine. Traditional roadmaps are manually updated declarations. They commonly drift from implementation: planned items are quietly implemented, abandoned, superseded, or forgotten; unplanned work absorbs engineering energy; and “done” often means different things to different people.

LivingRoadmap stores roadmap intent as persistent structured state, scans local project evidence, reconciles observed implementation and shipping signals against roadmap items, and produces explicit drift findings. It preserves decision history rather than rewriting the record.

**Confirmed from this repository:** persistent roadmap state; evidence scanning; candidate reconciliation; explicit shipping confirmation; stale/blocked/dependency/duplicate/unplanned-work audits; Markdown/HTML outputs; receipt-chain integrity; 68 local self-tests.

**Unknown from this repository:** external users, revenue, market adoption, public npm publication, production-scale deployment, and acquisition value.

## 2. Canonical Identity

- Official name: **LivingRoadmap**
- Product family: **Living Master Library (LML)**
- Shared kernel: **livingcore**
- Version: **1.0.0**
- Tagline: **Plans that know when reality changed.**
- Primary CLI: `livingroadmap`; under LML: `living roadmap`

## 3. Project Classification

Confirmed classifications: developer tool, roadmap intelligence, project continuity, evidence/provenance system, local-first CLI, planning audit system.

It is not designed as a generic issue tracker, sprint board, or replacement for every PM workflow. Its bounded truth surface is roadmap-vs-reality reconciliation.

## 4. Core Concept

The core loop is:

```text
DECLARE INTENT
     ↓
SCAN REALITY
     ↓
MATCH EVIDENCE
     ↓
SURFACE CANDIDATES
     ↓
HUMAN CONFIRMATION WHERE REQUIRED
     ↓
PRESERVE DECISION HISTORY
     ↓
AUDIT ROADMAP DRIFT
```

The key distinction is between **candidate evidence** and **authoritative state**. Source code can show that work exists. Tests can show that behavior is exercised. Release/deployment artifacts can strengthen a shipping claim. But fuzzy local evidence is not allowed to silently convert a plan into “Shipped.”

## 5. Full Feature Inventory

Confirmed features:

- structured roadmap items with intent and rationale;
- lifecycle states: planned, active, blocked, shipped, abandoned, superseded, needs confirmation;
- priority, expected value, effort, creator energy, revenue proximity, dependency risk;
- dependencies and blocking relationships;
- target windows and tags;
- local evidence scanning;
- optional Git commit-subject ingestion;
- sensitive-file exclusion and secret redaction;
- implementation candidate detection;
- ship candidate detection;
- explicit human status confirmation;
- stale-intent detection;
- blocked-work reporting;
- missing-dependency detection;
- duplicate-intent detection;
- unplanned-work signals;
- roadmap drift score;
- decision history;
- supersession and shipped-as metadata;
- Markdown roadmap output;
- responsive/printable HTML roadmap output;
- audit and drift reports;
- persistent local JSON storage;
- livingcore tamper-evident run receipts.

## 6. Architecture Analysis

```text
project repository
      │
      ├── source/tests/config/schema/docs
      ├── release/deployment artifacts
      └── local git subjects (optional)
                 │
                 ▼
          Evidence Scanner
                 │
                 ▼
       Persistent Evidence State
                 │
roadmap items ───┼──► Reconciliation Engine
                 │          │
                 │          ├─ implementation candidate
                 │          ├─ ship candidate
                 │          └─ needs confirmation
                 │
                 ▼
            Drift Auditor
                 │
         ┌───────┴────────┐
         ▼                ▼
   ROADMAP outputs    receipt chain
```

Architectural strengths include deterministic matching, no runtime npm dependencies, local-first state, explicit uncertainty, source redaction, and preserved transition history.

Known limitations include lexical evidence matching rather than semantic embeddings, no hosted collaboration layer, no first-class GitHub/Jira/Linear adapters in v1.0.0, and no deployment-provider attestation adapters. These are limitations, not hidden capabilities.

## 7. Strategic Ecosystem Role

Within LML:

- LivingGuide owns durable institutional/project truth.
- LivingDocs owns technical explanation truth.
- LivingChangelog owns shipped-history truth.
- LivingPress owns editorial/publication truth.
- **LivingRoadmap owns future intent and intent-vs-reality truth.**

The natural cross-module loop is:

```text
LivingRoadmap intent
       ↓
implementation
       ↓
LivingDocs current technical truth
       ↓
LivingChangelog shipped proof/history
       ↓
LivingRoadmap reconciliation
```

Direct automated cross-module evidence exchange is a future integration opportunity unless implemented elsewhere; this repository alone does not claim that integration is complete.

## 8. Development History

Version 1.0.0 was created as the fifth Living module after the Living Master Library established a shared control plane for Press, Changelog, Guide, and Docs. Its design emerged from a missing truth category: none of the existing products owned **future intent** or measured declared planning against implementation reality.

The explicit shipping-confirmation rule was chosen to prevent a common provenance failure: treating filename/keyword resemblance or implementation presence as proof that a feature was actually released to users.

## 9. Current State Assessment

Confirmed working in the local repository:

- module CLI;
- local JSON persistence;
- source and Git evidence scanning;
- evidence candidate reconciliation;
- audit and build outputs;
- secret redaction;
- receipt verification;
- Living Master Library integration;
- local test suite.

Unknown without external evidence: production reliability under large organizations, multi-user contention, hosted deployment behavior, and real-world false-positive/false-negative rates across heterogeneous repositories.

## 10. Monetization Analysis

Potential models are strategic inference, not proven revenue:

- paid developer CLI/pro edition;
- team/hosted roadmap intelligence;
- enterprise evidence adapters;
- audit/compliance-oriented roadmap history;
- integration into engineering-management suites;
- inclusion as a premium LML module.

No numeric valuation is asserted. The repository contains implementation evidence but not transaction comps, revenue, retention, customer count, or public-market validation required for a grounded valuation.

## 11. Competitive Positioning

The defensible concept is not “another roadmap UI.” It is **evidence-aware roadmap reconciliation with preserved uncertainty and decision history**.

Formal competitor claims require external market research. This repository alone cannot establish category uniqueness or comparative superiority.

## 12. Future Vision

High-fit future capabilities:

- GitHub/GitLab pull-request and release adapters;
- CI/CD and deployment-provider attestations;
- LivingChangelog-native shipped evidence;
- LivingDocs-native implementation surface evidence;
- issue tracker synchronization;
- richer dependency graph and critical path analysis;
- semantic matching with deterministic evidence gates;
- roadmap snapshots and longitudinal drift analytics;
- team approval policies for authoritative transitions.

These are planned/speculative directions unless present in code at the time this guide is read.

## 13. Priority Roadmap

Near-term priorities:

1. measure reconciliation precision on real repositories;
2. add explicit shipping-proof adapters rather than broad textual heuristics;
3. add LML cross-module evidence contracts;
4. strengthen dependency/critical-path analysis;
5. add import/export adapters for existing roadmap systems;
6. retain the explicit human confirmation boundary for ambiguous shipping evidence.

## 14. Risk Analysis

Technical risks: lexical matching false positives/negatives, evidence-source ambiguity, large-repository scan cost, incomplete deployment proof, stale local Git context.

Operational risks: users treating candidate status as authoritative, putting sensitive information into descriptions, or assuming an audit score proves business value.

Product risk: drifting into generic task management and losing the sharper roadmap-vs-reality thesis.

## 15. Preservation & Continuity

Future operators should preserve these invariants:

1. Never silently promote fuzzy evidence to Shipped.
2. Preserve abandoned and superseded decisions instead of deleting history.
3. Keep evidence references inspectable.
4. Treat documentation as context, not production proof.
5. Keep secret material outside roadmap state.
6. Keep livingcore copies synchronized with canonical LML core.
7. Report uncertainty rather than manufacturing confidence.

Recovery sequence: install supported Node; run module tests; initialize/locate state; scan; reconcile; audit; inspect receipt integrity; review ship candidates manually before confirming.

## 16. Strategic Importance Ranking

Qualitative estimates only:

- Ecosystem importance: high, because it adds future-intent truth to LML.
- Replacement difficulty: moderate in v1.0.0; core data model is straightforward, but trustworthy evidence policies become harder as integrations expand.
- Monetization potential: unknown without market validation.
- Long-term importance: potentially high if it becomes the planning reconciliation layer connecting the other Living modules.

## 17. Recommended Next Actions

- Exercise it against several real repositories.
- Measure which evidence types create noisy candidates.
- Add explicit deployment attestations before broadening automation.
- Define a shared LML evidence interchange format.
- Keep the generated Roadmap Drift report as a first-class product surface.
- Avoid adding generic project-management features unless they strengthen provenance, drift, or continuity.

## 18. Canonical Summary

LivingRoadmap gives the Living Master Library a missing temporal layer: **declared future intent**.

The product is valuable when it can answer:

> What did we say we were going to do? What did we actually do? What changed? What got forgotten? What shipped? What never should be called shipped yet? And why did the plan change?

Its central standard is simple: **a roadmap should preserve intent, observe reality, and tell the truth about the distance between them.**

## Final Truth Audit

Confirmed: all implementation details explicitly described as present above are represented in the v1.0.0 local source and test suite.

Unknown/unverified: users, revenue, external adoption, public npm publication, production scale, competitive rank, and monetary valuation.

Security note: no credentials, private keys, recovery material, or secret values belong in this guide or roadmap state.
