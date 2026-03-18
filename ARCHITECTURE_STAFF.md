# Architecture - Staff View

## Executive technical read

The repository already contains the correct strategic primitives, but they are not yet fully aligned:

- the astronomy engine is reusable
- the template runtime is real
- the first template is real
- the host app is still too monolithic

This is not a rewrite problem.
It is a boundary-enforcement problem.

## Architectural target

### Layer 1: Core

Stable, neutral, reusable, open-source.

Responsibilities:

- astronomy engine
- lifecycle and diagnostics primitives
- generic rendering utilities
- generic state contracts
- template capability enforcement

### Layer 2: Template

Replaceable, domain-specific, declarative where possible.

Responsibilities:

- landmarks
- widgets
- panels
- business rules
- business calculations
- settings schema
- template-specific actions

### Layer 3: Host App

Product shell and production operator.

Responsibilities:

- bootstrap
- page composition
- local persistence integration
- external geodata integration
- mobile shell behavior
- rendering loop wiring
- template loading and host-template bridge

## Main technical debt

### 1. Host/template leakage

The host app still contains Islamic-specific switches and view logic.
That makes new templates harder to add and makes `core` less trustworthy as a neutral foundation.

### 2. Monolithic orchestration

`lunar_core.html` remains the place where too many concerns meet:

- UI shell
- template orchestration
- time-lapse
- travel
- i18n
- service calls
- render loop
- diagnostics wiring

### 3. Duplicate module formats

`src/core/` contains both `.js` and `.mjs` variants for several modules.
That increases maintenance risk and should be controlled or generated from one source.

## Risk posture

### Acceptable in V1

- monolithic host shell
- partial template migration
- front-end-only runtime

### Not acceptable long term

- business logic spread across host and template layers
- adding more domain features directly in the monolith
- undocumented template contract drift

## Recommended delivery strategy

1. protect current production behavior
2. extract one seam at a time
3. strengthen template contract before adding more templates
4. keep diagnostics and regression checks active
5. only then broaden feature scope

## First extraction targets

- prayer-panel host logic
- Islamic guide visibility and actions
- template settings and widget registration
- template-driven panel configuration
- host service wrappers for geodata and sharing

## Success criteria

The architecture is moving in the right direction when:

- `core` can be explained without mentioning Islam
- `islamic` can evolve without editing neutral engine code
- a third template can be imagined without fighting the host shell
- the production app remains stable during extraction

