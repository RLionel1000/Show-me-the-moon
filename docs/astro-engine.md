# Astro Engine

This document describes the neutral astronomy engine under `src/core/astro/`.

## Scope

The engine is local-first and front-end friendly.
It computes astronomical state from:

- UTC timestamp
- latitude
- longitude
- optional atmospheric values

## What it produces

The engine can provide:

- Sun state
- Moon state
- planet state
- star state
- cached Sun event calculations
- cached Moon rise/set calculations

## Architectural role

This engine is part of the neutral `Core`.
It must stay reusable and free from template-specific meaning.

That means:

- no prayer rules in the engine
- no Islamic landmarks in the engine
- no host-app layout logic in the engine

## Current API shape

See `src/core/astro/engine.mjs` for the concrete implementation.
The main entry point is `createAstroEngine(options)`.

Current responsibilities include:

- snapshot computation
- cache management
- Sun event computation
- Moon rise/set computation
- cache statistics exposure

## Quality expectations

Changes to the engine must preserve:

- deterministic input/output contracts
- geometry coherence across Sun and Moon calculations
- cache correctness
- compatibility with host diagnostics and render usage

## Verification baseline

Useful checks:

```bash
node tests/unit/astro-engine.test.mjs
node tests/run-v1-checks.mjs
```

## Design rule

If a new need is astronomical and reusable, it likely belongs here.
If it is domain-specific or template-specific, it likely does not.
