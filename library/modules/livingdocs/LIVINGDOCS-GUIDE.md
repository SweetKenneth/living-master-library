# LivingDocs — Product Guide

## Thesis

**Documentation that stays true.**

LivingDocs treats documentation as a maintained projection of project evidence. Code, tests, configuration, schemas and executable interfaces describe current implementation more strongly than prose documentation does. Existing docs are still valuable evidence—but they prove what was written, not automatically what still works.

## The failure mode it is designed around

Normal documentation drifts quietly. A flag gets renamed. A config default changes. An endpoint disappears. An example keeps compiling only in somebody's memory. The documentation remains confident because nothing is responsible for re-validating the claim.

LivingDocs gives each durable documentation claim provenance, epistemic status and staleness. When supporting evidence changes, the claim becomes suspect before a new edition is rendered.

## System roles

**EVIDENCE READER** extracts durable claims from repository evidence and labels the basis: implementation, test, configuration, schema, documentation, creator context, research, inference or unknown.

**DRIFT AUDITOR** attacks the ledger and rendered docs for unsupported behavior, contradictions, stale evidence, circular documentation proof, bad examples, secret exposure and coverage gaps.

**CURATOR** renders a documentation edition from the reconciled ledger without upgrading uncertainty.

**DOCUMENTATION VERIFICATION** asks whether a new engineer could safely use the docs without guessing about installation, configuration, CLI/API interfaces, persistent state, security behavior, operations and limitations.

## The key invariant

A current behavior claim cannot be proven merely because another documentation page says the same thing.

For behavior-tagged claims—API, CLI, configuration, defaults, runtime, operation and examples—documentation-only evidence cannot survive as `confirmed`. The claim requires code, tests, configuration, schema or another executable source before it can be treated as implementation truth.

## Source drift

Each artifact is hashed. On a later scan:

- unchanged evidence is not re-extracted;
- changed evidence contaminates claims that depended on it;
- deleted evidence is preserved as deleted rather than silently forgotten;
- Confirmed/Observed dependent claims move to `requires_audit` until re-established;
- a new edition is generated only after reconciliation and audit.

## What v1 can document

The default Developer edition covers overview, getting started, installation, configuration, concepts, architecture, API, CLI, state/data model, examples, operations, security, troubleshooting, migrations, limitations and a reference index.

Presets are lenses over one truth model, not separate truth databases.

## Safety

LivingDocs skips obvious secret files and redacts likely credentials before they enter persistent state or model context. Generated output is scrubbed again. It is not a secret manager and should never be used as one.

## Future direction

Natural extensions include executable example verification, language-server/compiler hooks, live endpoint probes, generated multi-page documentation sites, claim-level inline provenance, PR comments for drift introduced by a change, and cross-product reconciliation with LivingChangelog and LivingGuide. These are directions, not claims about v1 implementation.
