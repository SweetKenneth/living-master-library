# Collective Master Library

> **The ecosystem remembers itself.**

The Collective Master Library (CoML) is a lossless, provenance-preserving roll-up of canonical Founder’s Guides. It does not replace local guides and it does not silently summarize them away. Each source remains intact, hashed, versioned, and attributable inside the collective archive.

## Collective identity

- **Source library:** Living Master Library
- **Source library version:** 1.3.2
- **Founder’s Guides incorporated:** 7
- **Aggregation policy:** lossless source preservation + deterministic index
- **Truth rule:** local guide claims retain their original epistemic status; aggregation does not upgrade certainty

## Ecosystem map

```text
Strategic intent / creator context
              │
              ▼
      Living Master Library
              │
   ┌──────────┼───────────┬───────────┬────────────┐
   ▼          ▼           ▼           ▼            ▼
LivingPress  Changelog   LivingGuide LivingDocs   LivingRoadmap
 published   shipped     institutional technical  future intent
 truth       truth       memory        truth      vs reality
   └──────────┴───────────┴───────────┴────────────┘
              │
              ▼
   Collective Master Library
      ecosystem archive
```

## Source register

| Guide | Kind | Version | Role | SHA-256 |
|---|---|---:|---|---|
| Living Master Library | library | 1.3.2 | — | `82e8a33cd4b4…` |
| LivingPress | module | 1.2.0 | Published thought that stays alive. | `2f6db256a66d…` |
| LivingChangelog | module | 1.2.0 | Release notes that only claim what actually shipped. | `3c03111a140e…` |
| LivingGuide | module | 1.0.2 | Your project remembers itself. | `7f9e7e43b7eb…` |
| LivingDocs | module | 1.0.2 | Documentation that stays true. | `53782f7a6c85…` |
| LivingRoadmap | module | 1.0.0 | Plans that know when reality changed. | `b314fcd6b32c…` |
| Collective Master Library | archive | 1.1.1 | The ecosystem remembers itself. | `7b5c978cf6d2…` |

The Living Master Library’s own Founder’s Guide is the ecosystem-level source, and the Collective Master Library’s own guide is included so the archive layer is documented by the same rules. Exact source metadata appears in `COLLECTIVE-MANIFEST.json`.

## Archive build

- **Generated:** 2026-10-03T14:12:20.385Z
- **Policy:** Each Founder’s Guide below is preserved losslessly. Repeated concepts are intentionally retained because the local guides are canonical in their own scope.
- **Verification:** Run `coml verify` or `living collective verify` to compare current guides against the manifest hashes.

# Canonical Founder’s Guide Archive

---

# Source 1: Living Master Library v1.3.2

**Provenance:** `FOUNDERS-GUIDE.md`  
**SHA-256:** `82e8a33cd4b46ca29ccb2c16944ab6b4a8da89c2e94cc674da82a895955c4df9`  
**Words:** 3,793  
**Source kind:** library

<!-- BEGIN LOSSLESS SOURCE: FOUNDERS-GUIDE.md -->
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

<!-- END LOSSLESS SOURCE: FOUNDERS-GUIDE.md -->


---

# Source 2: LivingPress v1.2.0

**Provenance:** `modules/livingpress/FOUNDERS-GUIDE.md`  
**SHA-256:** `2f6db256a66dc90151917e57e9689c3252ffc14933a5e273e6735d534df10481`  
**Words:** 981  
**Source kind:** module

<!-- BEGIN LOSSLESS SOURCE: modules/livingpress/FOUNDERS-GUIDE.md -->
# LivingPress — Founder's Guide

*LivingPress: Autonomous Editorial Engine.* This guide is only about LivingPress: what it does, what you control, and how to read what it tells you.

## What it is
A writer that lives on your site. A few times a day it wakes up, looks at what it has already published, and asks one question: **do I have something worth saying?** Most of the time the honest answer is no, and it goes back to sleep — and writes down why. When the answer is yes, it writes, argues with itself, fixes what it got wrong, adds an image, and publishes.

It also goes back and **re-reads its old posts**. If something it said is no longer true — a price changed, a page moved, a word you've retired — it corrects the post and adds a visible "Updated" note so readers can see what changed.

