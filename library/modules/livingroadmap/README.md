# LivingRoadmap

**Plans that know when reality changed.**

LivingRoadmap is an evidence-aware roadmap engine for projects whose plans, implementation, releases, and priorities move at different speeds. It keeps a persistent roadmap, scans the project for implementation/release/deployment evidence, reconciles that evidence against declared intent, detects roadmap drift, and preserves decision history instead of silently rewriting the past.

It is part of the Living Master Library and uses `livingcore` for deterministic hashing and tamper-evident run receipts.

## What makes it different

LivingRoadmap is deliberately not a Kanban replacement. Its truth surface is the relationship between **declared intent** and **observable project reality**.

It tracks:

- `planned`, `active`, `blocked`, `shipped`, `abandoned`, `superseded`, and `needs_confirmation` states;
- expected value, effort, creator energy, revenue proximity, and dependency risk;
- dependencies and blockers;
- implementation candidates;
- shipping candidates;
- stale intent;
- unplanned work signals;
- possible duplicate intent;
- decision history and supersession.

The critical safety rule is simple: **fuzzy evidence may create a shipping candidate, but it may not silently mark an item Shipped.**

## Quick start

Standalone:

```bash
livingroadmap init
livingroadmap add --title "Add signed webhooks" --priority high --value 9 --effort 3 --energy 2
livingroadmap scan
livingroadmap reconcile
livingroadmap audit
livingroadmap build
livingroadmap status
```

Inside Living Master Library:

```bash
living init --modules roadmap
living roadmap add --title "Add signed webhooks" --priority high
living roadmap scan
living roadmap reconcile
living roadmap build
```

If reconciliation finds strong production/release evidence, it raises a candidate:

```text
ship candidate → requires confirmation → human confirms → shipped
```

Then:

```bash
living roadmap confirm item_... --status shipped --reason "Verified production release 1.4.0" --as "v1.4.0"
```

## Evidence model

LivingRoadmap can scan source code, tests, configuration, schemas, documentation, release files, deployment files, and local Git commit subjects. It excludes configured secret files and redacts common secret shapes before evidence is stored.

Evidence signals are bounded:

- source/tests/schema/config/commits can support **implementation candidates**;
- explicit deployment/release language can support **shipping candidates**;
- documentation is context, not proof of deployment;
- no fuzzy match can independently produce `shipped`.

## Roadmap Drift

The audit reports:

- stale roadmap items;
- blocked work;
- missing dependencies;
- duplicate intent;
- implementation observed while item remains planned;
- shipping evidence awaiting confirmation;
- implementation/release signals that do not map strongly to active roadmap intent.

The latter is the **unplanned work** signal: a way to compare what the roadmap says matters with where implementation energy actually went.

## Outputs

A build produces:

- `ROADMAP.md`
- `roadmap.html`
- `ROADMAP-AUDIT.md`
- `ROADMAP-DRIFT.md`

The HTML is responsive and print-friendly.

## Data model

Every roadmap item preserves:

```text
title
intent
why
status
priority
expected_value
effort
creator_energy
revenue_proximity
dependency_risk
dependencies
blocks
target_window
evidence
ship_candidate
implementation_candidate
requires_confirmation
decision_history
superseded_by
shipped_as
tags
```

This lets LivingRoadmap answer not only “what is next?” but also “why was this here, what happened to it, and what evidence changed our understanding?”

## Security

Do not put credentials in roadmap descriptions or committed config. The local scanner excludes `.env`, common private-key formats, and configured credential-like files, then redacts common secret patterns from readable source before storing excerpts.

## Status

Version 1.0.0. Local self-test baseline: **68 passing checks**.

No claim is made here about public npm publication, production adoption, revenue, or external market validation.
