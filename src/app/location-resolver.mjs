export function createLocationResolver(options) {
  const opts = options || {};
  let lastGeoLat = null;
  let lastGeoLon = null;
  let reverseGeoReqId = 0;
  let geoTimer = null;

  function fetchGeo(lat, lon) {
    if (lastGeoLat !== null && Math.abs(lat - lastGeoLat) < 0.008 && Math.abs(lon - lastGeoLon) < 0.008) return;
    lastGeoLat = lat;
    lastGeoLon = lon;
    const cachedGeo = opts.readReverseGeoCache(lat, lon);
    if (cachedGeo) {
      opts.applyResolvedGeoLocation(lat, lon, cachedGeo.city, cachedGeo.country, false);
      return;
    }
    const quickGeo = opts.resolveNearestCatalogGeoLocation(lat, lon);
    const quickCountry = quickGeo.country;
    const quickCity = quickGeo.city;
    if (quickCountry !== "--" || quickCity !== "--") {
      opts.applyResolvedGeoLocation(lat, lon, quickCity, quickCountry, true);
    } else {
      opts.setLocationLoading();
    }
    const reqId = ++reverseGeoReqId;
    const tryBoundaryLookup = !!opts.hasGeoMovementSinceStartup();
    (tryBoundaryLookup ? opts.resolveLocalReverseGeoFromBoundaries(lat, lon) : Promise.resolve(null))
      .then((localGeo) => {
        if (reqId !== reverseGeoReqId) return;
        if (localGeo && localGeo.country && localGeo.city) {
          opts.writeReverseGeoCache(lat, lon, localGeo.city, localGeo.country);
          opts.applyResolvedGeoLocation(lat, lon, localGeo.city, localGeo.country, false);
          return;
        }
        const fallbackGeo = opts.resolveNearestCatalogGeoLocation(lat, lon);
        opts.applyResolvedGeoLocation(lat, lon, fallbackGeo.city, fallbackGeo.country, true);
      })
      .catch(() => {
        if (reqId !== reverseGeoReqId) return;
        const fallbackGeo = opts.resolveNearestCatalogGeoLocation(lat, lon);
        opts.applyResolvedGeoLocation(lat, lon, fallbackGeo.city, fallbackGeo.country, true);
      });
  }

  function scheduleGeo(lat, lon) {
    clearTimeout(geoTimer);
    const firstOrUnknown = lastGeoLat === null || lastGeoLon === null || !opts.getCurrentCountry() || opts.getCurrentCountry() === "--";
    if (firstOrUnknown) {
      fetchGeo(lat, lon);
      return;
    }
    const movedEnoughForImmediateRefresh =
      Math.abs(lat - lastGeoLat) >= 0.008 ||
      Math.abs(opts.shortestLonDeltaDeg(lastGeoLon, lon)) >= 0.008;
    if (movedEnoughForImmediateRefresh) {
      opts.setHasGeoMovementSinceStartup(true);
      fetchGeo(lat, lon);
      return;
    }
    geoTimer = setTimeout(() => fetchGeo(lat, lon), 220);
  }

  function resetTracking() {
    lastGeoLat = null;
    lastGeoLon = null;
  }

  return {
    resetTracking,
    fetchGeo,
    scheduleGeo
  };
}