## The rules it lives by
1. **It only states your facts.** It may only rely on the house facts you gave it. Anything else is treated as a claim it cannot support.
2. **Every post must be worth reading even if your business didn't exist.** Only every third post (you choose) may recommend you directly. The rest just help.
3. **Silence beats filler.** A missed day is fine. A bad post isn't.
4. **No image, no post.**
5. **Corrections are public.** It never quietly rewrites history.

## How one post gets made
1. **Health check.** If it has been failing repeatedly, its safety switch is off and it stays quiet.
2. **Self-repair.** Fixes small breakages (missing images, stuck topics).
3. **Maybe re-read an old post** instead of writing a new one.
4. **Look at the gaps** — topics with no main article, main articles without follow-ups, topics gone stale.
5. **Pick a topic** using its strategy: stick with what's working, try something less covered, or retry a failed idea from a new angle.
6. **Write the draft.**
7. **Safety check (no AI involved):** made-up numbers, fake testimonials, risky advice, broken links, robot phrasing.
8. **Two critics.** A *Reader* asks "was this worth my time?" A *Skeptic* asks "can we prove this?" Both must pass. One rewrite allowed.
9. **Seven gates** — reader, skeptic, safety, length, links, not-an-ad, clean. All must pass.
10. **Image, then publish.** Every outcome — published, silent, blocked, corrected — gets a sealed receipt.

## What you control (`livingpress.config.json`)
| Setting | What it means |
|---|---|
| Site, blog name, tagline | Names and where the blog lives |
| Audience | Who it writes for — the more specific, the better the posts |
| Voice | How it sounds |
| **House facts** | The only truth it may tell. Update this whenever something changes — old posts will be corrected to match |
| Never claim | Things it must never say |
| Retired words | Words it must stop using; old posts get cleaned too |
| Content topics | 3–6 subjects, each with its argument and search terms |
| Reader problems | What your readers are struggling with |
| Site links | Pages it may link to — it will link nowhere else |
| Advocacy every | Every Nth post may recommend you |
| Word targets | Length of main articles and follow-ups |
| Quality floor | How strict the critics are. Higher = fewer, better posts |
| Cadence | Minimum hours between posts; how often it re-reads old ones |
| Safety switch | How many failures before it stops, how long it rests |

## Seeing a post before it goes live
Ask whoever installed it to run a **dry run**. It does everything a real run does (picks a topic, writes, argues with itself, runs the safety check) and then stops and shows you the post instead of publishing it. Nothing changes on your site. It's the best way to judge the voice before you let it loose.

It also refuses to run at all while any setup question is still unanswered, so it can never write from half a brief.

## Reading its pulse
Ask whoever installed it to show you the **health** report:
- **Healthy** — heartbeat recent, safety switch closed, receipts valid.
- **Safety switch open** — it hit repeated problems (often an AI account out of credit). It's resting on purpose. Fix the cause, then reset it.
- **Many silent days** — normal for a while. If it lasts, your topics may be used up or the quality floor too high.
- **Receipts invalid** — someone edited its history. That should never happen.
- **Config or secret findings** — a setup answer is missing, or a password is too short. The report says which.

## Improvement suggestions (DREAM)
LivingPress studies its own history and suggests changes, for example: "readers spend far more time on Topic B — favor it", "you keep opening posts the same way", "the critics reject almost everything — add a topic or lower the bar". **It never changes itself.** You accept a suggestion, or you don't.

## Backup AI (NEXUS)
Give it two AI accounts if you can. When the first one runs out of quota, it switches to the next automatically and comes back to the first later.

## Who sees what
- Readers see published posts, images, caveats and correction notes.
- Topics, receipts, health and suggestions are visible only to you (owner key) and the server.
- Bot traffic is filtered out, so crawlers never shape what it writes.

## What it is not
It is not a content calendar, and it won't post daily just because a day passed. It cannot know facts you didn't give it. It needs a database, an AI account and a scheduler to run — those are the only outside things it depends on.

<!-- END LOSSLESS SOURCE: modules/livingpress/FOUNDERS-GUIDE.md -->


---

# Source 3: LivingChangelog v1.2.0

**Provenance:** `modules/livingchangelog/FOUNDERS-GUIDE.md`  
**SHA-256:** `3c03111a140e12338861291f9cdf8d0a44829d6547a05e575f5db4455b86b4a3`  
**Words:** 2,469  
**Source kind:** module

