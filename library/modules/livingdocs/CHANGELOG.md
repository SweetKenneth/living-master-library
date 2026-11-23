# Changelog

## 1.0.2 — 2026-10-03

### Fixed
- The local scanner now skips `.living/`, the Living Master Library control directory, as well as `.livingdocs/`. Under the Library, generated docs and state were being scanned as implementation evidence.

### Changed
- `package.json` author filled in.

## 1.0.1 — 2026-10-02

Founder archive patch.

### Added

- canonical `FOUNDERS-GUIDE.md` built from the actual LivingDocs repository and truth/audit architecture
- premium standalone `FOUNDERS-GUIDE.html` with linked table of contents, responsive layout and print styling
- source-grounded architecture dossier, feature inventory, continuity plan, risks, roadmap and strategic analysis
- explicit unknowns and valuation restraint where market, deployment or adoption evidence is absent

### Changed

- package/CLI version advanced to 1.0.1
- npm payload now includes both Founder’s Guide formats

## 1.0.0 — 2026-10-02

Initial LivingDocs release.

### Added

- persistent documentation truth model with exact evidence provenance
- implementation-vs-documentation evidence distinction
- deterministic rejection of documentation-only proof for confirmed behavior claims
- code/config/test/schema/OpenAPI/GraphQL/Proto-aware local scanning
- incremental source hashing and source-drift contamination of dependent claims
- Developer, API, CLI, Operator and Custom documentation presets
- 16-section maintained documentation edition
- deterministic + model-assisted drift audit
- Documentation Verification test for coverage and implementation alignment
- generated Markdown and responsive/print-ready HTML
- source inventory, claim ledger, unverified/drift queue and health scorecard
- secret-file exclusion, content redaction and generated-output secret scrubbing
- local JSON and PostgreSQL/PostgREST storage adapters
- tamper-evident livingcore run receipts
- CLI commands: init, scan, build, audit, verify, status
- zero runtime npm dependencies
- 108-check self-test suite plus TypeScript build validation
