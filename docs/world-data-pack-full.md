# World Data Pack - Full

This document describes the large world and travel datasets used by the host application.

## Purpose

These datasets support host-app features such as:

- country lookup
- city selection
- cinematic travel destinations
- reverse geo context
- template experiences that depend on geographic metadata

## Main local assets

Under `assets/world/` you will find datasets such as:

- `countries.geojson`
- `countries-lite.geojson`
- `country_boundaries_full.geojson`
- `populated_places.geojson`
- `travel_catalog.json`
- `travel_catalog_full.json`
- `world_catalog_full.json`
- `muslim_orgs_by_country.json`

## Architecture boundary

These datasets belong to the host-app and template-support layer.
They do not define the neutral astronomical core.

A template may consume geographic data, but the data plumbing should stay generic whenever possible.

## Operational note

Large datasets should be loaded and transformed carefully to avoid harming mobile performance.
Prefer:

- lite datasets for interactive startup flows
- richer datasets only where clearly needed
- caching and indexing in host-app service modules

## Attribution note

Some of these files are derived from third-party geographic sources.
Keep attribution updated in `README.md` and `docs/citation-rules.md` when redistributing.