<!-- BEGIN LOSSLESS SOURCE: modules/livingchangelog/FOUNDERS-GUIDE.md -->
# LivingChangelog: Founder's Guide

LivingChangelog writes your public changelog for you. It watches where work actually happens (GitHub releases, merged pull requests, deploys), decides what deserves a public entry, and refuses to call something shipped until there's proof it reached production. Most of the time it says nothing, and it writes down why.

This guide has two parts: **getting it running**, step by step, and **how it thinks**, so you can read what it tells you.

---

# Part 1: Getting it running

Plan on about an hour the first time. If someone else (a developer or a coding agent) is doing the install, hand them the README and keep this guide for yourself: the steps below tell you what they should hand back to you.

## Step 0. Try it before you install anything

```bash
npx livingchangelog preview --repo your-github-name/your-repo
```

This reads your repo's last two weeks, shows which changes can be proven live, and what it would skip. Nothing is published or saved. Add an AI key to see the actual entries it would write, and try the voices side by side:

```bash
ANTHROPIC_API_KEY=your-key npx livingchangelog preview --repo your-github-name/your-repo --voice friendly
```

If you don't like what you see here, stop. The real install produces the same kind of entries.

## Step 1. Get the code and check it works

```bash
git clone https://github.com/SweetKenneth/living.git
cd living/modules/livingchangelog
npm test
```

You should see `106 passed, 0 failed`. No keys or internet needed for this.

## Step 2. Answer the setup questions

```bash
npm run setup
```

It asks about your product, who reads the changelog, the facts it's allowed to state, and which voice to use. It saves everything to `livingchangelog.config.json`. At the end it prints **three secrets**. Copy them somewhere safe right away (a password manager is ideal). They're explained in Step 6.

The engine refuses to run while any answer is still an `[ENTER ... HERE]` placeholder, so it can never write from half a brief.

## Step 3. Set up the database

LivingChangelog needs a Postgres database with a REST layer. Supabase (or Lovable Cloud, which runs on it) is the easiest.

1. Open your project's **SQL editor**.
2. Paste the whole contents of `schema.sql` and run it. It's safe to run again later, and safe next to LivingPress.
3. From the project's API settings, copy two things: the **project URL** and the **service role (secret) key**. The service key is powerful: it must only ever live on the server, never in your website's browser code.

## Step 4. Get an AI key

Any one of these works:

- an **Anthropic** key, stored as `ANTHROPIC_API_KEY`
- an **OpenAI** key, stored as `OPENAI_API_KEY`
- a **Lovable AI Gateway** key, stored as `LIVINGCHANGELOG_AI_KEY`
- **any other OpenAI-compatible provider** (OpenRouter, Groq, Together…): its key as `LIVINGCHANGELOG_AI_KEY`, plus `LIVINGCHANGELOG_AI_URL` and `LIVINGCHANGELOG_AI_MODEL`

A second provider is optional but recommended: put it in `LIVINGCHANGELOG_BACKUP_AI_KEY` (with `_URL` and `_MODEL`), and if the first runs out of credit it switches over automatically.

## Step 5. Tell it where your work happens

**GitHub (most people).** Create a read-only token: GitHub, Settings, Developer settings, fine-grained tokens. Give it access to your repo with read permission for Contents, Pull requests, Deployments and Metadata. It's needed for private repos and strongly recommended for public ones, because GitHub only allows 60 calls an hour without one.

**Your deploys (recommended).** The cleanest proof that something shipped is your deploy system saying so. If you deploy with GitHub Actions, add this step **after** your production deploy succeeds:

```yaml
      - name: Tell LivingChangelog this shipped
        if: success()
        run: |
          curl -fsS -X POST "$SITE/api/livingchangelog/evidence" \
            -H "Authorization: Bearer $INGEST" -H "content-type: application/json" \
            -d '{"source":"github-actions","external_id":"deploy-${{ github.run_id }}","kind":"deployment",
                 "title":"Production deployment","summary":"Deployed ${{ github.sha }} to production.",
                 "url":"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}",
                 "metadata":{"environment":"production","ref":"${{ github.ref_name }}","sha":"${{ github.sha }}","shipped":true}}'
        env:
          SITE: ${{ secrets.LIVINGCHANGELOG_SITE_URL }}
          INGEST: ${{ secrets.LIVINGCHANGELOG_INGEST_SECRET }}
```

