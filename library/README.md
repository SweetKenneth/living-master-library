# Living Master Library

**One install. One control plane. A library of systems that keep important things true over time.**

Living Master Library packages the Living family behind a single `living` command:

| Module | Version | Job |
|---|---:|---|
| `livingcore` | 1.0.0 | Deterministic shared substrate: receipts, model failover, circuit breaker, leases, rate defense, safe Markdown, deterministic choices |
| LivingPress | 1.2.0 | Maintains autonomous editorial publishing and correction |
| LivingChangelog | 1.2.0 | Publishes release history only when evidence proves a change shipped |
| LivingGuide | 1.0.2 | Maintains a provenance-backed canonical project truth model and Owner's Manual |
| LivingDocs | 1.0.2 | Maintains technical documentation against implementation evidence and detects drift |
| LivingRoadmap | 1.0.0 | Reconciles declared plans against implementation and shipping reality while preserving decision history |

The Library is the product layer above the individual engines. Each module remains independently understandable and testable, while the Library supplies installation, project activation, shared environment aliases, status, health checks, core-integrity checks, and unified test/audit commands.

## Install

Node **22.6+** is the supported runtime for this release. The npm distribution executes compiled JavaScript while retaining the TypeScript source for inspection and development.

From the release tarball included with this source distribution:

```bash
npm install -g ./living-master-library-1.3.2.tgz
living init
living doctor
```

From source, the whole family lives in one repository:

```bash
git clone https://github.com/SweetKenneth/living.git
cd living
npm install -g .
```

If the package is later published under the `living-master-library` npm name, the equivalent registry install is `npm install -g living-master-library`. Public registry publication is not asserted by this repository.

`living init` enables all included modules by default and creates:

```text
.living/
├── library.json
├── config/
│   ├── livingpress.config.json
│   ├── livingchangelog.config.json
│   ├── livingguide.config.json
│   ├── livingdocs.config.json
│   └── livingroadmap.config.json
├── state/
└── output/
```

Enable only a subset when a project does not need the whole family:

```bash
living init --modules docs,guide,roadmap
living enable changelog
living disable press
```

The modules are still installed. Enable/disable only controls which modules are active for that project.

## One shared AI configuration

Every module keeps its native environment variables, but the Library adds optional shared aliases:

```bash
LIVING_AI_KEY=...
LIVING_AI_URL=...
LIVING_AI_MODEL=...
```

These map into the active module at runtime. A module-specific value, such as `LIVINGDOCS_AI_KEY`, always wins over the shared alias.

The Library also recognizes shared infrastructure aliases:

```bash
LIVING_DB_URL=...
LIVING_DB_SERVICE_KEY=...
LIVING_OWNER_SECRET=...
LIVING_CRON_SECRET=...
```

`living env` reports only whether recognized variables are present. It never prints their values.

## Unified CLI

```text
living init
living modules
living status
living doctor
living audit
living test all
living enable <module>
living disable <module>
living env
```

Then address a module directly through the same executable:

```bash
# LivingDocs
living docs scan
living docs build
living docs audit
living docs verify
living docs status

# LivingGuide
living guide scan
living guide build
living guide audit
living guide resurrection
living guide status

# LivingChangelog
living changelog preview --repo owner/name --since 14d

# LivingRoadmap
living roadmap add --title "Add signed webhooks" --priority high
living roadmap scan
living roadmap reconcile
living roadmap build

# LivingPress
living press setup
living press test
```

For Guide and Docs, the Library automatically injects project-local config, state, and output paths under `.living/`. Changelog's public-repository preview remains stateless. LivingPress remains a server integration engine; `living press setup` writes its configuration into `.living/config/` while its README documents runtime mounting and database setup.

## Collective Master Library

LML v1.3.2 includes **Collective Master Library (CoML) 1.1.1** as the ecosystem archive layer. CoML is not another Living truth module. It combines the Library Founder’s Guide, every registered module Founder’s Guide and its own Founder’s Guide into one lossless, provenance-preserving archive.

```bash
living collective sources
living collective build
living collective status
living collective verify
living collective check
```

By default the generated archive lives under `.living/output/collective/` and contains:

```text
COLLECTIVE-MASTER-LIBRARY.md
COLLECTIVE-MASTER-LIBRARY.html
COLLECTIVE-MANIFEST.json
sources/
```

Each source is preserved verbatim, SHA-256 fingerprinted, and snapshotted. The HTML is a rendered reading view with a full source register; the Markdown and `sources/` snapshots hold the byte-exact text. Aggregation never upgrades the certainty of a claim merely because it entered the collective archive.

`living collective verify` reports one of three states: **CURRENT**, **STALE** (a guide changed, was added or removed, or a module version moved), or **DAMAGED** (an archive file or snapshot is missing or no longer matches the hash the build recorded).

