# Changelog

## 1.0.2 — 2026-10-03

### Fixed
- The local scanner now skips `.living/`, the Living Master Library control directory, as well as `.livingguide/`. Under the Library, earlier editions, the state file and project config were being scanned as project evidence.

### Changed
- `package.json` author filled in.

## 1.0.1 — 2026-10-03

### Changed
- Founder's Guide expanded from a short thesis into the full 18-section Founder Archive the `founder` preset produces, including Confirmed mechanics, known weaknesses and a resumption section. All original text is retained. No engine behavior changed.

## 1.0.0 — 2026-10-01

Initial LivingGuide release.

### Added
- canonical project truth model with claim-level provenance and epistemic status
- exact-quote evidence gate for Confirmed/Observed claims
- source drift/deletion contamination of dependent claims
- Founder, Engineering, Operator, Acquisition and Custom guide presets
- 18-section Founder Archive specification
- ARCHIVIST extraction, AUDITOR adversarial validation and CURATOR rendering passes
- deterministic and model-assisted Resurrection Test
- source inventory, unknown queue and audit scorecard in each canonical edition
- responsive, print/PDF-ready archival HTML renderer
- local repository scanner with sensitive-file exclusion and pre-model secret redaction
- second-pass generated-secret scrubber
- programmatic manual/creator-note source adapter
- atomic local JSON persistence
- PostgreSQL/PostgREST private storage option
- hash-chained run receipts via livingcore
- local CLI: init, scan, build, audit, resurrection and status
- vendored livingcore drift protection
- self-test suite covering the truth, continuity, security, persistence and rendering pipeline