The two `${{ secrets... }}` values are **GitHub repository secrets** (repo, Settings, Secrets and variables, Actions): `LIVINGCHANGELOG_SITE_URL` is your site's address, like `https://your-site.com`, and `LIVINGCHANGELOG_INGEST_SECRET` is the ingest secret from Step 2.

Any other deploy tool (Vercel, Netlify, Cloudflare, your own scripts) can send the same JSON. Only send it for production: a deploy marked `staging` is never treated as proof.

## Step 6. Put the secrets on your server

Every one of these goes into your host's secret or environment-variable settings (Cloudflare, Vercel, Netlify, Supabase, Lovable). Never into the website's browser code, and never into the repo.

| Name | What it is | Where it comes from |
|---|---|---|
| `LIVINGCHANGELOG_DB_URL` | Your database's address | Step 3 |
| `LIVINGCHANGELOG_DB_SERVICE_KEY` | Server-only database key | Step 3 |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or `LIVINGCHANGELOG_AI_KEY` | Your AI provider key (just one) | Step 4 |
| `LIVINGCHANGELOG_GITHUB_REPO` | `your-github-name/your-repo` | You |
| `LIVINGCHANGELOG_GITHUB_TOKEN` | Read-only GitHub token | Step 5 |
| `LIVINGCHANGELOG_CRON_SECRET` | Lets your scheduler run it | Printed in Step 2 |
| `LIVINGCHANGELOG_OWNER_SECRET` | **Your** key to everything | Printed in Step 2 |
| `LIVINGCHANGELOG_INGEST_SECRET` | Lets deploy tools report shipments | Printed in Step 2 |

**The three secrets, in plain words.** They're long random passwords you made in Step 2, not something a service gives you, and each one opens a different door:

- **Cron secret:** the scheduler's key. It can only ask for a normal run.
- **Ingest secret:** your deploy tool's key. It can only report "this shipped."
- **Owner secret:** yours alone. It can do dry runs, read the health report, accept suggestions and reset the safety switch.

If one leaks, generate a new one (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) and replace it. Keep all three different; the health report complains if two match or any is shorter than 32 characters.

## Step 7. Connect it to your website

This is the one step that needs a developer or a coding agent. Hand them `examples/worker.ts` and the README section "Mount the API" and "Build the public changelog." When they're done you should have:

- the engine answering at `https://your-site.com/api/livingchangelog/...`
- a `/changelog` page listing entries, and a page per entry
- optionally `/changelog/atom.xml` and `/changelog/feed.json`, so people can subscribe

## Step 8. Do a dry run

```bash
curl -X POST "https://your-site.com/api/livingchangelog/tick?dry=1" \
  -H "Authorization: Bearer YOUR_OWNER_SECRET"
```

It does everything a real run does, then stops and shows you the entry it would publish, the evidence behind it and which checks passed. Nothing goes live. If it says it's staying silent, the reason is right there in the response. "Nothing worth publishing yet" is a perfectly good first answer.

## Step 9. Schedule it

It should be called every 15 to 60 minutes. Frequent calls do not mean frequent entries: it stays silent unless something meaningful and proven shipped.

- **Cloudflare:** `examples/worker.ts` already includes a scheduled handler; add a Cron Trigger.
- **GitHub Actions** (works anywhere): add `.github/workflows/livingchangelog.yml`, and add `LIVINGCHANGELOG_CRON_SECRET` to the repository secrets next to `LIVINGCHANGELOG_SITE_URL`:

```yaml
name: LivingChangelog
on:
  schedule: [{ cron: "*/30 * * * *" }]
  workflow_dispatch:
jobs:
  tick:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS -X POST "$SITE/api/livingchangelog/tick" -H "Authorization: Bearer $CRON"
        env:
          SITE: ${{ secrets.LIVINGCHANGELOG_SITE_URL }}
          CRON: ${{ secrets.LIVINGCHANGELOG_CRON_SECRET }}
```

## Step 9½. Announce it (optional)

Every published entry can also go out as a post. It's built from the entry itself, never rewritten by AI, so it can't say anything the changelog doesn't. Set the env vars for whichever channels you want, on the server like the other secrets:

