# Living Master Library — Founder’s Guide

**Canonical status:** v1.3.2 package archive  
**Truth posture:** evidence-first; estimates and unknowns are labeled  
**Creator:** Kenneth E. Sweet Jr. — Solo Founder / Infrastructure Architect  
**Product thesis:** **One install. One control plane. A library of systems that keep important things true over time.**

This guide documents the Living Master Library package as it exists in the v1.3.2 source distribution. It does not claim external users, revenue, production scale, acquisition interest, or market validation because those facts are not proven by this repository.

## Status legend

- **Confirmed** — directly present in source/package metadata or proven by the shipped test suite.
- **Observed in code/docs** — present in the repository but not necessarily externally deployed.
- **Inferred** — reasonable architectural interpretation, explicitly not implementation proof.
- **Planned** — stated direction, not shipped behavior.
- **Speculative** — possible future product direction.
- **Unknown** — the package does not establish the answer.

---

# 1. Executive Summary

**Confirmed:** Living Master Library v1.3.2 is a zero-runtime-dependency npm-style umbrella distribution that bundles five Living product modules plus livingcore behind one CLI: livingcore 1.0.0, LivingPress 1.2.0, LivingChangelog 1.2.0, LivingGuide 1.0.2, LivingDocs 1.0.2, and LivingRoadmap 1.0.0. It also ships Collective Master Library 1.1.1 as a separate archive layer over their Founder’s Guides, including its own.

The Library exists because the five product engines had evolved into a coherent family but still required separate distribution and setup. The umbrella adds a product-level control plane rather than creating another autonomous engine. It introduces a single `living` executable, project activation state under `.living/`, shared environment aliases, module enable/disable behavior, unified status/doctor/audit commands, and a top-level integrity check ensuring each standalone module’s vendored livingcore remains identical to the canonical Library copy.

The strategic insight is that the family shares a recurring loop:

```text
observe reality → establish evidence → make bounded claims → challenge claims
→ publish/preserve state → detect drift → repair → retain history
```

Each module applies that loop to a different truth surface: editorial publishing, shipped product history, institutional memory, technical documentation, or future-intent/roadmap reconciliation.

**Current maturity:** functional source distribution with passing local self-tests and package-level orchestration. **Unknown:** npm publication status, production adoption, paying customers, external validation, or operating scale.

**Short-term opportunity:** simplify adoption of the existing Living family and make future Living modules installable through one recognizable product namespace.

**Long-term vision (inferred/planned):** the Library becomes the stable distribution and control plane for a growing catalog of evidence-grounded “Living” systems.

---

# 2. Canonical Identity

**Official name:** Living Master Library  
**Package name:** `living-master-library`  
**Primary CLI:** `living`  
**Alternate CLI:** `living-master-library`  
**Version:** 1.3.2

**Bundled lineage:**

- livingcore 1.0.0
- LivingPress 1.2.0
- LivingChangelog 1.2.0
- LivingGuide 1.0.2
- LivingDocs 1.0.2
- LivingRoadmap 1.0.0

**Creator attribution:** Kenneth E. Sweet Jr., Solo Founder / Infrastructure Architect.

**Creation context — confirmed from this package’s development:** the Library was created after LivingPress had already been separated from shared `livingcore`, followed by LivingChangelog, LivingGuide, and LivingDocs. The umbrella package is therefore a distribution/control-plane layer above existing engines rather than the origin of those engines.

**Canonical tagline:** “One install. One control plane. A library of systems that keep important things true over time.”

**Family phrases retained by bundled products:**

- LivingPress — published thought that stays alive.
- LivingChangelog — release notes that only claim what actually shipped.
- LivingGuide — your project remembers itself.
- LivingDocs — documentation that stays true.

---

# 3. Project Classification

The Library is best classified as:

