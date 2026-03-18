import { createMutableState } from "./state.mjs";

export function createPrayerPanelController(options) {
  const opts = options || {};
  const DEGREE_SYMBOL = "°";
  const state = createMutableState({
    prayerMethod: (opts.initialState && opts.initialState.prayerMethod) || "MWL",
    customFajrAngle: (opts.initialState && Number.isFinite(Number(opts.initialState.customFajrAngle))) ? Number(opts.initialState.customFajrAngle) : -12,
    customIshaAngle: (opts.initialState && Number.isFinite(Number(opts.initialState.customIshaAngle))) ? Number(opts.initialState.customIshaAngle) : -18,
    currentPrayerRegionCountry: (opts.initialState && opts.initialState.currentPrayerRegionCountry) || "",
    prayerCacheKey: "",
    prayerCacheTimes: null,
    prayerRows: null,
    prayerCountryOrgConfig: { globalMethodKeys: [], countries: {} }
  });

  const CUSTOM_PRAYER_ANGLES = opts.customPrayerAngles || [-12, -13, -13.5, -14, -15, -16, -17, -17.5, -17.7, -18, -18.5, -19, -19.5, -20];
  const DEFAULT_GLOBAL_PRAYER_METHOD_KEYS = opts.defaultGlobalMethodKeys || ["MWL", "ISNA", "EGYPT", "KARACHI", "AR_UAQ"];
  const REGION_METHOD_KEYS = opts.regionMethodKeys || {
    France: ["FR_GMP", "UOIF", "MWL"],
    Indonesia: ["ID_KEMENAG", "ID_MUH", "MWL"]
  };
  const PRAYER_COUNTRY_ORGS_URL = opts.prayerCountryOrgsUrl || "assets/world/muslim_orgs_by_country.json";
  const prayerMethods = Object.assign({}, opts.prayerMethods || {});
  let prayerCountryOrgLoadPromise = null;

  function getMethodSelect() {
    return opts.getMethodSelect ? opts.getMethodSelect() : null;
  }

  function getFajrSelect() {
    return opts.getFajrSelect ? opts.getFajrSelect() : null;
  }

  function getIshaSelect() {
    return opts.getIshaSelect ? opts.getIshaSelect() : null;
  }

  function getPrayerPanelEl() {
    return opts.getPrayerPanel ? opts.getPrayerPanel() : null;
  }

  function getPrayerRows() {
    if (state.get("prayerRows")) return state.get("prayerRows");
    const rows = opts.getPrayerRows ? opts.getPrayerRows() : [];
    state.set("prayerRows", rows);
    return rows;
  }

  function getPrayerState() {
    return {
      prayerMethod: state.get("prayerMethod"),
      customFajrAngle: state.get("customFajrAngle"),
      customIshaAngle: state.get("customIshaAngle"),
      currentPrayerRegionCountry: state.get("currentPrayerRegionCountry")
    };
  }

  function syncFromTemplate() {
    const snapshot = opts.getTemplateSnapshot ? opts.getTemplateSnapshot() : null;
    if (!snapshot || !snapshot.prayer) return getPrayerState();
    const prayer = snapshot.prayer;
    state.set("prayerMethod", prayer.methodKey || "MWL");
    if (Number.isFinite(Number(prayer.customFajrAngle))) state.set("customFajrAngle", Number(prayer.customFajrAngle));
    if (Number.isFinite(Number(prayer.customIshaAngle))) state.set("customIshaAngle", Number(prayer.customIshaAngle));
    return getPrayerState();
  }

  function formatAngleValue(angle) {
    return Number(Math.abs(angle)).toFixed(1).replace(/\.0$/, "");
  }

  function formatAngleLabel(deg) {
    return `${formatAngleValue(deg)}${DEGREE_SYMBOL}`;
  }

  function translate(key, vars) {
    const template = String(opts.t(key) || key);
    if (!vars || typeof vars !== "object") return template;
    return template.replace(/{(\w+)}/g, (_, token) => (
      Object.prototype.hasOwnProperty.call(vars, token) ? String(vars[token]) : `{${token}}`
    ));
  }

  function currentPrayerMethodAngles() {
    const prayerMethod = state.get("prayerMethod");
    if (prayerMethod === "CUSTOM") {
      return {
        fajrAngle: state.get("customFajrAngle"),
        ishaAngle: state.get("customIshaAngle"),
        label: opts.t("prayer.custom_settings")
      };
    }
    return prayerMethods[prayerMethod] || prayerMethods.MWL;
  }

  function currentMethodShortName() {
    const prayerMethod = state.get("prayerMethod");
    if (prayerMethod === "CUSTOM") return opts.t("prayer.custom_settings");
    const method = prayerMethods[prayerMethod] || prayerMethods.MWL;
    return ((opts.getMethodLabel ? opts.getMethodLabel(prayerMethod, method) : method && method.label) || prayerMethod || "MWL");
  }

  function fileSafeSegment(value, fallback) {
    const normalized = String(value || fallback || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "");
    return normalized || String(fallback || "item");
  }

  function currentMethodDisplayName() {
    const prayerMethod = state.get("prayerMethod");
    if (prayerMethod === "CUSTOM") {
      return `${opts.t("prayer.custom_settings")} (${opts.t("prayer.fajr")} ${formatAngleValue(state.get("customFajrAngle"))}${DEGREE_SYMBOL}, ${opts.t("prayer.isha")} ${formatAngleValue(state.get("customIshaAngle"))}${DEGREE_SYMBOL})`;
    }
    const method = prayerMethods[prayerMethod] || prayerMethods.MWL;
    const label = (opts.getMethodLabel ? opts.getMethodLabel(prayerMethod, method) : method.label) || prayerMethod;
    return `${label} (${opts.t("prayer.fajr")} ${formatAngleValue(method.fajrAngle)}${DEGREE_SYMBOL}, ${opts.t("prayer.isha")} ${formatAngleValue(method.ishaAngle)}${DEGREE_SYMBOL})`;
  }

  function setAngleSelectValues() {
    const fajrSelect = getFajrSelect();
    const ishaSelect = getIshaSelect();
    if (fajrSelect) fajrSelect.value = String(state.get("customFajrAngle"));
    if (ishaSelect) ishaSelect.value = String(state.get("customIshaAngle"));
  }

  function populateCustomAngleSelects() {
    const fajrSelect = getFajrSelect();
    const ishaSelect = getIshaSelect();
    if (!fajrSelect || !ishaSelect) return;
    const optionsHtml = CUSTOM_PRAYER_ANGLES.map((deg) => `<option value="${deg}">${formatAngleLabel(deg)}</option>`).join("");
    fajrSelect.innerHTML = optionsHtml;
    ishaSelect.innerHTML = optionsHtml;
    setAngleSelectValues();
  }

  function approxEqualAngle(a, b) {
    return Math.abs(Number(a) - Number(b)) < 0.06;
  }

  function detectMethodKeyFromAngles(fajrAngle, ishaAngle) {
    const methodKeys = getVisiblePrayerMethodKeys();
    for (let i = 0; i < methodKeys.length; i += 1) {
      const key = methodKeys[i];
      const method = prayerMethods[key];
      if (approxEqualAngle(fajrAngle, method.fajrAngle) && approxEqualAngle(ishaAngle, method.ishaAngle)) {
        return key;
      }
    }
    return "CUSTOM";
  }

  function persistPrayerPrefs() {
    if (typeof opts.persistPrayerPrefs === "function") {
      opts.persistPrayerPrefs({
        prayerMethod: state.get("prayerMethod"),
        customFajrAngle: state.get("customFajrAngle"),
        customIshaAngle: state.get("customIshaAngle")
      });
    }
  }

  function applyMethodSelection(methodKey) {
    const selected = Object.prototype.hasOwnProperty.call(prayerMethods, methodKey) ? methodKey : "CUSTOM";
    state.set("prayerMethod", selected);
    if (selected in prayerMethods) {
      state.set("customFajrAngle", prayerMethods[selected].fajrAngle);
      state.set("customIshaAngle", prayerMethods[selected].ishaAngle);
    }
    const methodSelect = getMethodSelect();
    if (methodSelect) methodSelect.value = selected;
    setAngleSelectValues();
    persistPrayerPrefs();
    return getPrayerState();
  }

  function resolvePrayerCountryIso2(countryName) {
    const raw = String(countryName || "").trim();
    const key = opts.normalizeTravelSearchText(raw);
    if (!key) return "";
    const compactKeyOf = (value) => opts.normalizeTravelSearchText(value).replace(/[^a-z0-9]/g, "");
    if (/^[a-z]{2}$/i.test(raw)) return raw.toLowerCase();
    const catalog = opts.getTravelCatalogForLookup();
    if (/^[a-z]{3}$/i.test(raw)) {
      const iso3 = raw.toUpperCase();
      for (let i = 0; i < catalog.length; i += 1) {
        const row = catalog[i] || {};
        if (String(row.iso3 || "").trim().toUpperCase() === iso3) {
          return String(row.iso2 || "").trim().toLowerCase();
        }
      }
    }
    const compactKey = compactKeyOf(raw);
    for (let i = 0; i < catalog.length; i += 1) {
      const row = catalog[i] || {};
      const aliases = Array.isArray(row.searchAliases) ? row.searchAliases : [row.country || row.displayName || ""];
      if (aliases.some((name) => {
        const aliasNorm = opts.normalizeTravelSearchText(name);
        const aliasCompact = compactKeyOf(name);
        return aliasNorm === key || (!!compactKey && aliasCompact === compactKey);
      })) {
        return String(row.iso2 || "").trim().toLowerCase();
      }
    }
    if (typeof opts.getCurrentLat === "function" && typeof opts.getCurrentLon === "function") {
      const lat = Number(opts.getCurrentLat());
      const lon = Number(opts.getCurrentLon());
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        let bestIdx = -1;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < catalog.length; i += 1) {
          const cities = Array.isArray(catalog[i] && catalog[i].cities) ? catalog[i].cities : [];
          for (let j = 0; j < cities.length; j += 1) {
            const city = cities[j] || {};
            const d = Math.hypot(Number(city.lat) - lat, Number(city.lon) - lon);
            if (d < bestDist) {
              bestDist = d;
              bestIdx = i;
            }
          }
        }
        if (bestIdx >= 0 && catalog[bestIdx]) {
          return String(catalog[bestIdx].iso2 || "").trim().toLowerCase();
        }
      }
    }
    return "";
  }

  function getGlobalPrayerMethodKeys() {
    const source = Array.isArray(state.get("prayerCountryOrgConfig").globalMethodKeys) && state.get("prayerCountryOrgConfig").globalMethodKeys.length
      ? state.get("prayerCountryOrgConfig").globalMethodKeys
      : DEFAULT_GLOBAL_PRAYER_METHOD_KEYS;
    return source.filter((key) => key in prayerMethods);
  }

  function getPrayerCountryLocalMethodKeys(countryName) {
    const iso2 = resolvePrayerCountryIso2(countryName);
    if (!iso2) return [];
    const rows = state.get("prayerCountryOrgConfig").countries && Array.isArray(state.get("prayerCountryOrgConfig").countries[iso2])
      ? state.get("prayerCountryOrgConfig").countries[iso2]
      : [];
    return rows.filter((key) => key in prayerMethods);
  }

  function normalizePrayerCountryOrgEntry(iso2, entry, idx) {
    if (typeof entry === "string") {
      const key = String(entry || "").trim();
      return key && (key in prayerMethods) ? key : "";
    }
    if (!entry || typeof entry !== "object") return "";
    const keyRaw = String(entry.key || "").trim();
    const label = String(entry.label || "").trim();
    const fajrAngle = Number(entry.fajrAngle);
    const ishaAngle = Number(entry.ishaAngle);
    let key = keyRaw;
    if (!key && Number.isFinite(fajrAngle) && Number.isFinite(ishaAngle) && label) {
      key = `LOCAL_${String(iso2 || "").toUpperCase()}_${idx + 1}`;
    }
    if (!key) return "";
    if (!(key in prayerMethods) && Number.isFinite(fajrAngle) && Number.isFinite(ishaAngle)) {
      prayerMethods[key] = { fajrAngle, ishaAngle, label: label || key };
    }
    return (key in prayerMethods) ? key : "";
  }

  function applyPrayerCountryOrgConfig(data) {
    const out = { globalMethodKeys: [], countries: {} };
    if (data && typeof data === "object") {
      const globalRaw = Array.isArray(data.global_method_keys) ? data.global_method_keys : [];
      out.globalMethodKeys = globalRaw.map((key) => String(key || "").trim()).filter((key) => key in prayerMethods);
      const countries = data.countries && typeof data.countries === "object" ? data.countries : {};
      Object.keys(countries).forEach((ccRaw) => {
        const cc = String(ccRaw || "").trim().toLowerCase();
        if (!cc) return;
        const rows = Array.isArray(countries[ccRaw]) ? countries[ccRaw] : [];
        const keys = [];
        rows.slice(0, 5).forEach((entry, idx) => {
          const key = normalizePrayerCountryOrgEntry(cc, entry, idx);
          if (key && !keys.includes(key)) keys.push(key);
        });
        out.countries[cc] = keys;
      });
    }
    state.set("prayerCountryOrgConfig", out);
  }

  async function loadPrayerCountryOrganizations() {
    if (prayerCountryOrgLoadPromise) return prayerCountryOrgLoadPromise;
    prayerCountryOrgLoadPromise = (async () => {
      const result = await opts.fetchJsonTracked(PRAYER_COUNTRY_ORGS_URL, { cache: "force-cache" }, "prayer-country-orgs");
      if (!result.ok || !result.data) {
        throw new Error(`prayer country orgs load failed (${result.status || 0})`);
      }
      applyPrayerCountryOrgConfig(result.data);
    })().catch(() => {
      applyPrayerCountryOrgConfig({});
    });
    return prayerCountryOrgLoadPromise;
  }

  function getRegionMethodKeys(countryName) {
    const local = getPrayerCountryLocalMethodKeys(countryName);
    if (local.length) return local;
    return REGION_METHOD_KEYS[countryName] || [];
  }

  function getVisiblePrayerMethodKeys() {
    const globalMethods = getGlobalPrayerMethodKeys();
    const regionMethods = getRegionMethodKeys(state.get("currentPrayerRegionCountry"));
    const visibleKeys = [];
    [...globalMethods, ...regionMethods].forEach((key) => {
      if ((key in prayerMethods) && !visibleKeys.includes(key)) visibleKeys.push(key);
    });
    return visibleKeys;
  }

  function updatePrayerMethodOptionLabels() {
    const select = getMethodSelect();
    if (!select) return;
    const visibleKeys = getVisiblePrayerMethodKeys();
    const selectedBefore = state.get("prayerMethod");
    select.innerHTML = "";
    visibleKeys.forEach((key) => {
      const method = prayerMethods[key];
      const label = opts.getMethodLabel(key, method);
      const option = document.createElement("option");
      option.value = key;
      option.textContent = `${label} - ${formatAngleValue(method.fajrAngle)}/${formatAngleValue(method.ishaAngle)}`;
      select.appendChild(option);
    });
    const customOpt = document.createElement("option");
    customOpt.value = "CUSTOM";
    customOpt.textContent = opts.t("prayer.custom_settings");
    select.appendChild(customOpt);
    if (selectedBefore === "CUSTOM") {
      state.set("prayerMethod", "CUSTOM");
    } else if (visibleKeys.includes(selectedBefore)) {
      state.set("prayerMethod", selectedBefore);
    } else {
      state.set("prayerMethod", visibleKeys[0] || "MWL");
    }
    select.value = state.get("prayerMethod");
  }

  function setPrayerRegionCountry(countryName, autoSelect) {
    state.set("currentPrayerRegionCountry", countryName || "");
    const previous = state.get("prayerMethod");
    updatePrayerMethodOptionLabels();
    if (autoSelect) {
      const preferred = getRegionMethodKeys(state.get("currentPrayerRegionCountry")).find((key) => key in prayerMethods);
      if (preferred) {
        applyMethodSelection(preferred);
        state.set("prayerCacheKey", "");
        return;
      }
      if ("MWL" in prayerMethods) {
        applyMethodSelection("MWL");
        state.set("prayerCacheKey", "");
        return;
      }
    }
    if (previous !== state.get("prayerMethod")) {
      state.set("prayerCacheKey", "");
    }
  }

  function setPrayerRegionCountryState(countryName) {
    state.set("currentPrayerRegionCountry", countryName || "");
  }


  function getPrayerTimesForDate(date, lat, lon) {
    if (typeof opts.computePrayerTimes === "function") {
      const computed = opts.computePrayerTimes({
        date,
        lat,
        lon,
        prayerMethod: state.get("prayerMethod"),
        customFajrAngle: state.get("customFajrAngle"),
        customIshaAngle: state.get("customIshaAngle"),
        currentMethod: currentPrayerMethodAngles()
      });
      if (computed) return computed;
    }
    return null;
  }

  function findPrayerHighlight(times, now) {
    const isValid = (value) => value instanceof Date && !Number.isNaN(value.getTime());
    const fajr = isValid(times.fajr) ? times.fajr : null;
    const sunrise = isValid(times.sunrise) ? times.sunrise : null;
    const dhuhr = isValid(times.dhuhr) ? times.dhuhr : null;
    const asr = isValid(times.asr) ? times.asr : null;
    const maghreb = isValid(times.maghreb) ? times.maghreb : null;
    const isha = isValid(times.isha) ? times.isha : null;
    let active = null;
    let next = "fajr";

    if (fajr && now < fajr) next = "fajr";
    else if (fajr && now >= fajr && (!sunrise || now < sunrise)) {
      active = "fajr";
      next = "dhuhr";
    } else if (dhuhr && now < dhuhr) next = "dhuhr";
    else if (dhuhr && now >= dhuhr && (!asr || now < asr)) {
      active = "dhuhr";
      next = "asr";
    } else if (asr && now >= asr && (!maghreb || now < maghreb)) {
      active = "asr";
      next = "maghreb";
    } else if (maghreb && now >= maghreb && (!isha || now < isha)) {
      active = "maghreb";
      next = "isha";
    } else if (isha && now >= isha) {
      active = "isha";
      next = "fajr";
    }

    return { active, next };
  }

  function fmtPrayerTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "--:--";
    const parts = opts.getDatePartsInTimeZone(date, opts.getCurrentTimeZone());
    return `${parts.hour}:${parts.minute}`;
  }

  function updatePrayerPanel(date, lat, lon, updateOptions) {
    const localOptions = updateOptions || {};
    const times = getPrayerTimesForDate(date, lat, lon);
    if (localOptions.skipDom) return times;
    const prayerPanel = getPrayerPanelEl();
    if (!prayerPanel || prayerPanel.style.display === "none") return times;
    const rows = getPrayerRows();
    const marker = findPrayerHighlight(times, date);
    const nextTime = times[marker.next];
    const nearNext = (nextTime instanceof Date) && (nextTime.getTime() - date.getTime() <= 15 * 60 * 1000) && (nextTime.getTime() - date.getTime() >= 0);
    rows.forEach((row) => {
      const key = row.getAttribute("data-prayer");
      row.querySelector(".prayer-time").textContent = fmtPrayerTime(times[key]);
      row.classList.toggle("active", key === marker.active);
      row.classList.toggle("soon", nearNext && key === marker.next);
    });
    return times;
  }

  function refreshPrayerHighlightOnly(date) {
    const prayerPanel = getPrayerPanelEl();
    if (!prayerPanel || prayerPanel.style.display === "none") return;
    const rows = getPrayerRows();
    if (!rows || rows.length === 0) return;
    const currentDate = date instanceof Date ? date : opts.getCurrentDate();
    const times = getPrayerTimesForDate(currentDate, opts.getCurrentLat(), opts.getCurrentLon());
    const marker = findPrayerHighlight(times, currentDate);
    const nextTime = times[marker.next];
    const nearNext = (nextTime instanceof Date) && (nextTime.getTime() - currentDate.getTime() <= 15 * 60 * 1000) && (nextTime.getTime() - currentDate.getTime() >= 0);
    rows.forEach((row) => {
      const key = row.getAttribute("data-prayer");
      row.classList.toggle("active", key === marker.active);
      row.classList.toggle("soon", nearNext && key === marker.next);
    });
  }

  function savePrayerTimesAsImage(date, times) {
    const rows = [
      [opts.t("prayer.fajr"), fmtPrayerTime(times.fajr)],
      [opts.t("prayer.sunrise"), fmtPrayerTime(times.sunrise)],
      [opts.t("prayer.dhuhr"), fmtPrayerTime(times.dhuhr)],
      [opts.t("prayer.asr"), fmtPrayerTime(times.asr)],
      [opts.t("prayer.maghreb"), fmtPrayerTime(times.maghreb)],
      [opts.t("prayer.isha"), fmtPrayerTime(times.isha)]
    ];
    const location = opts.getCurrentLocationContext();
    const city = location.city || "--";
    const country = opts.getLocalizedCountryForDisplay(location.country, location.lat, location.lon);
    const method = currentPrayerMethodAngles();
    const methodShort = currentMethodShortName();
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1320;
    const ctx = canvas.getContext("2d");
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, "#0a1637");
    bg.addColorStop(1, "#060c1f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cardX = 70;
    const cardY = 326;
    const cardW = canvas.width - cardX * 2;
    const cardH = 742;
    ctx.fillStyle = "rgba(7, 17, 45, 0.86)";
    ctx.strokeStyle = "rgba(150, 185, 255, 0.44)";
    ctx.lineWidth = 3;
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    ctx.fillStyle = "#dfeeff";
    ctx.textAlign = "center";
    ctx.font = "700 50px Space Mono, monospace";
    ctx.fillText(opts.t("capture.title"), canvas.width / 2, 96);
    ctx.font = "700 37px Space Mono, monospace";
    ctx.fillStyle = "#b8d2ff";
    ctx.fillText(translate("capture.for_date", { date: opts.localizedDateLabel(date) }), canvas.width / 2, 165);
    ctx.font = "600 27px Space Mono, monospace";
    ctx.fillText(translate("capture.for_city", { city, country }), canvas.width / 2, 220);
    ctx.font = "700 25px Space Mono, monospace";
    ctx.fillStyle = "#ffd99a";
    ctx.fillText(translate("capture.method", { method: methodShort }), canvas.width / 2, 268);
    ctx.font = "700 25px Space Mono, monospace";
    ctx.fillText(`${opts.t("prayer.fajr")}: ${formatAngleValue(method.fajrAngle)}${DEGREE_SYMBOL}   ${opts.t("prayer.isha")}: ${formatAngleValue(method.ishaAngle)}${DEGREE_SYMBOL}`, canvas.width / 2, 304);

    ctx.textAlign = "left";
    rows.forEach((row, idx) => {
      const y = cardY + 86 + idx * 108;
      ctx.fillStyle = idx % 2 === 0 ? "rgba(150,185,255,0.05)" : "rgba(0,0,0,0)";
      ctx.fillRect(cardX + 16, y - 40, cardW - 32, 88);
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "700 36px Space Mono, monospace";
      ctx.fillText(row[0], cardX + 44, y);
      ctx.fillStyle = "#fff2d6";
      ctx.textAlign = "right";
      ctx.font = "700 40px Space Mono, monospace";
      ctx.fillText(row[1], cardX + cardW - 44, y);
      ctx.textAlign = "left";
      if (idx < rows.length - 1) {
        ctx.strokeStyle = "rgba(160,195,255,0.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX + 30, y + 52);
        ctx.lineTo(cardX + cardW - 30, y + 52);
        ctx.stroke();
      }
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 38px Space Mono, monospace";
    ctx.fillText("www.showmethemoon.com", canvas.width / 2, cardY + cardH + 58);

    const anchor = document.createElement("a");
    anchor.href = canvas.toDataURL("image/png");
    const dateStamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const titleSegment = fileSafeSegment(opts.t("capture.title"), "prayer_times");
    const citySegment = fileSafeSegment(city, "city");
    const countrySegment = fileSafeSegment(country, "country");
    anchor.download = `${titleSegment}_${dateStamp}_${citySegment}_${countrySegment}.png`;
    anchor.click();
  }

  function bindDomEvents() {
    const methodSelect = getMethodSelect();
    const fajrSelect = getFajrSelect();
    const ishaSelect = getIshaSelect();
    const captureBtn = opts.getCaptureButton ? opts.getCaptureButton() : null;

    if (methodSelect) {
      methodSelect.addEventListener("change", (event) => {
        const nextMethod = String(event.target.value || "");
        // Keep controller state aligned even when host app handles selection externally.
        const selected = Object.prototype.hasOwnProperty.call(prayerMethods, nextMethod) ? nextMethod : "CUSTOM";
        state.set("prayerMethod", selected);
        if (selected in prayerMethods) {
          state.set("customFajrAngle", prayerMethods[selected].fajrAngle);
          state.set("customIshaAngle", prayerMethods[selected].ishaAngle);
        }
        if (typeof opts.onMethodChange === "function") {
          opts.onMethodChange(nextMethod);
        } else {
          applyMethodSelection(nextMethod);
          state.set("prayerCacheKey", "");
          opts.onRefreshRequested();
        }
      });
    }

    if (fajrSelect) {
      fajrSelect.addEventListener("change", (event) => {
        const value = parseFloat(event.target.value);
        if (!Number.isFinite(value)) return;
        state.set("customFajrAngle", value);
        // Keep method/angles linkage: if the pair matches a known method, select it.
        state.set("prayerMethod", detectMethodKeyFromAngles(value, state.get("customIshaAngle")));
        if (typeof opts.onCustomAnglesChange === "function") {
          opts.onCustomAnglesChange(state.get("customFajrAngle"), state.get("customIshaAngle"));
        } else {
          persistPrayerPrefs();
        }
        const select = getMethodSelect();
        if (select) select.value = state.get("prayerMethod");
        state.set("prayerCacheKey", "");
        opts.onRefreshRequested();
      });
    }

    if (ishaSelect) {
      ishaSelect.addEventListener("change", (event) => {
        const value = parseFloat(event.target.value);
        if (!Number.isFinite(value)) return;
        state.set("customIshaAngle", value);
        // Keep method/angles linkage: if the pair matches a known method, select it.
        state.set("prayerMethod", detectMethodKeyFromAngles(state.get("customFajrAngle"), value));
        if (typeof opts.onCustomAnglesChange === "function") {
          opts.onCustomAnglesChange(state.get("customFajrAngle"), state.get("customIshaAngle"));
        } else {
          persistPrayerPrefs();
        }
        const select = getMethodSelect();
        if (select) select.value = state.get("prayerMethod");
        state.set("prayerCacheKey", "");
        opts.onRefreshRequested();
      });
    }

    if (captureBtn) {
      captureBtn.addEventListener("click", () => {
        const currentDate = opts.getCurrentDate();
        const times = getPrayerTimesForDate(currentDate, opts.getCurrentLat(), opts.getCurrentLon());
        savePrayerTimesAsImage(currentDate, times);
      });
    }
  }

  return {
    bindDomEvents,
    syncFromTemplate,
    loadPrayerCountryOrganizations,
    setPrayerRegionCountry,
    setPrayerRegionCountryState,
    updatePrayerMethodOptionLabels,
    populateCustomAngleSelects,
    setAngleSelectValues,
    applyMethodSelection,
    currentPrayerMethodAngles,
    currentMethodDisplayName,
    currentMethodShortName,
    updatePrayerPanel,
    refreshPrayerHighlightOnly,
    savePrayerTimesAsImage,
    getPrayerTimesForDate,
    getState: getPrayerState
  };
}