- **Bluesky:** your handle (like `yourname.bsky.social`) as `LIVINGCHANGELOG_BLUESKY_HANDLE`, and an **app password** (Bluesky, Settings, Privacy and security, App passwords; never your real password) as `LIVINGCHANGELOG_BLUESKY_APP_PASSWORD`.
- **Mastodon:** your instance address (like `https://mastodon.social`) as `LIVINGCHANGELOG_MASTODON_URL`, and an access token (Preferences, Development, New application, with the `write:statuses` permission) as `LIVINGCHANGELOG_MASTODON_TOKEN`.
- **X:** create an app in the X developer portal with read and write permission, then copy the four keys it shows (API key and secret, access token and secret) into `LIVINGCHANGELOG_X_API_KEY`, `LIVINGCHANGELOG_X_API_SECRET`, `LIVINGCHANGELOG_X_ACCESS_TOKEN` and `LIVINGCHANGELOG_X_ACCESS_SECRET`. Generate the access token **after** setting write permission, or posting will be refused.
- **Discord:** channel settings, Integrations, Webhooks, New webhook, copy the URL into `LIVINGCHANGELOG_DISCORD_WEBHOOK_URL`.
- **Slack:** create an incoming webhook for a channel and put its URL in `LIVINGCHANGELOG_SLACK_WEBHOOK_URL`.

Then do a dry run (Step 8): the response includes the exact text of each post. If you'd like a few minutes to catch a mistake before anything goes out, add `"announce": { "delayMinutes": 15 }` to your config. If a channel keeps failing (expired token, wrong permission), the health report says which one and why, and the changelog itself keeps working.

## Step 10. Check its pulse

```bash
curl "https://your-site.com/api/livingchangelog/health" -H "Authorization: Bearer YOUR_OWNER_SECRET"
```

You want `"healthy": true`. If not, `findings` lists exactly what's wrong in plain words. After the first few runs, `receipts.valid` should also be `true`.

That's it. Check the health report now and then for the first week, and read the first few entries it publishes.

## When something looks wrong

| What you see | What it usually means | What to do |
|---|---|---|
| Always silent, "No pending release evidence" | It isn't receiving anything | Check the GitHub repo name and token, or that your deploy step is sending evidence |
| "Holding change until shipping is proven" | It saw the merge but no production deploy or release | Add the deploy step from Step 5, publish GitHub releases, or (if merging really means live for you) set `shippingPolicy` to `merge-to-production-is-live` |
| "Recent changelog entry exists; holding" | It's bundling small changes on purpose | Normal. Lower `minHoursBetweenEntries` if you want entries sooner |
| "Reviewers judged the entry unhelpful" | The change was real but not interesting to readers | Normal. It'll bundle it with something bigger |
| `401 unauthorized` | Wrong secret for that action | Health, dry runs and resets need the owner secret |
| `429 slow down` | Too many calls in a minute | Wait a minute; check nothing is calling it in a loop |
| "GitHub rate limit reached" | No GitHub token, or it's used up | Set `LIVINGCHANGELOG_GITHUB_TOKEN` |
| "Circuit breaker open" | Several runs in a row failed (often an AI account out of credit) | Fix the cause, then reset it: `curl -X POST .../api/livingchangelog/reset -H "Authorization: Bearer YOUR_OWNER_SECRET"` |
| "Announcement to bluesky ... failed" | A channel's password or token is wrong or expired | Fix that channel's env vars; new entries will post normally |
| `receipts.valid: false` | Someone edited or deleted its history | This should never happen. Find out who has database access |

---

# Part 2: How it thinks

## What it does on a normal tick

1. Pull new source evidence and deduplicate it.
2. Drop deterministic garbage before paying a model: ignored labels, dependency/chore patterns, non-publishable kinds.
3. Optionally audit an old entry instead of writing a new one.
4. Respect the bundling window after the most recent entry.
5. Triage pending evidence into **ignore**, **hold**, or **publish**.
6. Prove shipping before customer-facing availability language is allowed.
7. Draft a compact release note from only the selected evidence + your stable product facts.
8. Run the deterministic immune screen.
9. Let Reader and Skeptic independently judge usefulness and factual support.
10. Permit one repair pass.
11. Publish only if the final fitness gates pass; otherwise record silence.
12. Seal the run into the receipt chain either way.