- **Confirmed — Developer tooling:** a command-line distribution and orchestration package.
- **Confirmed — Product suite:** four user-facing engines plus a shared kernel.
- **Confirmed — Infrastructure/control plane:** it manages activation, paths, shared aliases, health, tests, and integrity.
- **Observed — Open-source package architecture:** MIT license is included and the complete source for bundled modules is distributed.
- **Inferred — Platform:** the registry and module-dispatch architecture can support additional Living modules, but a remote plugin marketplace is not implemented.
- **Not established — SaaS:** no hosted control plane or billing system exists in this package.
- **Not established — Marketplace:** there is no module marketplace or remote catalog service.

---

# 4. Core Concept

The core concept is not merely “install four tools together.” The useful product boundary is **one coherent operational surface for a family that shares evidence/provenance principles but applies them to different domains**.

The Library solves three immediate problems:

1. **Distribution fragmentation.** Users no longer need to reason about five separate archives before trying the family.
2. **Configuration fragmentation.** Common AI/database/secret values can be provided through shared `LIVING_*` aliases while product-specific overrides remain possible.
3. **Core drift.** The standalone modules intentionally retain vendored livingcore copies to remain zero-dependency standalone packages. The Library compensates by hashing those copies against its canonical core and surfacing divergence.

The architectural moat, if one develops, is not the CLI itself. It would come from the combination of reusable deterministic primitives, increasingly specialized truth-maintenance engines, cross-module provenance, and a stable operator experience. **That moat is potential, not proven market defensibility.**

---

# 5. Full Feature Inventory

## 5.1 Unified CLI — Confirmed

`cli/main.mjs` provides:

- `living init`
- `living modules`
- `living status`
- `living doctor`
- `living audit`
- `living test`
- `living enable`
- `living disable`
- `living env`
- module routing for `press`, `changelog`, `guide`, `docs`, and `roadmap`
- collective archive routing for `living collective build|status|verify|sources`

## 5.2 Project control directory — Confirmed

Initialization creates `.living/` with:

- `library.json` — activation/version manifest
- `config/` — module config copies
- `state/` — persistent local state used by Guide/Docs wrappers
- `output/` — generated artifacts from those modules

The Library intentionally does not store secret values in `library.json`.

## 5.3 Module activation — Confirmed

Modules are physically included in the package regardless of project activation. `enable` and `disable` change project-level participation and preserve config files when disabling.

## 5.4 Shared environment aliases — Confirmed

The wrapper maps:

- `LIVING_AI_KEY`, `LIVING_AI_URL`, `LIVING_AI_MODEL`
- `LIVING_DB_URL`, `LIVING_DB_SERVICE_KEY`
- `LIVING_OWNER_SECRET`, `LIVING_CRON_SECRET`

into the active module’s native environment namespace when no module-specific override already exists.

## 5.5 Environment privacy — Confirmed

`living env` reports booleans indicating recognized variable presence and never prints values.

## 5.6 Health/doctor pass — Confirmed

Doctor checks:

- Node version compatibility
- Library initialization
- canonical-vs-vendored core hash integrity
- enabled module config presence
- config JSON validity
- placeholder counts as warnings
- recognized environment presence

Doctor is intentionally a local package-health check, not proof of external production readiness.

## 5.7 Unified audit — Confirmed

`living audit` combines doctor results with all bundled self-tests.

Clean baseline shipped in v1.3.2:

| Suite | Passing checks |
|---|---:|
| Living Master Library | 37 |
| livingcore | 28 |
| Collective Master Library | 37 |
| LivingPress | 60 |
| LivingChangelog | 106 |
| LivingGuide | 104 |
| LivingDocs | 108 |
| LivingRoadmap | 68 |
| **Total** | **548** |

These numbers establish local test coverage only.

## 5.8 Core integrity gate — Confirmed

The Library computes SHA-256 hashes for canonical `core/src/*.ts` files and compares every bundled module’s vendored `core/*.ts` copy. A modified/missing file creates an integrity failure.

## 5.9 Product passthrough — Confirmed

- Guide/Docs receive automatic project-local config/state/output paths.
- Changelog retains its stateless preview CLI.
- Press exposes setup/test through the Library; server mounting remains an integration concern documented by LivingPress itself.

