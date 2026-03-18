export function createTravelController(options) {
  const opts = options || {};
  const state = opts.state || {
    ready: false,
    countryIdx: -1,
    cityIdx: -1,
    citySuggestions: [],
    citySuggestionReqId: 0,
    selectedCityOverride: null
  };

  function getCatalog() {
    return typeof opts.getTravelCatalog === "function" ? opts.getTravelCatalog() : [];
  }

  function setCatalog(catalog) {
    if (typeof opts.setTravelCatalog === "function") {
      opts.setTravelCatalog(Array.isArray(catalog) ? catalog : []);
    }
  }

  function getCountryInput() { return opts.getCountryInput ? opts.getCountryInput() : null; }
  function getCityInput() { return opts.getCityInput ? opts.getCityInput() : null; }
  function getCountrySuggestionList() { return opts.getCountrySuggestionList ? opts.getCountrySuggestionList() : null; }
  function getCitySuggestionList() { return opts.getCitySuggestionList ? opts.getCitySuggestionList() : null; }

  async function loadTravelCatalog() {
    try {
      let catalog = [];
      const staticResult = await opts.fetchJsonTracked(opts.staticCatalogUrl, { cache: "force-cache" }, "travel-catalog-static");
      if (staticResult.ok && Array.isArray(staticResult.data)) {
        catalog = staticResult.data;
      } else {
        const fallbackStaticResult = await opts.fetchJsonTracked(opts.staticCatalogFallbackUrl, { cache: "force-cache" }, "travel-catalog-static-fallback");
        if (fallbackStaticResult.ok && Array.isArray(fallbackStaticResult.data)) {
          catalog = fallbackStaticResult.data;
        } else {
          const [countriesGeo, placesGeo] = await Promise.all([
            opts.loadCountriesGeoJsonShared(),
            opts.loadPopulatedPlacesGeoJsonShared()
          ]);
          catalog = opts.buildTravelCatalogFromGeo(countriesGeo, placesGeo);
        }
      }
      if (Array.isArray(catalog) && catalog.length) {
        setCatalog(catalog);
        opts.refreshTravelCountryLocalization();
        opts.markTravelCatalogFallback(false);
        return;
      }
      throw new Error("Empty catalog");
    } catch (error) {
      opts.onTravelCatalogFallback(error);
      setCatalog(opts.getTravelFallbackCatalog().slice());
      opts.refreshTravelCountryLocalization();
      opts.markTravelCatalogFallback(true);
      opts.setTravelStatus("Catalogue local de secours active.", "ok");
    }
  }

  function setCountrySuggestions(query) {
    const listEl = getCountrySuggestionList();
    if (!listEl) return;
    const q = opts.normalizeTravelSearchText(query);
    const scored = getCatalog()
      .map((entry) => {
        const aliases = Array.isArray(entry.searchAliases) ? entry.searchAliases : [entry.country || ""];
        if (!q) return { entry, score: 0, aliases };
        let hasPrefix = false;
        let hasIncludes = false;
        for (let i = 0; i < aliases.length; i += 1) {
          const normalized = opts.normalizeTravelSearchText(aliases[i]);
          if (!normalized) continue;
          if (normalized.startsWith(q)) hasPrefix = true;
          else if (normalized.includes(q)) hasIncludes = true;
        }
        if (hasPrefix) return { entry, score: 2, aliases };
        if (hasIncludes) return { entry, score: 1, aliases };
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.entry.displayName || a.entry.country || "").localeCompare(String(b.entry.displayName || b.entry.country || ""));
      });
    listEl.innerHTML = "";
    scored.slice(0, 120).forEach(({ entry, aliases }) => {
      const opt = document.createElement("option");
      const prefixAlias = q ? aliases.find((name) => opts.normalizeTravelSearchText(name).startsWith(q)) : "";
      opt.value = prefixAlias || entry.displayName || entry.country;
      if ((entry.displayName || entry.country) && opt.value !== (entry.displayName || entry.country)) {
        opt.label = entry.displayName || entry.country;
      }
      listEl.appendChild(opt);
    });
  }

  function mergeCitySuggestions(localCities, remoteCities) {
    const out = [];
    const seen = new Set();
    const add = (city) => {
      if (!city || !city.name) return;
      const key = opts.normalizeTravelSearchText(city.name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(city);
    };
    localCities.forEach(add);
    remoteCities.forEach(add);
    return out;
  }

  async function setCitySuggestions(countryIdx, query) {
    const listEl = getCitySuggestionList();
    if (!listEl) return;
    const catalog = getCatalog();
    const country = catalog[countryIdx];
    const q = opts.normalizeTravelSearchText(query);
    const localMatches = country && Array.isArray(country.cities)
      ? country.cities.filter((city) => !q || opts.normalizeTravelSearchText(city.name).includes(q))
      : [];
    const reqId = ++state.citySuggestionReqId;
    if (reqId !== state.citySuggestionReqId) return;
    const merged = mergeCitySuggestions(localMatches, []);
    const matches = (q ? merged : merged.slice(0, Math.max(5, Math.min(80, merged.length)))).slice(0, 80);
    state.citySuggestions = matches;
    listEl.innerHTML = "";
    matches.forEach((city) => {
      const opt = document.createElement("option");
      opt.value = opts.normalizeCityNameForDisplay(city.name);
      listEl.appendChild(opt);
    });
  }

  function clearTravelCitySelection(placeholderText) {
    const cityEl = getCityInput();
    const cityListEl = getCitySuggestionList();
    state.cityIdx = -1;
    state.selectedCityOverride = null;
    state.citySuggestions = [];
    if (cityEl) {
      cityEl.value = "";
      cityEl.disabled = true;
      cityEl.placeholder = placeholderText || "Selectionner un pays d'abord";
    }
    if (cityListEl) cityListEl.innerHTML = "";
  }

  function selectTravelCountry(countryIdx, preferredCityName) {
    const countryEl = getCountryInput();
    const cityEl = getCityInput();
    const catalog = getCatalog();
    const country = catalog[countryIdx];
    if (!country || !countryEl || !cityEl) {
      state.countryIdx = -1;
      clearTravelCitySelection();
      return;
    }
    state.countryIdx = countryIdx;
    state.selectedCityOverride = null;
    countryEl.value = country.displayName || country.country;
    cityEl.disabled = false;
    cityEl.placeholder = "Choisir...";
    setCountrySuggestions(country.displayName || country.country);
    setCitySuggestions(countryIdx, "");
    const cityIdx = opts.findCityIndexByName(countryIdx, preferredCityName);
    state.cityIdx = cityIdx;
    cityEl.value = cityIdx >= 0 ? opts.normalizeCityNameForDisplay(country.cities[cityIdx].name) : "";
    opts.setPrefCookie(opts.travelCountryCookie, country.iso3 || country.country, opts.travelPrefCookieDays);
    if (cityIdx >= 0) {
      opts.setPrefCookie(opts.travelCityCookie, country.cities[cityIdx].name, opts.travelPrefCookieDays);
    } else {
      opts.setPrefCookie(opts.travelCityCookie, "", opts.travelPrefCookieDays);
    }
  }

  function handleTravelCountryInputCommit() {
    const countryEl = getCountryInput();
    if (!countryEl) return;
    let idx = opts.findCountryIndexByName(countryEl.value);
    if (idx < 0) idx = opts.findCountryIndexByPrefix(countryEl.value);
    if (idx < 0) idx = opts.findCountryIndexByIncludes(countryEl.value);
    if (idx < 0) {
      state.countryIdx = -1;
      clearTravelCitySelection();
      opts.updateBottomLiveInfo(opts.getCurrentDate());
      opts.updateMoonStatusDisplay();
      return;
    }
    selectTravelCountry(idx);
    opts.updateBottomLiveInfo(opts.getCurrentDate());
    opts.updateMoonStatusDisplay();
  }

  function handleTravelCityInputCommit() {
    const cityEl = getCityInput();
    const countryIdx = Number(state.countryIdx);
    const catalog = getCatalog();
    if (!cityEl || countryIdx < 0) return;
    const parsedCityName = opts.stripNearbyCityDisplayLabel(cityEl.value);
    const cityIdx = opts.findCityIndexByName(countryIdx, parsedCityName);
    if (cityIdx >= 0) {
      state.cityIdx = cityIdx;
      state.selectedCityOverride = null;
      cityEl.value = opts.normalizeCityNameForDisplay(catalog[countryIdx].cities[cityIdx].name);
      opts.setPrefCookie(opts.travelCityCookie, cityEl.value, opts.travelPrefCookieDays);
      opts.updateBottomLiveInfo(opts.getCurrentDate());
      opts.updateMoonStatusDisplay();
      return;
    }
    const key = opts.normalizeTravelSearchText(parsedCityName);
    const suggested = state.citySuggestions.find((city) => opts.normalizeTravelSearchText(city.name) === key);
    if (!suggested) {
      state.cityIdx = -1;
      state.selectedCityOverride = null;
      opts.updateBottomLiveInfo(opts.getCurrentDate());
      opts.updateMoonStatusDisplay();
      return;
    }
    state.cityIdx = -1;
    state.selectedCityOverride = suggested;
    cityEl.value = opts.normalizeCityNameForDisplay(suggested.name);
    opts.setPrefCookie(opts.travelCityCookie, cityEl.value, opts.travelPrefCookieDays);
    opts.updateBottomLiveInfo(opts.getCurrentDate());
    opts.updateMoonStatusDisplay();
  }

  function syncTravelSelectionFromCoordinates(lat, lon) {
    const countryEl = getCountryInput();
    const cityEl = getCityInput();
    const cityListEl = getCitySuggestionList();
    const catalog = getCatalog();
    if (!countryEl || !cityEl) return "";
    const idx = opts.resolveNearestCatalogCountryIndex(lat, lon);
    if (idx < 0 || !catalog[idx]) {
      return "";
    }
    const country = catalog[idx];
    const resolvedCity = opts.resolveCatalogCityLabelForCoords(lat, lon);
    const nearestCityName = resolvedCity && !resolvedCity.unknown && resolvedCity.city
      ? opts.normalizeCityNameForDisplay(resolvedCity.city)
      : "";
    const nearestCityIdx = nearestCityName ? opts.findCityIndexByName(idx, nearestCityName) : -1;
    state.countryIdx = idx;
    state.cityIdx = nearestCityIdx;
    state.selectedCityOverride = null;
    state.citySuggestions = [];
    countryEl.value = String(country.displayName || country.country || "").trim();
    setCountrySuggestions(countryEl.value);
    cityEl.disabled = false;
    cityEl.value = opts.formatCityDisplayLabel(
      resolvedCity && resolvedCity.city ? resolvedCity.city : "",
      !!(resolvedCity && resolvedCity.explicit),
      !!(resolvedCity && resolvedCity.unknown)
    );
    cityEl.placeholder = "Choisir...";
    setCitySuggestions(idx, "");
    if (cityListEl) cityListEl.innerHTML = "";
    opts.setPrefCookie(opts.travelCountryCookie, country.iso3 || country.country, opts.travelPrefCookieDays);
    opts.setPrefCookie(opts.travelCityCookie, nearestCityName || "", opts.travelPrefCookieDays);
    return countryEl.value;
  }

  async function initTravelControls() {
    const countryEl = getCountryInput();
    const cityEl = getCityInput();
    if (!countryEl || !cityEl) return;
    clearTravelCitySelection();
    setCatalog(opts.getTravelFallbackCatalog().slice());
    opts.refreshTravelCountryLocalization();
    state.ready = true;
    setCountrySuggestions("");
    syncTravelSelectionFromCoordinates(opts.getCurrentLat(), opts.getCurrentLon());
    opts.updateBottomLiveInfo(opts.getCurrentDate());
    opts.updateMoonStatusDisplay();
    opts.setTravelStatus("Chargement du catalogue mondial...", "busy");
    await loadTravelCatalog();
    state.ready = true;
    setCountrySuggestions("");
    const startupCountry = syncTravelSelectionFromCoordinates(opts.getCurrentLat(), opts.getCurrentLon());
    opts.seedReverseGeoCacheFromCatalog(opts.getCurrentLat(), opts.getCurrentLon(), Number(state.countryIdx));
    if (startupCountry) {
      opts.applyStartupCountry(startupCountry);
    } else {
      countryEl.value = "";
      setCountrySuggestions("");
      clearTravelCitySelection("Choisir...");
    }
    opts.updateBottomLiveInfo(opts.getCurrentDate());
    opts.updateMoonStatusDisplay();
    countryEl.addEventListener("input", () => {
      setCountrySuggestions(countryEl.value);
      if (opts.findCountryIndexByName(countryEl.value) < 0) {
        state.countryIdx = -1;
        clearTravelCitySelection();
      }
    });
    countryEl.addEventListener("click", () => {
      countryEl.value = "";
      state.countryIdx = -1;
      clearTravelCitySelection();
      setCountrySuggestions("");
      if (typeof countryEl.showPicker === "function") {
        try { countryEl.showPicker(); } catch (_error) {}
      }
      opts.syncLocationApplyButton();
    });
    countryEl.addEventListener("change", handleTravelCountryInputCommit);
    countryEl.addEventListener("blur", handleTravelCountryInputCommit);
    const prepareCityTyping = () => {
      const countryIdx = Number(state.countryIdx);
      if (countryIdx < 0) return;
      if (String(cityEl.value || "").trim()) {
        cityEl.value = "";
      }
      state.cityIdx = -1;
      state.selectedCityOverride = null;
      setCitySuggestions(countryIdx, "");
      if (typeof cityEl.showPicker === "function") {
        try { cityEl.showPicker(); } catch (_error) {}
      }
      opts.syncLocationApplyButton();
    };
    cityEl.addEventListener("input", () => {
      const countryIdx = Number(state.countryIdx);
      if (countryIdx >= 0) {
        state.selectedCityOverride = null;
        setCitySuggestions(countryIdx, cityEl.value);
      }
    });
    cityEl.addEventListener("focus", () => {
      prepareCityTyping();
    });
    cityEl.addEventListener("click", () => {
      prepareCityTyping();
    });
    cityEl.addEventListener("change", handleTravelCityInputCommit);
    cityEl.addEventListener("blur", handleTravelCityInputCommit);
    if (!startupCountry) {
      opts.setTravelStatus("Selectionne un pays (ville optionnelle).", undefined);
    } else {
      opts.setTravelStatus("Pret pour un trajet.", undefined);
    }
  }

  return {
    getState: function getState() { return state; },
    loadTravelCatalog,
    setCountrySuggestions,
    setCitySuggestions,
    clearTravelCitySelection,
    selectTravelCountry,
    handleTravelCountryInputCommit,
    handleTravelCityInputCommit,
    syncTravelSelectionFromCoordinates,
    initTravelControls
  };
}