## The important distinction: activity vs. shipping

A commit means code changed. A merged pull request means code was accepted. Neither necessarily means a user can access the change.

The recommended `explicit-only` policy requires a release, successful deployment, or explicit manual-live event before normal public copy can imply that a change is live.

That single rule prevents a large class of embarrassing changelog lies.

## Evidence states

- **pending** — the publisher can still use it.
- **used** — it supported a published entry.
- **ignored** — it was intentionally removed from consideration with a reason.

Holding does not change the state; the evidence remains pending so it can bundle with later related work.

## Silence is normal

Silence can mean:

- no new evidence
- only chores/refactors/dependency work arrived
- the change is too small and is being held for a bundle
- code changed but shipping has not been proven
- the reviewers found the entry unhelpful or unsupported
- the quality floor was not met

The machine is not paid by the post.

## Corrections

LivingChangelog periodically re-reads older entries against later evidence and current product facts. It is conservative about history: something that was true when published does not become “wrong” just because the product later changed.

When an amendment is actually needed, the corrected body must pass:

1. the deterministic immune gate, and
2. an independent Correction Skeptic that checks newly introduced/changed claims against original evidence, later evidence, and current product facts.

Accepted amendments append a dated public correction note. Rejected amendments leave the public entry untouched.

## DREAM

DREAM looks at publication/rejection/readership history and can propose strategy adjustments. It **never edits its own configuration**. The owner must explicitly accept a proposal.

## NEXUS + breaker

NEXUS moves between configured model providers when one is unavailable or rate limited. Repeated total failures trip the circuit breaker so the publisher stops burning calls while infrastructure is unhealthy.

## Receipts

Every tick—published, silent, blocked, audited, repaired, errored—is canonicalized and hash-chained to the previous run. The database refuses a second child for the same parent hash. Health verifies the stored chain all the way back to `GENESIS`.

This is an integrity signal, not a blockchain. It detects mutation/deletion/forking inside the stored ledger; it does not magically make the underlying evidence source trustworthy.

## What you control

Everything product-specific lives in `livingchangelog.config.json`:

- product/site/changelog naming
- audience and voice
- stable product facts
- forbidden/retired claims
- public categories
- shipping policy + production branch
- source ignore rules
- developer-only publication policy
- word targets
- quality floors
- cadence/audit timing
- breaker and rate limits

## Before letting it publish (recap)

Use an owner dry run:

`POST /api/livingchangelog/tick?dry=1`

A dry run can pull/inspect evidence and show the complete proposed entry plus gate results, but it does not publish or consume the selected evidence.

Then check:

`GET /api/livingchangelog/health`

You want no config/secret/breaker findings and a valid receipt chain once runs exist.

## Choosing a voice
LivingChangelog can sound plain, friendly, dry or technical. The voice only changes the wording. It still can't claim anything the evidence doesn't prove, and the dry voice never jokes about security issues or bugs that hurt people. Try them side by side before you choose:

```bash
npx livingchangelog preview --repo your/repo --voice friendly
npx livingchangelog preview --repo your/repo --voice dry
```


<!-- END LOSSLESS SOURCE: modules/livingchangelog/FOUNDERS-GUIDE.md -->


---

# Source 4: LivingGuide v1.0.2

**Provenance:** `modules/livingguide/FOUNDERS-GUIDE.md`  
**SHA-256:** `7f9e7e43b7eb52cac0f2e8caad0f2ca4c6340e9c6082210df68a96b9718c8b19`  
**Words:** 2,114  
**Source kind:** module

<!-- BEGIN LOSSLESS SOURCE: modules/livingguide/FOUNDERS-GUIDE.md -->
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

<!-- END LOSSLESS SOURCE: modules/livingguide/FOUNDERS-GUIDE.md -->


---

# Source 5: LivingDocs v1.0.2

**Provenance:** `modules/livingdocs/FOUNDERS-GUIDE.md`  
**SHA-256:** `53782f7a6c85c9e873843e8dfdd20c10bdda737e68256ef3d94e8f2a3a9b63ff`  
**Words:** 7,473  
**Source kind:** module

<!-- BEGIN LOSSLESS SOURCE: modules/livingdocs/FOUNDERS-GUIDE.md -->
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