## 5.10 Space-safe LivingPress setup — Confirmed

The Library’s bundled Press wizard accepts a project-local target through `LIVINGPRESS_CONFIG_PATH` using file-URL conversion rather than naïve path interpolation. Backups are written beside the target config.

---


## 5.11 LivingRoadmap integration — Confirmed

The 1.1.0 Library adds `living roadmap` as a first-class module route. Project initialization can enable `roadmap`; its config lives under `.living/config/livingroadmap.config.json`; its state and generated outputs remain project-local. Doctor includes its vendored livingcore copy in the same integrity gate as the other products.

LivingRoadmap owns the future-intent truth surface: declared plans, implementation candidates, shipping candidates, stale intent, unplanned work, and preserved roadmap decisions. Ambiguous evidence cannot silently promote an item to Shipped.

## 5.12 Collective Master Library integration — Confirmed

LML v1.2.0 added **Collective Master Library (CoML)** as an archive layer rather than a sixth Living module; v1.3.2 ships CoML 1.1.1. CoML discovers the Library Founder’s Guide, every Founder’s Guide belonging to a registered Living module, and its own Founder’s Guide, fingerprints each source with SHA-256, and produces a lossless collective Markdown archive, responsive/print-ready HTML, machine-readable source manifest, and content-addressed source snapshots. The HTML is a rendered reading view; the byte-exact text lives in the combined Markdown and the snapshots.

`living collective verify` compares the current source set to the last collective manifest. Changed, added, or removed canonical guides, or a module version change, mark the prior archive STALE. A missing or modified snapshot, combined Markdown or HTML file marks it DAMAGED.

`living collective check` cross-checks the guides against each other and the catalog: declared versions, versions stated for other products, test counts and table totals. It is deterministic, skips history sections, reports file and line for every claim involved, and never edits a guide. Every build includes the report. A Library self-test runs it, so a release whose guides contradict each other fails its own suite. Aggregation cannot upgrade the epistemic status of local claims; local Founder’s Guides remain canonical inside their own scope.

This establishes a deliberate hierarchy:

```text
module Founder’s Guides = local canonical truth
Living Master Library Founder’s Guide = LML product truth
Collective Master Library = ecosystem archive of those canonical sources
```

# 6. Architecture Analysis

```text
                     ┌──────────────────────────┐
                     │  Living Master Library   │
                     │      package v1.3.2      │
                     └────────────┬─────────────┘
                                  │
                       ┌──────────▼──────────┐
                       │  unified `living`   │
                       │       CLI           │
                       └──────────┬──────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
       project control       module routing      health/audit
        `.living/`                │                   │
              │          ┌────────┼─────────┐         │
              │          │        │         │         │
              │       Press   Changelog   Guide     Docs
              │          │        │         │         │
              └──────────┴────────┴────┬────┴─────────┘
                                      │
                              livingcore contract
```

### Strengths

- Zero runtime npm dependencies.
- Existing module source remains visible and independently testable.
- No forced database for the control plane.
- Shared aliases reduce configuration repetition without erasing product-specific controls.
- Project activation is explicit and inspectable.
- Core drift becomes observable.
- Module dispatch delegates into existing engines instead of cloning their business logic.

### Weaknesses / technical debt

- **Confirmed:** the package currently carries canonical livingcore plus five vendored copies. This is deliberate for standalone compatibility but duplicates source bytes.
- **Confirmed:** LivingPress does not yet expose a full operational CLI comparable to Guide/Docs; the umbrella can configure/test it but runtime integration is framework/server-specific.
- **Confirmed:** Changelog preview is CLI-friendly, but its deployed engine lifecycle is not yet represented by a full umbrella lifecycle command set.
- **Observed:** Node 22.6+ is required because module source is executed through Node’s TypeScript type stripping.
- **Unknown:** Windows behavior has not been established by the shipped tests even though path handling was written with cross-platform utilities where necessary.

### Scalability

