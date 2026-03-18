# Muslim Orgs By Country

This document describes the role of `assets/world/muslim_orgs_by_country.json`.

## Purpose

The dataset is a support dataset for Islamic template and host-app geographic flows.
It is not part of the neutral astronomy core.

## Expected use

Possible uses include:

- selecting prayer calculation defaults by region
- providing culturally relevant context by country
- supporting future template-level onboarding or guidance

## Architecture rule

If the data drives Islamic behavior, keep the business interpretation in the Islamic template or in a clearly named template-support module.
Do not bake the meaning of this dataset into the neutral core.

## Maintenance rule

When changing the structure of this dataset, update:

- the consuming code
- this document
- any user-facing behavior that depends on the schema