<!-- END LOSSLESS SOURCE: modules/livingdocs/FOUNDERS-GUIDE.md -->


---

# Source 6: LivingRoadmap v1.0.0

**Provenance:** `modules/livingroadmap/FOUNDERS-GUIDE.md`  
**SHA-256:** `b314fcd6b32ce04f6c204e252364d4fa3e16425fc732897f8b97f4570ae7ca90`  
**Words:** 1,429  
**Source kind:** module

<!-- BEGIN LOSSLESS SOURCE: modules/livingroadmap/FOUNDERS-GUIDE.md -->
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

<!-- END LOSSLESS SOURCE: modules/livingroadmap/FOUNDERS-GUIDE.md -->


---

# Source 7: Collective Master Library v1.1.1

**Provenance:** `collective-master-library/FOUNDERS-GUIDE.md`  
**SHA-256:** `7b5c978cf6d241a02f7bdbe4060bdf00ee26504f22949126e6ca8788d1dbdbdc`  
**Words:** 379  
**Source kind:** archive

<!-- BEGIN LOSSLESS SOURCE: collective-master-library/FOUNDERS-GUIDE.md -->
# Collective Master Library — Founder’s Guide

## Canonical identity

**Name:** Collective Master Library  
**Abbreviation:** CoML  
**Version:** 1.1.1  
**Tagline:** *The ecosystem remembers itself.*

## Purpose

Collective Master Library exists to solve a problem that appears only after a creator has multiple well-documented systems: local truth is preserved, but ecosystem truth becomes fragmented across separate canonical guides.

CoML combines Founder’s Guides into one archival surface while preserving the source boundaries required to know where every statement came from. It is intentionally different from the Complete Master Library (CML), which represents engineered capabilities, and the Living Master Library (LML), which maintains truth surfaces over time.

## Core doctrine

1. **Local truth remains local.** A module Founder’s Guide remains canonical for that module.
2. **Aggregation does not increase certainty.** A speculative statement remains speculative in the collective archive.
3. **Source text is preserved losslessly.** The archive does not silently rewrite a local canonical guide.
4. **Every source is fingerprinted.** SHA-256 hashes make source drift observable.
5. **The collective layer is reproducible.** A future operator can rebuild the archive from the same source set.
6. **Synthesis is derived, not canonical.** Cross-project interpretation may sit above the lossless archive but may not replace it.

## Architecture

```text
LML Founder's Guide     ─┐
Module Founder's Guides ─┼─> Discovery -> Fingerprint -> Manifest ─┬─> Lossless Markdown
CoML Founder's Guide    ─┘                                         ├─> Rendered HTML
                                                                   ├─> Source snapshots
                                                                   └─> Consistency report
```

## Current implementation status

**Confirmed in code:** source discovery, deterministic ordering, SHA-256 fingerprinting, Markdown generation, HTML generation, source snapshots, machine-readable manifest, drift verification, archive integrity verification (1.0.1), self-inclusion of this guide, and a deterministic cross-guide consistency check (1.1.0; Edition and Canonical status lines checked since 1.1.1).

**Not claimed:** semantic deduplication, AI synthesis, acquisition valuation, external adoption, hosted service availability, public npm publication, or cross-library ingestion from SML/CML. Those are future possibilities, not present capabilities.

## Relationship to the Master Libraries

- **SML — Strategic Master Library:** philosophy and strategic doctrine.
- **CML — Complete Master Library:** engineered capabilities, repair, and harvesting machinery.
- **LML — Living Master Library:** continuously maintained truth surfaces.
- **CoML — Collective Master Library:** canonical multi-guide archive and ecosystem memory.

## Preservation rule

If CoML cannot show exactly which source guide and content hash contributed to an archive, that archive is not canonical.

<!-- END LOSSLESS SOURCE: collective-master-library/FOUNDERS-GUIDE.md -->

# Consistency report

Deterministic cross-check of versions and test counts stated across the guides above, compared with each other and with the catalog. History sections are excluded. 41 claims checked.

**Result:** no disagreements found.

# Collective provenance appendix

This archive is a container of canonical sources, not a replacement for them. A future synthesis layer may derive cross-project intelligence, but it must cite these source boundaries and may not silently alter local truth.