The control plane itself is local and lightweight. Scaling constraints primarily belong to individual modules and their adapters. There is no evidence in this package supporting a specific throughput or organization-size claim.

---

# 7. Strategic Ecosystem Role

The Library is the natural **front door** for the Living family.

Before the Library, the architecture was horizontal: multiple siblings sharing a kernel. The Library adds a vertical layer above them:

```text
user/operator
     ↓
Living Master Library
     ↓
Living product modules
     ↓
livingcore primitives
```

This gives future modules a predictable place to live without forcing all product behavior into livingcore.

Potential future cross-module relationships include Changelog events invalidating Docs claims or Guide state, and Guide/Docs evidence feeding shared provenance. **Those connections are not implemented by the current umbrella and should not be described as shipped.**

---

# 8. Development History

**1.1.0 expansion — Confirmed:** LivingRoadmap was added as the fifth module to cover the missing temporal truth surface: future intent. Its design explicitly separates implementation/shipping candidates from authoritative status transitions.

**1.2.0 archive layer — Confirmed:** Collective Master Library was added to roll every Founder’s Guide into one fingerprinted archive without making it a sixth truth module.

**1.2.1 correction — Confirmed:** CoML verification was extended from source drift to archive integrity (missing or edited snapshots and outputs now report DAMAGED), the HTML archive was changed from raw Markdown to a rendered view, and hand-synced version strings were removed.

**1.3.0 consistency — Confirmed:** CoML 1.1.0 includes its own Founder’s Guide and adds a deterministic cross-guide consistency check. LivingGuide 1.0.1 expands its Founder’s Guide into the full 18-section archive format.

**1.3.1 self-run fix — Confirmed:** pointing LivingGuide at the Library itself showed that the LivingGuide and LivingDocs scanners walked the Library’s own `.living/` directory, so a previous edition, its state file or the project config could become evidence for the next one. Both scanners now skip `.living/` (LivingRoadmap already did), and a Library self-test proves it for all three scanning modules.

**1.3.2 one repository — Confirmed:** every package now points to a single family repository, `SweetKenneth/living`, with each package's folder recorded in its `repository.directory`. Whether the repository is public is not established by this package.


**Confirmed sequence represented by the bundled versions:**

1. LivingPress matured as an autonomous editorial engine.
2. Shared invariants were extracted into livingcore 1.0.0.
3. LivingChangelog reused the core for evidence-grounded release publishing.
4. LivingGuide reused the core to maintain a canonical project truth model and continuity archive.
5. LivingDocs reused the core to maintain implementation-grounded documentation.
6. Living Master Library was created when the family itself became a product boundary worth packaging.

The important pivot was conceptual: instead of repeatedly asking what LivingPress could be transformed into, the architecture separated reusable truth-maintenance machinery from the domain-specific truth surface.

---

# 9. Current State Assessment

### What works — Confirmed

- one-install source package
- unified CLI
- project initialization
- module activation/deactivation
- config staging
- shared environment aliases
- health/doctor output
- full-suite audit execution
- canonical-vs-vendored livingcore hashing
- real command passthrough for Guide/Docs/Changelog
- project-local LivingPress setup target
- collective Founder’s Guide aggregation and drift verification
- full passing checks across umbrella + core + CoML + bundled Living suites

### Incomplete / unknown

- npm publication is not established by source.
- automated upgrade/migration between future Library versions is not implemented.
- remote module discovery is not implemented.
- hosted UI/control panel is not implemented.
- centralized cross-module event bus is not implemented.
- semantic cross-guide synthesis/deduplication is not implemented; CoML 1.1.1 checks factual consistency deterministically but intentionally prefers lossless source preservation over rewriting.
- external adoption, revenue, and support burden are unknown.

### Estimated maturity

These are architectural estimates, not external benchmarks:

- **Implementation maturity:** 8/10 — core local workflows are present and heavily self-tested.
- **Distribution maturity:** 6/10 — package structure is ready for packing/install testing; public registry publication is separate.
- **Operational maturity:** 5/10 — module operation varies and external deployments are not proven by the umbrella.
- **Commercial maturity:** Unknown/early — no evidence of customers or revenue is contained here.

