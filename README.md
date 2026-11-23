<div align="center">

# 🌿 Living Master Library

**Open-source systems that keep important things true over time.**

[![License: MIT](https://img.shields.io/badge/license-MIT-2f5d46.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-1.3.2-d9822b.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.6-2f5d46.svg)
![Dependencies](https://img.shields.io/badge/runtime%20deps-0-2f5d46.svg)
![Tests](https://img.shields.io/badge/self--tests-548%20passing-2f5d46.svg)

[Website](#website) · [Install](#install) · [Modules](#modules) · [Full docs](library/README.md) · [Founder's Guide](library/FOUNDERS-GUIDE.md)

</div>

---

One install, one `living` command, and a family of engines that watch your docs, roadmap, release notes and publishing — and repair them when reality drifts.

## Modules

| Command | Module | Version | Keeps true |
|---|---|---:|---|
| `living press` | LivingPress | 1.2.0 | Published articles that correct themselves |
| `living changelog` | LivingChangelog | 1.2.0 | Release notes that only claim what shipped |
| `living guide` | LivingGuide | 1.0.2 | A provenance-backed Owner's Manual |
| `living docs` | LivingDocs | 1.0.2 | Technical docs vs. implementation evidence |
| `living roadmap` | LivingRoadmap | 1.0.0 | Plans vs. shipping reality |
| `living collective` | Collective Master Library | 1.1.1 | One lossless archive of every guide |

All built on **livingcore 1.0.0**: receipts, model failover, circuit breaker, leases, rate defense, safe Markdown.

## Install

Requires **Node 22.6+**. Zero runtime npm dependencies.

```bash
# from the repo
git clone https://github.com/SweetKenneth/living.git
cd living/library
npm install -g .
living init
living doctor
```

Or download `living-master-library-1.3.2.tgz` from the website / `public/downloads/` and run `npm install -g ./living-master-library-1.3.2.tgz`.

## The design rule

```text
observe reality → establish evidence → make a bounded claim → challenge the claim
→ publish or preserve state → detect drift → repair without erasing history
```

## Repository layout

```text
library/            The Living Master Library source (CLI, core, modules, tests)
src/                The project website (TanStack Start + Tailwind)
public/downloads/   Release downloads served by the website (.zip, .tgz)
```

## Website

The landing page lives in `src/`. Run it locally:

```bash
npm install
npm run dev
```

## Verify

```bash
cd library
npm test          # Library self-test
living audit      # every module's self-test
```

## License

[MIT](LICENSE) © 2026 Kenneth E. Sweet Jr. Each bundled module retains its own MIT license.
