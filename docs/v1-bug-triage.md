# V1 Bug Triage

Use this triage grid for V1 and V1.x work.

## Severity levels

### P0

Production blocker.
Examples:

- app does not boot
- Moon or Sun positions are clearly broken
- prayer times are unusable in Islamic mode
- template activation crashes the app

### P1

Major regression with a user-visible workaround that is weak or unacceptable.
Examples:

- mobile shell badly broken
- time-lapse unreliable
- travel flow broken for common cases
- language switch incomplete or corrupting UI

### P2

Important but non-blocking defect.
Examples:

- panel state persistence issue
- rendering artifact with limited scope
- inaccurate non-critical label or secondary widget bug

### P3

Low-risk polish issue.
Examples:

- copy inconsistency
- minor alignment issue
- non-critical visual jitter

## Routing logic

When classifying a bug, identify the primary owner:

- `core`
- `template`
- `host app`
- `services`
- `data`

If several layers are involved, write the first failing boundary.

## Required report shape

Every bug report should include:

- steps to reproduce
- expected result
- actual result
- active template
- language if relevant
- device or browser context if relevant
- whether diagnostics show runtime warnings or fallback behavior

## Triage rule

Fix production breakage first.
Do not hide architecture issues inside quick patches when the correct boundary is obvious.