---

# 10. Monetization Analysis

No present valuation or revenue should be inferred from code quality alone.

### Plausible models — Inferred

- open-source core/library with commercial hosted control plane
- paid enterprise module bundle/support
- commercial adapters/connectors
- managed evidence/provenance storage
- team collaboration layer
- compliance/governance modules
- commercial licensing for organizations that do not want reciprocal/open licensing if licensing changes later

### Lowest-effort monetization path — Inferred

The lowest implementation burden would likely be paid support/setup or a commercial package around existing modules, because the source engines already exist. This is not evidence that demand exists.

### Higher-upside path — Speculative

A hosted Living control plane with repository/app connectors, organization policy, shared evidence ledger, schedules, alerts, and module catalog could create recurring SaaS economics. That would be a materially new product layer and must not be represented as implemented.

### Valuation

**Unknown.** A defensible numeric valuation would require external comparables, adoption, revenue, retention, support costs, licensing strategy, and buyer context. This guide intentionally does not fabricate dollar ranges.

---

# 11. Competitive Positioning

No competitor research is embedded in the package, so specific superiority claims would require external research.

The internal differentiation is architectural:

- the suite is organized around maintaining truth under change rather than one-shot generation;
- deterministic checks sit beside model judgment;
- receipt/provenance concepts repeat across modules;
- uncertainty is intentionally preserved in Guide/Docs;
- Changelog distinguishes merged code from shipping evidence;
- Docs rejects documentation-only proof for implementation behavior.

Whether that produces market-level differentiation is **unverified**.

---

# 12. Future Vision

### Confirmed design direction

The registry/dispatcher can admit additional modules without changing the product thesis.

### High-fit future modules — Speculative until built

- LivingRunbook — procedures that re-prove they still work.
- LivingSpec — requirements reconciled against implementation.
- LivingPolicy — policy/control claims reconciled against operational evidence.
- LivingIncident — evidence-backed incident timelines and corrective-action verification.
- LivingKnowledge — provenance-backed organizational knowledge with decay/drift handling.
- LivingPortfolio — cross-project truth and dependency layer.

The selection rule should remain: **what important thing goes stale, and what stronger evidence can prove its current state?**

---

# 13. Priority Roadmap

### Immediate

1. Package-install smoke test from the actual generated npm tarball.
2. Add upgrade/migration semantics for `.living/library.json` before schema changes are needed.
3. Define a formal module contract (metadata + command capabilities) so CLI routing becomes data-driven rather than partially special-cased.
4. Add cross-platform CI, particularly Windows.
5. Decide publication/licensing/namespace strategy before public release.

### High leverage

6. Standardize lifecycle commands across products where appropriate: `init`, `status`, `audit`, `doctor`.
7. Introduce optional cross-module event/provenance references without coupling engines tightly.
8. Add a machine-readable health output contract suitable for CI.
9. Add signed release manifests for Library/module integrity.

### Longer-term

10. Remote/hosted control plane only if actual use demonstrates that local CLI orchestration is insufficient.
11. Module marketplace/catalog only after more modules exist and version compatibility is a real problem.

---

# 14. Risk Analysis

### Technical

- duplicate vendored core copies can drift; currently mitigated by hash audit.
- source execution depends on Node’s TypeScript-stripping support.
- umbrella wrappers may lag module-specific CLI changes if command contracts are not formalized.
- future module version incompatibility requires migration/version negotiation.

### Operational

- a single package increases release coordination responsibility.
- users may assume `living audit` proves external services are healthy; documentation must keep the distinction clear.
- secret aliases simplify configuration but require careful documentation so server-only values never move client-side.

### Product

- the family could become incoherent if modules are added merely because the “LivingX” name sounds good.
- too many modules could dilute the strongest concept: truth maintenance under change.
- the Library must not become a generic agent framework unless evidence shows that is the right product.

