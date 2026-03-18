# Moon Rendering Specification

## Scope

This specification covers the Moon and Sun rendering behavior currently implemented by the host application and the expectations that must survive future refactors.

## Product intent

The user should perceive one coherent system where:

- Moon visibility follows observer place and time
- sunlight, lunar phase, eclipse-like effects, and sky tint remain synchronized
- visual fidelity can be adjusted for performance without breaking the model

## Required invariants

- the Moon and Sun must derive from the same astronomical state
- Moon illumination must track Sun-Moon geometry consistently
- horizon and sky transitions must stay aligned with the current observer context
- rendering shortcuts must not desynchronize visible status and numerical status

## Architecture rule

Rendering logic may live in the host app or extracted render modules, but the astronomical truth must come from the neutral core inputs and outputs.

## Refactor rule

When moving render code out of `lunar_core.html`, preserve:

- Moon illumination correctness
- Sun alignment
- eclipse-related visual gates already used by the product
- sky and horizon continuity during travel and time-lapse
- low-end fallback compatibility

## Validation ideas

Check at least these cases after meaningful render work:

- low Moon near horizon
- bright daytime sky with visible Sun behavior
- night sky with stars and planets visible
- time-lapse transitions across sunrise and sunset
- Islamic mode with prayer panel active while render loop remains responsive

