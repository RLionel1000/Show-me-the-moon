export function isPointInRing(lon, lat, ring) {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i][0]);
    const yi = Number(ring[i][1]);
    const xj = Number(ring[j][0]);
    const yj = Number(ring[j][1]);
    if (!Number.isFinite(xi) || !Number.isFinite(yi) || !Number.isFinite(xj) || !Number.isFinite(yj)) continue;

    const intersects = ((yi > lat) !== (yj > lat)) &&
      (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isPointInPolygon(lon, lat, polygonCoords) {
  if (!Array.isArray(polygonCoords) || !polygonCoords.length) return false;
  const outer = polygonCoords[0];
  if (!isPointInRing(lon, lat, outer)) return false;

  for (let i = 1; i < polygonCoords.length; i += 1) {
    if (isPointInRing(lon, lat, polygonCoords[i])) return false;
  }
  return true;
}

export function isPointInGeometry(lon, lat, geometry) {
  if (!geometry || !geometry.type || !geometry.coordinates) return false;
  if (geometry.type === 'Polygon') {
    return isPointInPolygon(lon, lat, geometry.coordinates);
  }
  if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      if (isPointInPolygon(lon, lat, poly)) return true;
    }
    return false;
  }
  return false;
}

export function findCountryForPoint(lon, lat, featureCollection) {
  if (!featureCollection || !Array.isArray(featureCollection.features)) return null;
  for (const feature of featureCollection.features) {
    if (isPointInGeometry(lon, lat, feature && feature.geometry)) {
      return feature.properties || null;
    }
  }
  return null;
}
