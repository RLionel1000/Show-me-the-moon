# Show me the moon

Show me the moon is an open-source web application that started as a very simple single-page HTML experiment and gradually grew into a much larger product.

My initial goal was to offer a new visualization tool to the Muslim community:

- a way to explore the Moon and the sky from a real date, time, and location
- a more visual and intuitive experience around orientation, prayer-related context, and astronomical understanding
- a tool that could later evolve into a broader, reusable astronomy platform

This version is also the result of my work during Ramadan 2026.
I wanted this project to be both a technical creation and a sincere contribution, however modest, to a community that is very dear to my heart.

At the same time, the project also has a universal scope and is meant to be open to everyone.
The interface can be used in a fully neutral way by disabling the `Prayers` and `Muslim holy places` options, for anyone who prefers a non-confessional experience focused only on astronomy and sky visualization.

As the project grew, it moved beyond that first scope and became a more general front-end architecture built around:

- a neutral astronomical core
- a host application that renders and orchestrates the experience
- templates that add domain-specific places, widgets, panels, and rules

The current production baseline is the V1 saved on 2026-03-09.
This repository is the starting point for all future production changes.

## Product definition

Show me the moon is not only a moon viewer.
It is a reusable front-end platform for:

- simulating sky state from date, time, latitude, and longitude
- rendering the Moon, Sun, planets, stars, and horizon context in real time
- exposing a template layer for domain-specific experiences

The first built-in template is `islamic`.
It adds:

- the three major Muslim landmarks used in the product today
- prayer times
- prayer calculation methods
- Islamic orientation and guidance widgets

The neutral `core` mode is intended to remain reusable and open source.
The `islamic` mode is intended to be only one template among others.

## Project story

This repository reflects a real product evolution, not a clean-room rewrite.

The project started from a lightweight one-page app.
Then, feature after feature, it expanded into:

- sky simulation
- Moon and Sun tracking
- travel and location flows
- prayer times and method selection
- multilingual UI
- template-based domain behavior

That history matters because it explains the current shape of the codebase:

- the product is already rich and functional
- the architecture has already started to be extracted
- the remaining monolith is the result of growth, not of a lack of direction

This repository is the current production-oriented version.
The long-term goal is to keep the product value while progressively moving toward a cleaner, more disciplined architecture.

## Personal note

For this first public version, I also want this repository to carry a simple and heartfelt message:

Eid Mubarak to all my brothers and sisters.
May Allah accept your month of fasting and your invocations.

## SEO keywords

Suggested search keywords for repository indexing and discovery:

- Aïd 2026
- Eid 2026
- Ramadan 2026
- ramadan 2026 end of ramadan 2026
- fin du Ramadan 2026
- end of Ramadan 2026
- prayer times 2026
- moon visibility
- astronomy web app

## Current code reality

The repository already contains the three strategic layers, but they are not yet fully separated.

- `Core`: astronomy engine and template runtime in `src/core/`
- `Templates`: built-in `core` and `islamic` templates in `src/templates/`
- `Host App`: the current production app, still largely orchestrated from `lunar_core.html`

The next architecture work must move more business logic out of `lunar_core.html` without breaking production behavior.

## Source of truth

Current runtime entry point:

- `lunar_core.html`

## Privacy and local-first usage

The application runs entirely in the user's browser.

- no account is required
- no login is required
- no server-side user profile is needed
- no sensitive personal data is required to use the app

In practice, this means the project is easy to install and run locally with a simple static server.
It is designed first as a browser application, not as a platform that depends on user accounts or private back-end data.

## Quick start

Requirements:

- Node.js 18+

Open the app locally:

1. Serve the repository root with any static server
2. Open `index.html` or `lunar_core.html` in the browser

Run the baseline validation suite:

```bash
node tests/run-v1-checks.mjs
```

Recommended working loop:

1. make a focused change
2. run `node tests/run-v1-checks.mjs`
3. manually verify the touched UI flow in the browser

Main technical areas:

- `src/core/astro/`: local astronomy engine
- `src/core/template-runtime.mjs`: template lifecycle and capabilities
- `src/templates/core/template.mjs`: neutral built-in template
- `src/templates/islamic/template.mjs`: first domain template
- `src/legacy/template-mode-adapter.mjs`: compatibility bridge around persisted mode state

## Strategic direction

The project now follows this rule:

1. Keep `Core` neutral and reusable.
2. Move business/domain logic into templates.
3. Let the host app render and orchestrate, but not own domain rules.
4. Refactor progressively from the monolith instead of rewriting production from scratch.

## Operating priorities

All three remain active priorities:

- reliability and production safety
- architecture extraction and cleanup
- feature delivery

The working order is:

1. stabilize the production baseline
2. extract the minimum architecture needed for scale
3. add future features on the extracted structure

## Local validation

Useful commands:

```bash
node tests/smoke/template-runtime.smoke.mjs
node tests/smoke/v1-runtime-diagnostics.smoke.mjs
node tests/perf/template-runtime.perf.mjs
node tests/unit/astro-engine.test.mjs
node tests/run-v1-checks.mjs
```

## Runtime diagnostics

The app exposes two debug entry points:

- `window.__LUNAR_TEMPLATE_RUNTIME__`
- `window.__LUNAR_V1_DIAGNOSTICS__()`

## Repository map

Main directories:

- `src/app/`: extracted host-app modules and controllers
- `src/core/`: astronomy engine, diagnostics, runtime, and shared primitives
- `src/templates/`: built-in templates
- `tests/`: smoke, unit, and perf checks
- `docs/`: architecture notes, specs, and operating documents
- `assets/`: textures, vendor libraries, datasets, and UI media

Files worth opening first:

- `README.md`
- `CONTRIBUTING.md`
- `lunar_core.html`
- `src/core/template-runtime.mjs`
- `src/app/prayer-panel.mjs`
- `src/app/travel-controller.mjs`

## Documentation map

Architecture:

- `ARCHITECTURE_PRODUCT.md`
- `ARCHITECTURE_DEV.md`
- `ARCHITECTURE_STAFF.md`
- `ARCHITECTURE_EXPLAINED.md`

Core and engine:

- `docs/core-api.md`
- `docs/astro-engine.md`
- `docs/moon-rendering-spec.md`
- `docs/refactor-plan-mvp.md`

Operations:

- `docs/v1-release-checklist.md`
- `docs/v1-known-limitations.md`
- `docs/v1-bug-triage.md`

Data and attribution:

- `docs/world-data-pack-full.md`
- `docs/muslim-orgs-by-country.md`
- `docs/planet-image-attribution.md`
- `docs/citation-rules.md`
- `assets/moon/README.md`

## Third-party components and data

The project code is distributed under the MIT license, with copyright held by Lionel R.
Some bundled third-party code, data, or media keep their own attribution or redistribution context.

Runtime libraries:

- Three.js: `assets/vendor/three/`
- SunCalc: `assets/vendor/suncalc/`

Bundled media and data:

- Moon textures and metadata in `assets/moon/`
- Planet tooltip textures in `assets/planets/` from the JPL Solar System Simulator texture map collection
- World and travel datasets in `assets/world/`

Attribution references to keep when redistributing:

- `docs/planet-image-attribution.md`
- `docs/citation-rules.md`
- `assets/moon/README.md`
- `legal/credits.html`

External services used by the host app at runtime may include:

- Geoapify
- GeoNames
- BigDataCloud

## Contribution baseline

When contributing:

- keep the core domain-neutral
- keep template logic out of the core
- avoid breaking the production baseline
- localize all user-facing strings
- update docs when architecture or contracts move

See `CONTRIBUTING.md` for working rules.