### Founder bottleneck

The product family currently reflects a solo-founder architecture and naming system. Preservation docs and deterministic tests reduce—but do not eliminate—the risk of intent living only in the creator’s head.

---

# 15. Preservation & Continuity

A future operator should understand these non-negotiable rules:

1. **livingcore is the shared invariant layer.** Fix common behavior there first.
2. **Do not silently tolerate vendored core drift.** Update canonical core and synchronize intentionally.
3. **Generated prose is not automatically truth.** Each module defines stronger evidence.
4. **Preserve uncertainty.** Downgrading confidence is preferable to invented certainty.
5. **Do not merge module truth surfaces just to reduce file count.** Press, Changelog, Guide, Docs, and Roadmap exist separately for a reason.
6. **The Library is a control plane, not the evidence database for every module.**
7. **Never place credentials in the canonical manual or `.living/library.json`.** Use secure external storage.

Recovery procedure:

- verify Node version;
- run `living modules`;
- run `living doctor`;
- run `living test all`;
- inspect `.living/library.json` and configs;
- inspect each module’s own Founder’s Guide before materially changing its truth model;
- resolve core drift before product changes.

[SECURE SECRET REFERENCE: credentials must remain outside this document.]

---

# 16. Strategic Importance Ranking

These are founder-architecture estimates, not market scores.

| Dimension | Estimate | Reason |
|---|---:|---|
| Ecosystem importance | 9/10 | It becomes the front door and compatibility layer for every Living module. |
| Technical uniqueness | 7/10 | The CLI itself is conventional; the evidence-maintenance family behind it is more distinctive. |
| Replacement difficulty | 6/10 | The wrapper can be rewritten, but preserving all module contracts/integrity behavior takes care. |
| Monetization potential | Unknown | Requires external demand evidence. |
| Long-term leverage | 9/10 | Every future module can strengthen one distribution/control plane. |
| Current operational dependency | 5/10 | Standalone products still work without the Library by design. |

---

# 17. Recommended Next Actions

1. Treat `living-master-library` as the default public entry point while retaining standalone module distributions.
2. Keep individual module versions independent; let Library releases pin known-compatible combinations.
3. Define a formal module manifest interface before adding the next two modules.
4. Add upgrade/migration tests before changing `.living/` schema.
5. Add CI across supported operating systems.
6. Keep full-suite regression testing mandatory for every Library release.
7. Resist hosted complexity until user behavior shows a need.
8. When adding modules, require a written answer to: “what goes stale, what evidence proves it, and what deterministic gate prevents circular truth?”

---

# 18. Canonical Summary

Living Master Library represents the moment the Living products became more valuable as a **coherent library** than as a collection of related archives.

Its purpose is not to erase product boundaries. Its purpose is to make those boundaries easy to install, operate, verify, and extend.

The durable architecture is:

```text
one control plane
many bounded truth surfaces
one shared invariant kernel
evidence before certainty
history instead of silent rewriting
```

The Library should continue existing as long as it reduces operational fragmentation without weakening the independence and truth rules of its modules.

Its ultimate form could become a complete local-or-hosted control plane for evidence-grounded Living systems. That is a future possibility, not a current claim.

For v1.3.2, the verified product is concrete: **one package containing the full existing Living family, one CLI to control it, one project namespace to configure it, and one audit surface capable of proving the package has not quietly split into incompatible cores.**

---

## Final truth audit

- **External users:** Unknown.
- **Revenue:** Unknown.
- **Public npm publication:** Unknown.
- **Production scale:** Unknown.
- **548 passing local checks:** Confirmed by shipped suite baseline at v1.3.2.
- **One-install package structure:** Confirmed.
- **Shared environment aliases:** Confirmed.
- **Core integrity audit across five modules:** Confirmed.
- **Remote module marketplace:** Not implemented.
- **Hosted dashboard:** Not implemented.
- **Cross-module autonomous event bus:** Not implemented.

The archive should be updated whenever the bundled module matrix, control-plane schema, or core contract changes.
