# Contributing to Show me the moon

## Project doctrine

Show me the moon now follows a strict product and architecture rule set:

- `Core` must stay neutral, reusable, and open source
- domain logic belongs in templates
- the host app should orchestrate and render, not own business rules
- production safety comes before broad refactors
- refactors are expected to be incremental and behavior-preserving

## Contribution categories

Every change should clearly fall into one of these buckets:

- core
- template
- host app
- docs
- tests
- data

If a change touches several buckets, explain why.

## Non-negotiable engineering rules

- Do not move domain logic into `src/core/`.
- Do not add new product behavior directly into `lunar_core.html` if an extracted module is the right home.
- Do not hardcode new user-facing strings outside the i18n system.
- Do not introduce backend assumptions into V1 unless explicitly approved.
- Do not break `core` neutrality in order to help one template.

## Architecture intent

Target layering:

1. `Core`
   Astronomy, template lifecycle, diagnostics, generic rendering and generic UI primitives.
2. `Template`
   Landmarks, widgets, settings, overlays, business rules, domain copy.
3. `Host App`
   Bootstrap, layout wiring, persistence, external services, runtime shell.

## Pull request expectations

A good contribution includes:

- the problem being solved
- the impacted layer
- the tradeoff made
- any runtime or migration risk
- documentation updates when contracts changed

## Testing baseline

Run the most relevant checks before proposing a change.
Minimum useful commands:

```bash
node tests/smoke/template-runtime.smoke.mjs
node tests/smoke/v1-runtime-diagnostics.smoke.mjs
node tests/unit/astro-engine.test.mjs
node tests/run-v1-checks.mjs
```

If a change affects rendering, performance, or template lifecycle, note what was or was not verified.

## Template contributions

If you add or evolve a template:

- declare only the capabilities you need
- keep business logic inside the template package
- keep the host integration generic
- expose settings and services through documented template interfaces
- avoid coupling the template to one hardcoded page layout

## Documentation duty

Update docs when you change:

- template contract
- diagnostics shape
- dataset semantics
- release process
- architecture boundaries

## Attribution and reuse

If you publish a fork or derivative:

- keep `LICENSE`
- keep third-party notices
- credit Show me the moon in your README
- summarize your changes clearly

See `docs/citation-rules.md`.

