# Architecture - Developer View

## 1. Current shape

The production application is currently an architectural hybrid.

- `lunar_core.html` contains the main host application shell
- `src/core/astro/` contains the reusable astronomy engine
- `src/core/template-runtime.mjs` contains the first reusable template lifecycle layer
- `src/templates/` contains built-in templates
- `src/legacy/template-mode-adapter.mjs` keeps compatibility around persisted template mode

## 2. Canonical layering

Use this mental model for every change:

### Core

Owns:

- astronomy calculations
- template lifecycle
- capabilities
- diagnostics primitives
- reusable rendering primitives
- reusable UI primitives only

Must not own:

- Islamic rules
- prayer-specific UI
- template-specific landmarks
- hardcoded business copy

### Template

Owns:

- landmarks
- business calculations
- template settings
- domain widgets and panels
- domain-specific copy and behavior

### Host App

Owns:

- page bootstrap
- layout shell
- local persistence wiring
- mobile shell behavior
- external API wiring
- page-level interaction flow

## 3. Reality gap

The largest architecture gap is that `lunar_core.html` still owns too much template-specific behavior.

That is acceptable for V1, but it is the main extraction target for V1.x.

## 4. Code reading map

Primary files:

- `lunar_core.html`
- `src/core/template-runtime.mjs`
- `src/core/v1-diagnostics.mjs`
- `src/core/astro/engine.mjs`
- `src/templates/core/template.mjs`
- `src/templates/islamic/template.mjs`
- `src/legacy/template-mode-adapter.mjs`

## 5. Refactor priority

Extract in this order:

1. template-specific host logic
2. host app state and service wiring
3. generic UI shell pieces
4. rendering orchestration helpers
5. only then deeper structural cleanup

## 6. Rule for new features

If a new feature is generic, place it in `core` or a generic host module.
If it serves one domain only, place it in the relevant template.
If the host currently lacks the right seam, create the seam instead of hardcoding again in `lunar_core.html`.

## 7. Diagnostics rule

While refactoring, preserve:

- `window.__LUNAR_TEMPLATE_RUNTIME__`
- `window.__LUNAR_V1_DIAGNOSTICS__()`

Architecture cleanup must not reduce debuggability.

