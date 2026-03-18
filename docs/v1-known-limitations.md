# V1 Known Limitations

This file lists current limitations of the V1 production baseline.

## Architecture

- The host app is still heavily concentrated in `lunar_core.html`.
- The intended `Core / Template / Host App` boundary exists, but is not fully enforced yet.
- Some Islamic behavior still leaks into host-level code paths.

## Runtime model

- Templates currently execute in the same JavaScript context as the host app.
- Capability enforcement is lightweight and not a security boundary.
- The built-in `core` template is still minimal compared with the intended long-term contract.

## Operations

- The application is front-end only.
- External geodata helpers depend on runtime network availability and external service health.
- Donation links are deployer-configured, not centrally managed.

## Maintainability

- Some modules exist in both `.js` and `.mjs` forms.
- The monolithic host shell makes feature ownership harder to reason about.
- Some comments or file fragments show encoding cleanup debt.

## Product scope

- Template authoring is not yet a polished public workflow.
- The first built-in template is Islamic; additional templates are still an architecture goal, not an established product reality.

