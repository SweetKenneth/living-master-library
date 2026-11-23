# Changelog

## 1.3.2 — One repository

- The whole family now lives in one repository, `SweetKenneth/living`. Every `package.json` (Library, livingcore, CoML and all five modules) points there, with its folder in `repository.directory`, so each package still links to its own source on npm.
- Cross-links between LivingPress, LivingChangelog and livingcore READMEs, which pointed at separate placeholder repositories, now point to their folders in the one repository. Clone instructions updated to match.
- "Built by" and "maintained by" lines filled in. The live-example, hire-me and showcase rows in the LivingPress and LivingChangelog READMEs are still placeholders on purpose: they need real links.

## 1.3.1 — Self-run fix

- Ran LivingGuide against the Library itself. Its scanner, and LivingDocs', walked the Library's own `.living/` directory (they only skipped their standalone `.livingguide/` and `.livingdocs/` folders). A prior generated edition, a state file or the project config could be ingested as evidence for the next build: the truth engine citing itself. Both now skip `.living/`, matching LivingRoadmap. **LivingGuide 1.0.2, LivingDocs 1.0.2.**
- 3 new Library self-tests, one per scanning module, plant a prior edition and state file under `.living/` and fail if either is scanned.
- Package metadata now names the author (Kenneth E. Sweet Jr., kesjr.com) in every package. Repository and homepage fields stay as placeholders until a public repository exists.
- **Collective Master Library 1.1.1.** The consistency check now reads `Edition:` and `Canonical status:` lines as a guide's own version, not just `Version:`. It immediately caught LivingDocs' guide still calling itself the 1.0.1 edition. 1 new CoML self-test.
- Full baseline: 548 passing checks.

## 1.3.0 — Consistency

- **Collective Master Library 1.1.0.** The archive now includes CoML's own Founder's Guide, so the layer that keeps the ecosystem's memory is documented by the same rules (7 sources).
- New deterministic cross-guide consistency check: `living collective check` / `coml check`. It compares declared versions, versions stated for other products, test counts and table totals across every guide and against the catalog, skips history sections, and reports file and line for each claim. Every build writes the report into the Markdown, HTML and manifest. It never edits a guide.
- **LivingGuide 1.0.1.** Its Founder's Guide grew from a 385-word thesis into the full 18-section Founder Archive its own `founder` preset produces, including Confirmed mechanics, honest weaknesses and a resumption section. All original text is kept. No engine changes.
- 2 new Library self-tests: shipped guides must agree with each other and the catalog, and every module's package version must match the catalog. 9 new CoML self-tests. Full baseline: 544 passing checks.

## 1.2.1 — Collective archive fixes

- **Collective Master Library 1.0.1.** `verify` now checks the archive itself, not only the source guides. An edited or deleted snapshot, combined Markdown or HTML file reports **DAMAGED** instead of CURRENT. A module version change without a guide edit reports **STALE**.
- The collective HTML now renders each Founder’s Guide (headings, tables, lists, code, links) instead of printing raw Markdown inside `<pre>`, and carries the full source register with complete SHA-256 hashes. Raw HTML in a guide is escaped and only http(s), site-relative and in-page links are kept.
- The combined Markdown now holds every guide byte-for-byte between its source markers. 1.0.0 trimmed leading and trailing whitespace, so "lossless" was not strictly true.
- Word counts are formatted with a fixed locale, so the same inputs build the same archive on any machine.
- The CoML manifest and CLI read their version from `package.json`; the Library CLI and `.living/library.json` read theirs from the catalog. No more hand-synced version strings.
- Removed a stray `modules/livingroadmap/livingroadmap-1.0.0.tgz` from the npm package and excluded nested tarballs from future packs.
- README architecture diagram now shows all five modules (it had four branches).
- 3 new Library self-tests, including one that fails the release if the shipped `collective-archive/` is stale or damaged. 12 new CoML self-tests. Full baseline: 533 passing checks.

## 1.2.0 — Collective Master Library

- Added Collective Master Library 1.0.0 as the provenance-preserving ecosystem archive layer.
- Added `living collective build|status|verify|sources`.
- Collective builds ingest the LML Founder’s Guide plus every registered module Founder’s Guide.
- Added SHA-256 source fingerprints, content-addressed snapshots, a machine-readable manifest, lossless combined Markdown, and print-ready HTML.
- Added drift verification so a changed, added, or removed Founder’s Guide makes the prior collective archive stale.
- CoML remains separate from the five Living runtime truth modules.

## 1.1.0 — LivingRoadmap joins the Library

- Added LivingRoadmap 1.0.0 as the fifth product module.
- Added evidence-aware roadmap reconciliation, roadmap drift auditing, decision history, stale intent, unplanned work, and explicit shipping confirmation.
- Added `living roadmap` routing, configuration, core-integrity coverage, and umbrella self-tests.
- Updated the one-install package and Founder’s Guide for the five-module Library.


## 1.0.0 — Living Master Library

- Introduced the one-install Living Master Library distribution.
- Bundled livingcore 1.0.0, LivingPress 1.2.0, LivingChangelog 1.2.0, LivingGuide 1.0.0, and LivingDocs 1.0.1.
- Added the unified `living` / `living-master-library` CLI.
- Added project-scoped `.living/` control-plane state.
- Added module enable/disable and configuration template management.
- Added shared AI/database/secret environment aliases with module-specific override precedence.
- Added unified status, environment-presence, doctor, test, and audit commands.
- Added Library-level livingcore hash comparison across all bundled products.
- Patched the bundled LivingPress setup wizard so the umbrella can write project-local configuration safely, including paths containing spaces.
- Added 27 Library-level self-tests; full bundled baseline is 433 passing checks.
