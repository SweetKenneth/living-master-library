# Contributing to LivingDocs

LivingDocs is evidence-first. Contributions that make generated documentation sound more confident without improving evidence are regressions.

## Rules

- Do not patch vendored files in `core/`; change livingcore and re-sync it.
- New behavior claims must preserve the distinction between implementation evidence and documentation evidence.
- Deterministic truth gates must not be bypassable by model output.
- Secret handling tests are mandatory for changes that ingest or render text.
- New source adapters must preserve provenance and stable external IDs.
- A new documentation surface should add tests for source drift, unsupported certainty and rendered-output safety.

Run before submitting:

```bash
npm test
tsc -p tsconfig.json
tsc -p tsconfig.build.json
```