`living collective check` cross-checks every guide against the others and the catalog: declared versions, versions stated for other products, test counts and table totals. It is deterministic, skips history sections and reports file and line for each disagreement. It never edits a guide, because each guide stays canonical in its own scope. Every build includes the report, and the Library's own self-test fails if the shipped guides disagree.

## What `living doctor` proves

Doctor checks local truths only. It does not pretend that a missing external deployment is healthy.

It verifies:

- supported Node runtime
- initialized `.living/` control plane
- enabled module config existence and JSON validity
- remaining `[ENTER ...]` placeholders as explicit warnings
- all five Living-module copies of `livingcore` against the canonical Library copy
- presence (never values) of shared/provider environment variables

`living audit` adds every inherited module self-test to that health check.

Current clean-suite baseline for this release is verified during packaging. In v1.3.2, the audit includes the umbrella, livingcore, Collective Master Library, and all five Living modules.

```text
Living Master Library    37 passed
livingcore               28 passed
Collective Master Library 37 passed
LivingPress              60 passed
LivingChangelog         106 passed
LivingGuide             104 passed
LivingDocs              108 passed
LivingRoadmap            68 passed
--------------------------------
Total                   548 passed
```

Those numbers describe the shipped test suites in this package. They are not claims about external adoption, production scale, or market validation.

## Architecture

```text
                         Living Master Library
                                   │
                          ┌────────┴────────┐
                          │   `living` CLI  │
                          │  control plane  │
                          └────────┬────────┘
                                   │
                        .living/ project state
                                   │
     ┌──────────────┬──────────────┼────────────┬────────────┐
     │              │              │            │            │
LivingPress  LivingChangelog  LivingGuide  LivingDocs  LivingRoadmap
     │              │              │            │            │
     └──────────────┴──────────────┼────────────┴────────────┘
                                   │
                           livingcore 1.0.0
                  receipts · NEXUS · ORACLE · DEFENSE
                   leases · breaker · safe Markdown

Separate archive layer:
Founder’s Guides ──> Collective Master Library ──> canonical ecosystem archive
```

The standalone modules still carry vendored copies of `livingcore` so they can remain zero-dependency standalone distributions. The Library includes one canonical `core/` and audits every bundled copy against it. A mismatch is surfaced as a core-integrity failure rather than silently tolerated.

## Design rule

The Library is not a generic AI-agent launcher. The shared family behavior is narrower:

```text
observe reality
      ↓
establish evidence
      ↓
make a bounded claim
      ↓
challenge the claim
      ↓
publish or preserve state
      ↓
detect drift
      ↓
repair without erasing history
```

Each module applies that loop to a different truth surface.

## Module boundaries

**LivingPress** owns editorial decisions and living published articles. It should not become the release-note engine.

**LivingChangelog** owns evidence of what shipped. A merge is not automatically production truth under its default shipping policy.

**LivingGuide** owns durable institutional/project knowledge. The rendered manual is a projection of the claim/evidence graph, not the database of truth itself.

**LivingDocs** owns technical explanation. Documentation cannot prove implementation behavior merely by citing other documentation.

**LivingRoadmap** owns declared future intent and roadmap-vs-reality reconciliation. Fuzzy evidence can create candidates, but cannot silently mark work Shipped.

**livingcore** owns cross-product invariants and deterministic machinery. Product-specific prompts and truth models stay outside the core.

## Adding the next Living module

A new module should earn its place by answering a concrete question: **what important thing goes stale?**

A Library module should:

1. have a bounded truth surface;
2. identify evidence stronger than generated prose;
3. distinguish deterministic gates from model judgment;
4. preserve provenance and uncertainty;
5. detect drift;
6. repair without silently rewriting history;
7. ship a self-test;
8. use the canonical livingcore contract rather than fork it invisibly.

The Library registry is `library.catalog.json`. The current CLI aliases and lifecycle are implemented under `lib/` and `cli/`.

## Security

- Do not commit `.living/` state if it may contain private source excerpts.
- Scanning modules never read `.living/`, so a generated edition or state file cannot become evidence for the next run.
- Keep secrets in server-side secret stores or environment variables.
- `living env` prints presence only.
- Individual modules retain their own secret redaction / sensitive-file policies.
- The umbrella does not copy credential values into `library.json`.
- Run `living doctor` after updating a module to catch livingcore divergence.

## Distribution

This package intentionally has **zero runtime npm dependencies**. The bundled engines are source-visible and their existing standalone docs, Founder’s Guides, schemas, examples, tests, and installers remain under `modules/`.

For a standalone product, use that module's own distribution. For the complete family, install this Library.

## License

MIT. See `LICENSE` and the licenses retained in each bundled module.
