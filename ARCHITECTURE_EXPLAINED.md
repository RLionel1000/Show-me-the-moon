# Architecture Explained

This repository uses one product vision expressed at three levels.

## Read this first

Show me the moon is organized around three layers:

1. `Core`
   Neutral astronomy and reusable runtime primitives.
2. `Template`
   Domain-specific landmarks, widgets, panels, and rules.
3. `Host App`
   The current web application that renders, persists, localizes, and wires services.

## Which architecture document to read

- `ARCHITECTURE_PRODUCT.md`: plain-language product view
- `ARCHITECTURE_DEV.md`: implementation-oriented developer view
- `ARCHITECTURE_STAFF.md`: deeper technical view with risks and migration priorities

## Current reality

The production baseline is still hosted mainly in `lunar_core.html`.
The architecture target is not a rewrite, but a staged extraction that protects production behavior.

## What changed in our doctrine

The main decision is now explicit:

- `core` is the reusable open-source nucleus
- `islamic` is a template, not the default identity of the whole architecture
- future templates must be first-class citizens

