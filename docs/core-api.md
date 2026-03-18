# Core API

This document defines the intended contract between the neutral core, templates, and the host application.

## 1. Philosophy

The core exists to be reused.
It must not assume one religion, one business domain, or one UI identity.

Templates exist to specialize the experience.
The host app exists to compose and operate the runtime in production.

## 2. Runtime model

- exactly one template is active at a time
- the host application boots the runtime
- the host application may expose diagnostics and host services
- the active template receives a controlled context

## 3. Minimum template contract

A template registers with:

- `id`
- `displayName`
- `capabilities`
- `createTemplate(context)`

A template instance may expose:

- lifecycle hooks
- config metadata
- services for host consumption
- panel, widget, action, or overlay registrations through the context

## 4. Current lifecycle hooks

- `onInit`
- `onLocationTimeChange`
- `onFrame`
- `onDispose`

These hooks already exist in the current runtime.

## 5. Current context abilities

The current runtime already exposes operations around:

- state read access
- capability inspection
- panel registration
- overlay registration
- template-scoped storage
- event subscription
- metrics emission

## 6. Direction for the next contract revision

The runtime should evolve so templates can cleanly own:

- widgets
- settings
- actions
- panel definitions
- overlay groups
- template metadata needed by the host shell

## 7. Capability doctrine

Capabilities should remain explicit and narrow.
A template should ask only for what it needs.

Current capability families include concepts such as:

- `ui.panel`
- `overlay.landmarks`
- `overlay.lines`
- `storage.local`
- `network.http`

## 8. Error model

V1 uses same-context execution with runtime try/catch protection.
This is acceptable for the current phase, but should not be treated as a hard isolation boundary.

## 9. Stability rule

Changing the template contract requires:

- updating runtime code
- updating built-in templates
- updating this document
- updating any relevant smoke or unit checks
