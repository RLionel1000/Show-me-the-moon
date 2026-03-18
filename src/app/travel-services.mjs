export function createTravelServices(options) {
  const opts = options || {};
  const storage = opts.storage;
  const normalizeCityNameForDisplay = opts.normalizeCityNameForDisplay;
  const getTravelCatalog = opts.getTravelCatalog;
  const resolveNearestCatalogCountryIndex = opts.resolveNearestCatalogCountryIndex;
  const resolveNearestCityInCountry = opts.resolveNearestCityInCountry;

  const reverseGeoCache = {
    loaded: false,
    data: {}
  };

  function makeReverseGeoCacheKey(lat, lon, precision) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "";
    return `${Number(lat).toFixed(precision)},${Number(lon).toFixed(precision)}`;
  }

  function loadReverseGeoCacheData(config) {
    const cfg = config || {};
    if (reverseGeoCache.loaded && reverseGeoCache.data && typeof reverseGeoCache.data === "object") {
      return reverseGeoCache.data;
    }
    reverseGeoCache.loaded = true;
    reverseGeoCache.data = {};
    let sanitized = false;
    try {
      const raw = storage.getStorageItem(cfg.storageKey, "");
      if (!raw) return reverseGeoCache.data;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const cleaned = {};
        Object.entries(parsed).forEach(([key, value]) => {
          if (!value || typeof value !== "object") return;
          const city = normalizeCityNameForDisplay(value.city);
          const country = String(value.country || "").trim();
          const ts = Number(value.ts) || 0;
          cleaned[key] = { city, country, ts };
          if (city !== String(value.city || "").trim()) sanitized = true;
        });
        reverseGeoCache.data = cleaned;
      }
    } catch {
      reverseGeoCache.data = {};
    }
    if (sanitized) {
      persistReverseGeoCacheData(cfg);
    }
    return reverseGeoCache.data;
  }

  function persistReverseGeoCacheData(config) {
    const cfg = config || {};
    storage.setStorageItem(cfg.storageKey, JSON.stringify(loadReverseGeoCacheData(cfg)));
  }

  function trimReverseGeoCacheIfNeeded(config) {
    const cfg = config || {};
    const cache = loadReverseGeoCacheData(cfg);
    const entries = Object.entries(cache);
    if (entries.length <= cfg.maxEntries) return;
    entries
      .sort((a, b) => Number((b[1] && b[1].ts) || 0) - Number((a[1] && a[1].ts) || 0))
      .slice(cfg.maxEntries)
      .forEach(([key]) => { delete cache[key]; });
  }

  function readReverseGeoCache(lat, lon, config) {
    const cfg = config || {};
    const key = makeReverseGeoCacheKey(lat, lon, cfg.precision);
    if (!key) return null;
    const cache = loadReverseGeoCacheData(cfg);
    const hit = cache[key];
    if (!hit || typeof hit !== "object") return null;
    const ageMs = Date.now() - Number(hit.ts || 0);
    if (!Number.isFinite(ageMs) || ageMs > cfg.ttlMs) {
      delete cache[key];
      persistReverseGeoCacheData(cfg);
      return null;
    }
    const city = String(hit.city || "").trim();
    const country = String(hit.country || "").trim();
    if (!city || !country) return null;
    return { city, country };
  }

  function writeReverseGeoCache(lat, lon, city, country, config) {
    const cfg = config || {};
    const key = makeReverseGeoCacheKey(lat, lon, cfg.precision);
    const safeCity = normalizeCityNameForDisplay(city);
    const safeCountry = String(country || "").trim();
    if (!key || !safeCity || !safeCountry || safeCity === "--" || safeCountry === "--") return;
    const cache = loadReverseGeoCacheData(cfg);
    cache[key] = { city: safeCity, country: safeCountry, ts: Date.now() };
    trimReverseGeoCacheIfNeeded(cfg);
    persistReverseGeoCacheData(cfg);
  }

  function seedReverseGeoCacheFromCatalog(lat, lon, countryIdx, config) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const idx = Number.isFinite(countryIdx) && countryIdx >= 0
      ? countryIdx
      : resolveNearestCatalogCountryIndex(lat, lon);
    const catalog = getTravelCatalog();
    if (!Number.isFinite(idx) || idx < 0 || !catalog[idx]) return;
    const countryEntry = catalog[idx];
    const nearestCity = resolveNearestCityInCountry(idx, lat, lon);
    const cityName = nearestCity && nearestCity.name ? String(nearestCity.name).trim() : "";
    const countryName = String(countryEntry.displayName || countryEntry.country || "").trim();
    if (!cityName || !countryName) return;
    writeReverseGeoCache(lat, lon, cityName, countryName, config);
  }

  return {
    makeReverseGeoCacheKey,
    loadReverseGeoCacheData,
    persistReverseGeoCacheData,
    trimReverseGeoCacheIfNeeded,
    readReverseGeoCache,
    writeReverseGeoCache,
    seedReverseGeoCacheFromCatalog
  };
}
