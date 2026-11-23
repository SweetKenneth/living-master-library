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
