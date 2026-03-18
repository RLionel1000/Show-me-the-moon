export function createLocationStatusUi(options) {
  const opts = options || {};
  const documentRef = opts.documentRef || document;
  const dateFmtCache = new Map();

  function validText(value) {
    const text = String(value || "").trim();
    return text && text !== "--";
  }

  function buildMoonStatusPlaceParts() {
    const state = opts.getLocationState ? opts.getLocationState() : {};
    let cityLabel = "";
    if (validText(state.currentCity) || state.currentCityIsUnknown) {
      cityLabel = opts.formatCityDisplayLabel(
        state.currentCity,
        !!state.currentCityIsExplicit,
        !!state.currentCityIsUnknown
      );
    }
    let country = validText(state.currentCountry)
      ? opts.getLocalizedCountryForDisplay(state.currentCountry, state.currentLat, state.currentLon)
      : opts.getLocalizedCountryForDisplay("", state.currentLat, state.currentLon);
    const latStr = Number(state.currentLat).toFixed(4).replace('.', ',');
    const lonStr = Number(state.currentLon).toFixed(5).replace('.', ',');
    const placeCore = cityLabel || `${latStr} / ${lonStr}`;
    return { placeCore, country: (country || '--') };
  }

  function buildMoonStatusPlaceText() {
    const parts = buildMoonStatusPlaceParts();
    return `${parts.placeCore}, ${parts.country}`;
  }

  function fitSingleLineText(el, minPx, maxPx) {
    if (!el) return;
    const min = Number.isFinite(minPx) ? minPx : 8;
    const max = Number.isFinite(maxPx) ? maxPx : 13;
    el.style.fontSize = `${max}px`;
    for (let size = max; size >= min; size -= 0.5) {
      el.style.fontSize = `${size}px`;
      if (el.scrollWidth <= el.clientWidth) break;
    }
  }

  function updateMoonStatusDisplay(visibleOverride) {
    const moonStatus = opts.getMoonStatus ? opts.getMoonStatus() : documentRef.getElementById('moon-status');
    if (!moonStatus) return;
    const state = opts.getLocationState ? opts.getLocationState() : {};
    const clockDate = opts.getUiClockDate();
    const date = clockDate instanceof Date ? clockDate : new Date();
    const partsInZone = opts.getDatePartsInTimeZone(date, state.currentTimeZone);
    const tzLabel = opts.getTimeZoneDisplayLabel(date);
    const placeEl = moonStatus.querySelector('.moon-status-place');
    if (placeEl) {
      const parts = buildMoonStatusPlaceParts();
      const cityEl = placeEl.querySelector('.moon-status-city');
      const countryEl = placeEl.querySelector('.moon-status-country');
      const tzEl = placeEl.querySelector('.moon-status-timezone');
      const placeLine = `${parts.placeCore}, ${parts.country}`;
      if (cityEl && countryEl) {
        cityEl.textContent = parts.placeCore;
        countryEl.textContent = parts.country;
      } else {
        placeEl.textContent = placeLine;
      }
      if (tzEl) tzEl.textContent = tzLabel;
      fitSingleLineText(tzEl, 7, 10);
      fitSingleLineText(cityEl, 8, 13);
      fitSingleLineText(countryEl, 8, 12);
      placeEl.setAttribute('data-export-place', placeLine);
    }
    const dtEl = moonStatus.querySelector('.moon-status-datetime');
    if (dtEl) {
      dtEl.textContent = `${partsInZone.day}/${partsInZone.month}/${partsInZone.year} ${partsInZone.hour}h${partsInZone.minute}`;
    }
    const labelEl = moonStatus.querySelector('.moon-status-label');
    if (labelEl) {
      const isVisible = typeof visibleOverride === 'boolean'
        ? visibleOverride
        : moonStatus.classList.contains('visible');
      labelEl.textContent = isVisible ? opts.t('moon.visible') : opts.t('moon.invisible');
    }
  }

  function updateBottomLiveInfo(date) {
    const el = opts.getBottomLiveInfo ? opts.getBottomLiveInfo() : documentRef.getElementById('bottom-live-info');
    if (!el) return;
    const state = opts.getLocationState ? opts.getLocationState() : {};
    let cityLabel = "";
    if (validText(state.currentCity) || state.currentCityIsUnknown) {
      cityLabel = opts.formatCityDisplayLabel(state.currentCity, state.currentCityIsExplicit, state.currentCityIsUnknown);
    }
    const country = validText(state.currentCountry)
      ? opts.getLocalizedCountryForDisplay(state.currentCountry, state.currentLat, state.currentLon)
      : opts.getLocalizedCountryForDisplay('', state.currentLat, state.currentLon);
    const latStr = Number(state.currentLat).toFixed(4).replace('.', ',');
    const lonStr = Number(state.currentLon).toFixed(5).replace('.', ',');
    const placeCore = cityLabel || `${latStr} / ${lonStr}`;
    const place = `${placeCore}, ${country || '--'}`;
    const currentDate = (date instanceof Date && !Number.isNaN(date.getTime())) ? date : opts.getUiClockDate();
    const displayTz = state.currentTimeZone;
    const zoneParts = opts.getDatePartsInTimeZone(currentDate, displayTz);
    const showSeconds = !!opts.isTravelActive();
    let dateFmt = dateFmtCache.get(displayTz);
    if (!dateFmt) {
      dateFmt = new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: displayTz
      });
      dateFmtCache.set(displayTz, dateFmt);
    }
    const dateLabel = dateFmt.format(currentDate);
    const timeLabel = showSeconds
      ? `${zoneParts.hour}h${zoneParts.minute}m${zoneParts.second}`
      : `${zoneParts.hour}h${zoneParts.minute}`;
    const tzLabel = opts.getTimeZoneDisplayLabel(currentDate);
    const linePlace = documentRef.createElement('span');
    linePlace.className = 'live-line';
    linePlace.textContent = place;
    const lineDateTime = documentRef.createElement('span');
    lineDateTime.className = 'live-line';
    lineDateTime.textContent = `${dateLabel} ${timeLabel} ${tzLabel}`;
    el.replaceChildren(linePlace, lineDateTime);
  }

  function syncTravelMenuFromLocation(lat, lon, cityName, isExplicit, isUnknown) {
    if (typeof opts.getFocusedElementId === 'function') {
      const focusedId = String(opts.getFocusedElementId() || '');
      if (focusedId === 'travel-country-search' || focusedId === 'travel-city-search') return;
    }
    opts.syncTravelSelectionFromCoordinates(lat, lon);
    const cityEl = opts.getTravelCityInput ? opts.getTravelCityInput() : documentRef.getElementById('travel-city-search');
    if (cityEl) {
      const safeCity = String(cityName || '').trim();
      cityEl.value = opts.formatCityDisplayLabel(safeCity, !!isExplicit, !!isUnknown);
    }
  }

  function applyResolvedGeoLocation(lat, lon, _city, country, fallbackActive) {
    const el = opts.getLocationLive ? opts.getLocationLive() : documentRef.getElementById('location-live');
    const resolvedCity = opts.resolveCatalogCityLabelForCoords(lat, lon);
    const safeCity = resolvedCity && resolvedCity.city ? String(resolvedCity.city).trim() : '--';
    const explicitCity = !!(resolvedCity && resolvedCity.explicit);
    const unknownCity = !!(resolvedCity && resolvedCity.unknown);
    const cityDisplay = opts.formatCityDisplayLabel(safeCity, explicitCity, unknownCity);
    const safeCountry = String(country || '--').trim() || '--';
    if (typeof opts.setLocationState === 'function') {
      opts.setLocationState({
        currentCity: safeCity,
        currentCityIsExplicit: explicitCity,
        currentCityIsUnknown: unknownCity,
        currentCountry: safeCountry
      });
    }
    if (typeof opts.patchRuntimeState === 'function') {
      opts.patchRuntimeState({ currentCity: safeCity, currentCountry: safeCountry });
    }
    if (safeCountry !== '--' && typeof opts.setPrayerRegionCountry === 'function') {
      opts.setPrayerRegionCountry(safeCountry, false);
    }
    syncTravelMenuFromLocation(lat, lon, safeCity, explicitCity, unknownCity);
    const countryDisplay = opts.getLocalizedCountryForDisplay(safeCountry, lat, lon);
    if (el) {
      el.innerHTML = `<span class="pin">&#9632;</span><span class="city">${cityDisplay}</span><br><span>${countryDisplay}</span>`;
    }
    if (typeof opts.markReverseGeoFallback === 'function') {
      opts.markReverseGeoFallback(!!fallbackActive);
    }
    updateBottomLiveInfo(opts.getCurrentDate ? opts.getCurrentDate() : new Date());
    updateMoonStatusDisplay();
  }

  return {
    buildMoonStatusPlaceParts,
    buildMoonStatusPlaceText,
    fitSingleLineText,
    updateMoonStatusDisplay,
    updateBottomLiveInfo,
    syncTravelMenuFromLocation,
    applyResolvedGeoLocation
  };
}
