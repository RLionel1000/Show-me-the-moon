# V1 Release Checklist

Use this checklist before treating a V1.x build as production-ready.

## Product baseline

- `lunar_core.html` loads correctly
- `core` mode works as a neutral viewer
- `islamic` template activates correctly
- switching modes does not corrupt persisted state

## Astronomy baseline

- Moon and Sun positions update correctly when location changes
- time-lapse updates stay coherent
- prayer times still align with the current location and date
- moon visibility status still updates correctly

## UI baseline

- desktop layout works
- mobile layout works
- language switch works
- prayer panel still behaves correctly in Islamic mode
- share and donation flows do not break the main UX

## Diagnostics baseline

- `window.__LUNAR_TEMPLATE_RUNTIME__` is available
- `window.__LUNAR_V1_DIAGNOSTICS__()` returns a valid snapshot
- no obvious spike in fetch failures or low-end fallback behavior

## Regression checks

```bash
node tests/smoke/template-runtime.smoke.mjs
node tests/smoke/v1-runtime-diagnostics.smoke.mjs
node tests/unit/astro-engine.test.mjs
node tests/run-v1-checks.mjs
```

## Architecture gate

- no new domain-specific behavior was added to the neutral core without justification
- no new template-specific rule was hardcoded into the host shell if an extraction seam was available
- docs were updated if boundaries changed

