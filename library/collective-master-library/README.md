# Collective Master Library

**The ecosystem remembers itself.**

Collective Master Library (CoML) creates one canonical archive from the Founder’s Guides of a project family without destroying their provenance. It is a roll-up layer, not a replacement for local guides.

## What it does

- discovers the Living Master Library Founder’s Guide, every installed module Founder’s Guide, and its own Founder’s Guide
- fingerprints every source with SHA-256
- preserves every guide losslessly in the collective Markdown and in immutable source snapshots
- creates a deterministic source register and ecosystem map
- produces a responsive, print-ready HTML reading view that renders each guide and carries the full source register
- writes a machine-readable manifest of source paths, versions, hashes, sizes, and word counts
- `verify` reports CURRENT, STALE (a guide or module version changed, was added or removed) or DAMAGED (a snapshot, the combined Markdown or the HTML is missing or no longer matches its recorded hash)
- `check` cross-checks declared versions, versions stated for other products, test counts and table totals across all guides and the catalog, with file and line for every disagreement; each build includes the report
- never upgrades a local guide’s certainty merely because it entered the collective archive

## Usage

```bash
coml build --source-root /path/to/living-master-library --out ./collective
coml verify --source-root /path/to/living-master-library --out ./collective
coml sources --source-root /path/to/living-master-library
coml check --source-root /path/to/living-master-library
```

Inside Living Master Library the same engine is exposed as:

```bash
living collective build
living collective status
living collective verify
living collective sources
living collective check
```

## Output

```text
.collective/
├── COLLECTIVE-MASTER-LIBRARY.md
├── COLLECTIVE-MASTER-LIBRARY.html
├── COLLECTIVE-MANIFEST.json
└── sources/
    └── <source>-<sha256-prefix>.md
```

The combined archive intentionally retains repeated local context. Exact repetition is safer than a lossy synthesis pretending to be canonical. Higher-order synthesis can be added later, but it should be a derived view that cites the lossless archive.
