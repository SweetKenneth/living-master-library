# Contributing to LivingGuide

LivingGuide's primary invariant is simple: **uncertainty must never be silently upgraded into certainty.**

Before submitting a change:

```bash
npm test
npm run typecheck
npm run build
```

## Boundaries

- Do not add a feature that lets model output bypass `sanitizeClaim`.
- Do not weaken the exact-quote requirement for `confirmed` / `observed` claims without an equally strong deterministic replacement.
- Do not make deleted or changed evidence leave dependent certainty untouched.
- Do not put credentials or secrets into examples/tests.
- Do not edit files under `core/` directly. They are vendored from livingcore.
- Changing the LivingGuide receipt payload invalidates historical receipts and requires an explicit migration/version strategy.

## Tests expected for truth-model changes

Add coverage for both the intended path and an adversarial path: unsupported evidence, stale sources, malformed model JSON, secret-like data, contradictory claims, or broken receipt history as applicable.
