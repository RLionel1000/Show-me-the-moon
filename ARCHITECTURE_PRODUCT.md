# Architecture - Product View

## Product statement

Show me the moon is a web application that lets users simulate the sky from a place and a time, while supporting domain-specific experiences through templates.

The first live experience is a lunar and solar observation interface with an Islamic template layered on top.

## What the user gets today

- a real-time 3D astronomical viewer
- Moon and Sun tracking
- location and date/time controls
- GPS and city-based navigation
- cinematic travel between places
- time-lapse simulation
- multilingual UI
- prayer times and Islamic landmarks when the `islamic` template is active

## Product boundary

The product is not defined as "the Islamic app".
The product is defined as:

- a reusable astronomical platform
- shipped today with one built-in domain template

This distinction matters because future templates should be able to add their own places, widgets, and panels without changing the core identity of the project.

## Business and open-source value

This architecture creates two kinds of value at once:

- a reusable open-source core
- a path for differentiated end-user experiences through templates

## Product promise

- `Core` stays generic
- templates stay expressive
- the host app remains production-oriented
- future evolution should not require a rewrite of the astronomical nucleus

## Immediate product priority

Keep V1 stable while moving toward a true `Core / Template / Host App` structure.
