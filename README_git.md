# Show me the moon

Show me the moon is an open-source astronomy web application focused on real-time sky visualization from any date, time, and location.

The project started as a simple one-page HTML experiment and evolved into a larger platform with a reusable architecture.

## What it does

- visualizes Moon, Sun, planets, stars, and horizon context
- simulates sky state from date, time, latitude, and longitude
- supports travel/location flows with cinematic transitions
- provides a modular template layer for domain-specific extensions

## Architecture

The codebase is organized around three main layers:

- Core: neutral astronomy engine and template runtime
- Templates: pluggable domain modules on top of the core
- Host App: rendering and orchestration layer

Current runtime entry point:

- `lunar_core.html`

## Privacy and local-first usage

The application runs entirely in the user's browser.

- no account required
- no login required
- no server-side user profile required
- no sensitive personal data required

This makes the project easy to run locally with a static server.

## Quick start

Requirements:

- Node.js 18+

Run locally:

1. Serve the repository root with a static server
2. Open `index.html` or `lunar_core.html`

Run baseline checks:

```bash
node tests/run-v1-checks.mjs
```

## Repository map

- `src/app/`: host-app modules and controllers
- `src/core/`: astronomy engine, runtime, diagnostics, shared primitives
- `src/templates/`: built-in templates
- `tests/`: smoke, unit, and perf checks
- `docs/`: architecture and specs
- `assets/`: textures, libraries, datasets, and UI media

## Keywords (GitHub)

- moon
- astronomy
- sky-simulation
- webgl
- threejs
- geolocation
- local-first
- privacy-friendly
- open-source
- visualization

## License

This project is distributed under the MIT License.

See `LICENSE` for details.
