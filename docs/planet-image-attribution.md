# Planet Image Attribution

Planet textures in `assets/planets/` are third-party assets and must keep their original attribution context.

## Runtime use

These images are used by the host application for planet tooltip thumbnails and related UI affordances.
They are not used as displacement, normal, or bump maps in the current runtime.

## Source family

The current repository uses replacement texture maps from the JPL Solar System Simulator texture map collection:

- Mercury: JPL Solar System Simulator map
- Venus: JPL Solar System Simulator map
- Mars: JPL Solar System Simulator map from Viking imagery processed at the USGS
- Jupiter: JPL Solar System Simulator representative map
- Saturn: JPL Solar System Simulator representative map
- Uranus: JPL Solar System Simulator representative map
- Neptune: JPL Solar System Simulator representative map

Official reference:

- `https://space.jpl.nasa.gov/tmaps/`

Important note:

- rocky planets such as Mars may have direct imaging or map-processing provenance
- gas giant maps in the JPL collection are representative visual texture maps and should be presented as such
- if a future version needs scientific-grade surface products, review source suitability again before reuse

## Redistribution rule

If you redistribute this repository or a derivative that keeps these files:

- keep the relevant attribution notice in your README or equivalent project documentation
- do not remove upstream credit
- keep a reference to the JPL Solar System Simulator texture maps page
- verify whether your redistribution context requires any additional upstream notice

## Project rule

Do not silently replace attribution-bearing assets with undocumented alternatives.
If assets change, update this file and the main `README.md` together.
