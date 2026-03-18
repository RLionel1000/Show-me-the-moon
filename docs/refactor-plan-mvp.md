# Refactor Plan - MVP to V1.x

This plan aligns the codebase with the agreed architecture without rewriting production from scratch.

## Goal

Move from a monolithic host shell toward a clear structure:

- `Core`
- `Template`
- `Host App`

## Rule of engagement

Refactor only through behavior-preserving steps.
Every extraction must keep the production baseline shippable.

## Phase 1 - Protect and map

- preserve current diagnostics
- preserve smoke and unit checks
- document current ownership of major features
- stop adding new domain logic directly in `lunar_core.html`

## Phase 2 - Extract template leakage

Target first:

- Islamic guide state and actions
- prayer-panel ownership
- template-specific settings
- template-specific widget registration

Objective:

The host should stop owning Islamic business decisions.

## Phase 3 - Harden template contract

Extend the runtime so templates can define or register:

- widgets
- panels
- settings
- actions
- overlay groups
- host-visible services

Objective:

Future templates should not require custom host hacks to become first-class.

## Phase 4 - Slice the host app

Move host concerns into modules such as:

- bootstrap
- state
- travel
- i18n
- services
- render orchestration
- template bridge

Objective:

Reduce the role of `lunar_core.html` to markup shell plus bootstrap wiring.

## Phase 5 - Consolidate runtime artifacts

- reduce `.js` / `.mjs` duplication
- normalize diagnostics wiring
- tighten test coverage around extracted seams

## Done means

This refactor direction is successful when:

- the `core` template is genuinely neutral
- the `islamic` template can evolve largely in its own area
- a third template can be introduced with a predictable amount of work
- production regressions do not spike during extraction

