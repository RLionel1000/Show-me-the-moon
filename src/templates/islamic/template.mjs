(function registerIslamicTemplate(globalScope) {
  "use strict";

  var DEFAULT_GUIDES = {
    qibla: true,
    alquds: true,
    medina: true
  };

  var LANDMARKS = {
    qibla: { id: "qibla", name: "Masjid al-Haram (Mecca)", lat: 21.4225, lon: 39.8262 },
    alquds: { id: "alquds", name: "Al-Aqsa (Jerusalem)", lat: 31.7781, lon: 35.2359 },
    medina: { id: "medina", name: "Al-Masjid an-Nabawi (Medina)", lat: 24.4672, lon: 39.6111 }
  };

  var LABELS = {
    qibla: "Qibla",
    alquds: "AlQuds",
    medina: "Medine"
  };

  var PRAYER_METHODS = {
    MWL: { fajrAngle: -18.0, ishaAngle: -17.0, label: "Muslim World League (MWL)" },
    ISNA: { fajrAngle: -15.0, ishaAngle: -15.0, label: "Islamic Society of North America (ISNA)" },
    UOIF: { fajrAngle: -12.0, ishaAngle: -12.0, label: "Union des Organisations Islamiques de France (UOIF)" },
    EGYPT: { fajrAngle: -19.5, ishaAngle: -17.5, label: "Egyptian General Authority of Survey (Egypt)" },
    KARACHI: { fajrAngle: -18.0, ishaAngle: -18.0, label: "University of Islamic Sciences, Karachi" },
    TEHRAN: { fajrAngle: -17.7, ishaAngle: -14.0, label: "Institute of Geophysics, University of Tehran" },
    FR_GMP: { fajrAngle: -12.0, ishaAngle: -12.0, label: "Grande Mosquee de Paris (France)" },
    EN_UK: { fajrAngle: -18.0, ishaAngle: -18.0, label: "Central Mosque UK (United Kingdom)" },
    ES_CIE: { fajrAngle: -18.0, ishaAngle: -17.0, label: "Comision Islamica de Espana (Spain)" },
    IT_UCOII: { fajrAngle: -12.0, ishaAngle: -12.0, label: "UCOII (Italia)" },
    DE_DITIB: { fajrAngle: -13.0, ishaAngle: -13.0, label: "DITIB (Deutschland)" },
    ZH_CIA: { fajrAngle: -18.0, ishaAngle: -18.0, label: "China Islamic Association (China)" },
    AR_UAQ: { fajrAngle: -18.5, ishaAngle: -18.5, label: "Umm Al-Qura (Arabic reference)" },
    PT_FAMBRAS: { fajrAngle: -18.0, ishaAngle: -18.0, label: "FAMBRAS (Brasil)" },
    ID_KEMENAG: { fajrAngle: -20.0, ishaAngle: -18.0, label: "Kementerian Agama RI (Indonesia)" },
    MS_JAKIM: { fajrAngle: -20.0, ishaAngle: -18.0, label: "JAKIM (Malaysia)" },
    EN_MCW: { fajrAngle: -18.0, ishaAngle: -18.0, label: "Moonsighting Committee Worldwide (MCW)" },
    IT_COREIS: { fajrAngle: -12.0, ishaAngle: -12.0, label: "COREIS (Italia)" },
    DE_ZMD: { fajrAngle: -13.0, ishaAngle: -13.0, label: "Zentralrat der Muslime in Deutschland (ZMD)" },
    ID_MUH: { fajrAngle: -20.0, ishaAngle: -18.0, label: "Muhammadiyah (Indonesia)" },
    MS_MUIS: { fajrAngle: -20.0, ishaAngle: -18.0, label: "MUIS (Singapore)" },
    PT_LISBON: { fajrAngle: -18.0, ishaAngle: -18.0, label: "Comunidade Islamica de Lisboa (Portugal)" }
  };
  var COMMON_METHOD_KEYS = ["MWL", "ISNA", "EGYPT", "KARACHI", "TEHRAN"];
  var LANGUAGE_METHOD_KEYS = {
    fr: ["UOIF", "FR_GMP"],
    en: ["EN_UK", "EN_MCW"],
    es: ["ES_CIE"],
    it: ["IT_UCOII", "IT_COREIS"],
    de: ["DE_DITIB", "DE_ZMD"],
    zh: ["ZH_CIA"],
    ar: ["AR_UAQ"],
    pt: ["PT_FAMBRAS", "PT_LISBON"],
    id: ["ID_KEMENAG", "ID_MUH"],
    ms: ["MS_JAKIM", "MS_MUIS"]
  };
  var STORAGE_KEYS = {
    guideVisibility: "guideVisibility",
    prayerMethod: "prayer_method",
    customFajrAngle: "custom_fajr_angle",
    customIshaAngle: "custom_isha_angle",
    prayerPanelVisible: "prayer_panel_visible"
  };
  var LEGACY_COOKIE_KEYS = {
    prayerMethod: "lunar_prayer_method",
    customFajrAngle: "lunar_custom_fajr",
    customIshaAngle: "lunar_custom_isha"
  };

  function clonePlainObject(input) {
    return Object.assign({}, input || {});
  }

  function readCookie(name) {
    if (!globalScope.document || !globalScope.document.cookie) return null;
    var prefix = String(name || "") + "=";
    var parts = globalScope.document.cookie.split(";");
    for (var i = 0; i < parts.length; i += 1) {
      var candidate = String(parts[i] || "").trim();
      if (candidate.indexOf(prefix) === 0) {
        return decodeURIComponent(candidate.slice(prefix.length));
      }
    }
    return null;
  }

  function writeCookie(name, value, days) {
    if (!globalScope.document) return;
    var durationDays = Number.isFinite(days) ? Number(days) : 365;
    var expires = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    globalScope.document.cookie = String(name || "") + "=" + encodeURIComponent(String(value)) + ";expires=" + expires.toUTCString() + ";path=/;SameSite=Lax";
  }

  function readStoredNumber(ctx, key, legacyCookieKey, fallback) {
    var stored = ctx.storage.get(key);
    if (Number.isFinite(Number(stored))) return Number(stored);
    var cookieValue = legacyCookieKey ? Number(readCookie(legacyCookieKey)) : Number.NaN;
    if (Number.isFinite(cookieValue)) return cookieValue;
    return fallback;
  }

  function readStoredMethod(ctx) {
    var stored = String(ctx.storage.get(STORAGE_KEYS.prayerMethod) || readCookie(LEGACY_COOKIE_KEYS.prayerMethod) || "MWL").trim();
    if (stored === "CUSTOM" || Object.prototype.hasOwnProperty.call(PRAYER_METHODS, stored)) {
      return stored;
    }
    return "MWL";
  }

  function readStoredGuideVisibility(ctx) {
    var stored = ctx.storage.get(STORAGE_KEYS.guideVisibility);
    if (stored && typeof stored === "object") {
      return Object.assign({}, DEFAULT_GUIDES, stored);
    }
    return clonePlainObject(DEFAULT_GUIDES);
  }

  function readStoredPrayerPanelVisibility(ctx) {
    var stored = ctx.storage.get(STORAGE_KEYS.prayerPanelVisible);
    if (typeof stored === "boolean") return stored;
    if (stored === "0" || stored === 0) return false;
    return true;
  }

  function dayOfYear(date) {
    var start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
  }

  function toRadians(deg) {
    return deg * Math.PI / 180;
  }

  function toDegrees(rad) {
    return rad * 180 / Math.PI;
  }

  function solarDeclinationApproxDeg(date) {
    var d = dayOfYear(date);
    return 23.44 * Math.sin((2 * Math.PI / 365.24) * (d - 81));
  }

  function minutesToDate(baseDate, minutesSinceMidnight) {
    var d = new Date(baseDate);
    d.setHours(0, 0, 0, 0);
    d.setMinutes(Math.round(minutesSinceMidnight));
    return d;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function fallbackPrayerTimes(date, lat, lon) {
    var n = dayOfYear(date);
    var season = Math.sin((2 * Math.PI * (n - 80)) / 365.24);
    var latFactor = clamp(Math.abs(lat) / 90, 0, 1);
    var lonOffset = clamp(lon / 180, -1, 1);
    var sunrise = 6 * 60 - (season * 90 * latFactor) - (lonOffset * 22);
    var sunset = 18 * 60 + (season * 90 * latFactor) - (lonOffset * 22);
    var dhuhr = (sunrise + sunset) / 2;
    var fajr = sunrise - 95;
    var asr = dhuhr + (sunset - dhuhr) * 0.52;
    var isha = sunset + 95;
    return {
      fajr: minutesToDate(date, fajr),
      sunrise: minutesToDate(date, sunrise),
      dhuhr: minutesToDate(date, dhuhr),
      asr: minutesToDate(date, asr),
      maghreb: minutesToDate(date, sunset),
      isha: minutesToDate(date, isha)
    };
  }

  function getSunAltDegAt(date, lat, lon) {
    if (!globalScope.SunCalc || typeof globalScope.SunCalc.getPosition !== "function") {
      return null;
    }
    var pos = globalScope.SunCalc.getPosition(date, lat, lon);
    return toDegrees(pos.altitude);
  }

  function solveSolarAngleTime(date, lat, lon, targetAltDeg, anchorTime, direction) {
    var currentAlt = getSunAltDegAt(new Date(anchorTime), lat, lon);
    if (currentAlt === null) return null;

    var stepMs = 4 * 60 * 1000;
    var tA = anchorTime;
    var fA = currentAlt - targetAltDeg;
    var tB = tA;
    var fB = fA;
    var foundBracket = false;

    for (var i = 0; i < 240; i += 1) {
      tB += direction * stepMs;
      var altB = getSunAltDegAt(new Date(tB), lat, lon);
      if (altB === null) return null;
      fB = altB - targetAltDeg;
      if (fA === 0 || fB === 0 || (fA > 0 && fB < 0) || (fA < 0 && fB > 0)) {
        foundBracket = true;
        break;
      }
      tA = tB;
      fA = fB;
    }
    if (!foundBracket) return null;

    var lo = Math.min(tA, tB);
    var hi = Math.max(tA, tB);
    for (var j = 0; j < 24; j += 1) {
      var mid = (lo + hi) / 2;
      var fLo = getSunAltDegAt(new Date(lo), lat, lon) - targetAltDeg;
      var fMid = getSunAltDegAt(new Date(mid), lat, lon) - targetAltDeg;
      if (fLo === 0) return new Date(lo);
      if (fMid === 0) return new Date(mid);
      if ((fLo > 0 && fMid < 0) || (fLo < 0 && fMid > 0)) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    return new Date((lo + hi) / 2);
  }

  function computeAsrTime(date, lat, solarNoon, shadowFactor) {
    if (!solarNoon) return null;
    var decRad = toRadians(solarDeclinationApproxDeg(date));
    var latRad = toRadians(lat);
    var asrAlt = Math.atan(1 / (Math.tan(Math.abs(latRad - decRad)) + shadowFactor));
    var c = (Math.sin(asrAlt) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
    if (!Number.isFinite(c) || c < -1 || c > 1) return null;
    var hourAngle = Math.acos(c);
    var minutesAfterNoon = toDegrees(hourAngle) * 4;
    return new Date(solarNoon.getTime() + minutesAfterNoon * 60000);
  }

  function getPrayerTimesForDate(date, lat, lon, method) {
    if (!globalScope.SunCalc || typeof globalScope.SunCalc.getTimes !== "function") {
      return fallbackPrayerTimes(date, lat, lon);
    }

    var times = globalScope.SunCalc.getTimes(date, lat, lon);
    var fajr = solveSolarAngleTime(date, lat, lon, method.fajrAngle, times.dawn || date.getTime(), -1) || times.dawn || null;
    var isha = solveSolarAngleTime(date, lat, lon, method.ishaAngle, times.dusk || date.getTime(), 1) || times.dusk || null;
    var asr = computeAsrTime(date, lat, times.solarNoon || null, 1);

    return {
      fajr: fajr,
      sunrise: times.sunrise || null,
      dhuhr: times.solarNoon || null,
      asr: asr || null,
      maghreb: times.sunset || null,
      isha: isha
    };
  }

  function toSerializablePrayerTimes(times) {
    return {
      fajr: times.fajr ? times.fajr.toISOString() : null,
      sunrise: times.sunrise ? times.sunrise.toISOString() : null,
      dhuhr: times.dhuhr ? times.dhuhr.toISOString() : null,
      asr: times.asr ? times.asr.toISOString() : null,
      maghreb: times.maghreb ? times.maghreb.toISOString() : null,
      isha: times.isha ? times.isha.toISOString() : null
    };
  }

  function toServicePrayerTimes(times) {
    if (!times) return null;
    return {
      fajr: times.fajr || null,
      sunrise: times.sunrise || null,
      dhuhr: times.dhuhr || null,
      asr: times.asr || null,
      maghreb: times.maghreb || null,
      isha: times.isha || null
    };
  }

  function resolveMethodFromInput(input, fallbackMethod) {
    var base = fallbackMethod || PRAYER_METHODS.MWL;
    if (!input || typeof input !== "object") return base;

    var currentMethod = input.currentMethod;
    if (currentMethod && Number.isFinite(Number(currentMethod.fajrAngle)) && Number.isFinite(Number(currentMethod.ishaAngle))) {
      return {
        key: String(currentMethod.key || input.prayerMethod || "CUSTOM"),
        fajrAngle: Number(currentMethod.fajrAngle),
        ishaAngle: Number(currentMethod.ishaAngle),
        label: String(currentMethod.label || currentMethod.key || "Custom")
      };
    }

    var methodKey = String(input.prayerMethod || "").trim();
    if (methodKey && Object.prototype.hasOwnProperty.call(PRAYER_METHODS, methodKey)) {
      var selected = PRAYER_METHODS[methodKey];
      return {
        key: methodKey,
        fajrAngle: selected.fajrAngle,
        ishaAngle: selected.ishaAngle,
        label: selected.label
      };
    }

    var customFajr = Number(input.customFajrAngle);
    var customIsha = Number(input.customIshaAngle);
    if (Number.isFinite(customFajr) && Number.isFinite(customIsha)) {
      return {
        key: "CUSTOM",
        fajrAngle: customFajr,
        ishaAngle: customIsha,
        label: "Custom"
      };
    }

    return base;
  }

  function createIslamicTemplate(ctx) {
    var state = {
      guideVisibility: Object.assign({}, DEFAULT_GUIDES),
      selectedMethod: "MWL",
      customFajrAngle: -12.0,
      customIshaAngle: -18.0,
      prayerPanelVisible: true,
      overlayIds: [],
      panelId: null,
      widgetId: null,
      settings: {},
      lastPrayerTimes: null
    };

    function persistSettings() {
      ctx.storage.set(STORAGE_KEYS.guideVisibility, clonePlainObject(state.guideVisibility));
      ctx.storage.set(STORAGE_KEYS.prayerMethod, state.selectedMethod);
      ctx.storage.set(STORAGE_KEYS.customFajrAngle, state.customFajrAngle);
      ctx.storage.set(STORAGE_KEYS.customIshaAngle, state.customIshaAngle);
      ctx.storage.set(STORAGE_KEYS.prayerPanelVisible, state.prayerPanelVisible);
      writeCookie(LEGACY_COOKIE_KEYS.prayerMethod, state.selectedMethod, 365);
      writeCookie(LEGACY_COOKIE_KEYS.customFajrAngle, state.customFajrAngle, 365);
      writeCookie(LEGACY_COOKIE_KEYS.customIshaAngle, state.customIshaAngle, 365);
    }

    function currentMethodConfig() {
      if (state.selectedMethod === "CUSTOM") {
        return {
          key: "CUSTOM",
          fajrAngle: state.customFajrAngle,
          ishaAngle: state.customIshaAngle,
          label: "Custom"
        };
      }
      var selected = PRAYER_METHODS[state.selectedMethod] || PRAYER_METHODS.MWL;
      return {
        key: state.selectedMethod,
        fajrAngle: selected.fajrAngle,
        ishaAngle: selected.ishaAngle,
        label: selected.label
      };
    }

    function updateRegisteredSetting(settingId, nextValue) {
      if (!settingId) return null;
      return ctx.settings.updateSetting(settingId, nextValue);
    }

    function syncRegisteredSettings() {
      updateRegisteredSetting(state.settings.guideVisibility, clonePlainObject(state.guideVisibility));
      updateRegisteredSetting(state.settings.prayerMethod, state.selectedMethod);
      updateRegisteredSetting(state.settings.customFajrAngle, state.customFajrAngle);
      updateRegisteredSetting(state.settings.customIshaAngle, state.customIshaAngle);
      updateRegisteredSetting(state.settings.prayerPanelVisible, state.prayerPanelVisible);
    }

    function getTemplateState() {
      return {
        guideVisibility: clonePlainObject(state.guideVisibility),
        prayer: {
          methodKey: state.selectedMethod,
          customFajrAngle: state.customFajrAngle,
          customIshaAngle: state.customIshaAngle,
          panelVisible: state.prayerPanelVisible,
          currentMethod: currentMethodConfig()
        },
        prayerTimes: toServicePrayerTimes(state.lastPrayerTimes)
      };
    }

    function setGuideVisibility(key, enabled) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_GUIDES, key)) return getTemplateState();
      state.guideVisibility[key] = !!enabled;
      persistSettings();
      syncRegisteredSettings();
      return getTemplateState();
    }

    function setPrayerMethod(methodKey) {
      var nextMethod = Object.prototype.hasOwnProperty.call(PRAYER_METHODS, methodKey) ? methodKey : "CUSTOM";
      state.selectedMethod = nextMethod;
      if (nextMethod !== "CUSTOM") {
        state.customFajrAngle = PRAYER_METHODS[nextMethod].fajrAngle;
        state.customIshaAngle = PRAYER_METHODS[nextMethod].ishaAngle;
      }
      persistSettings();
      syncRegisteredSettings();
      syncPrayerTimes(ctx.getState());
      return getTemplateState();
    }

    function setCustomPrayerAngles(payload) {
      var nextFajr = payload && Number.isFinite(Number(payload.fajrAngle)) ? Number(payload.fajrAngle) : state.customFajrAngle;
      var nextIsha = payload && Number.isFinite(Number(payload.ishaAngle)) ? Number(payload.ishaAngle) : state.customIshaAngle;
      state.selectedMethod = "CUSTOM";
      state.customFajrAngle = nextFajr;
      state.customIshaAngle = nextIsha;
      persistSettings();
      syncRegisteredSettings();
      syncPrayerTimes(ctx.getState());
      return getTemplateState();
    }

    function setPrayerPanelVisible(enabled) {
      state.prayerPanelVisible = !!enabled;
      persistSettings();
      syncRegisteredSettings();
      return getTemplateState();
    }

    function syncPrayerTimes(runtimeState) {
      if (!runtimeState || !Number.isFinite(runtimeState.lat) || !Number.isFinite(runtimeState.lon)) {
        return null;
      }
      var date = runtimeState.date instanceof Date ? runtimeState.date : new Date(runtimeState.date || Date.now());
      var method = currentMethodConfig();
      var prayerTimes = getPrayerTimesForDate(date, runtimeState.lat, runtimeState.lon, method);
      state.lastPrayerTimes = prayerTimes;
      ctx.storage.set("prayer_schedule", toSerializablePrayerTimes(prayerTimes));
      ctx.storage.set("prayer_schedule_meta", {
        methodKey: state.selectedMethod,
        lat: runtimeState.lat,
        lon: runtimeState.lon,
        date: date.toISOString()
      });
      ctx.metrics.emit("template_islamic_prayer_times", {
        method: state.selectedMethod,
        lat: runtimeState.lat,
        lon: runtimeState.lon,
        date: date.toISOString(),
        prayers: Object.keys(prayerTimes)
      });
      return prayerTimes;
    }

    return {
      id: "islamic",
      displayName: "Islamic Template",
      hooks: {
        onInit: function onInit() {
          state.guideVisibility = readStoredGuideVisibility(ctx);
          state.selectedMethod = readStoredMethod(ctx);
          state.customFajrAngle = readStoredNumber(ctx, STORAGE_KEYS.customFajrAngle, LEGACY_COOKIE_KEYS.customFajrAngle, -12.0);
          state.customIshaAngle = readStoredNumber(ctx, STORAGE_KEYS.customIshaAngle, LEGACY_COOKIE_KEYS.customIshaAngle, -18.0);
          state.prayerPanelVisible = readStoredPrayerPanelVisibility(ctx);
          state.settings.guideVisibility = ctx.settings.registerSetting({
            id: "islamic.guideVisibility",
            label: "Guide visibility",
            value: clonePlainObject(state.guideVisibility)
          });
          state.settings.prayerMethod = ctx.settings.registerSetting({
            id: "islamic.prayer.method",
            label: "Prayer method",
            value: state.selectedMethod
          });
          state.settings.customFajrAngle = ctx.settings.registerSetting({
            id: "islamic.prayer.customFajrAngle",
            label: "Custom fajr angle",
            value: state.customFajrAngle
          });
          state.settings.customIshaAngle = ctx.settings.registerSetting({
            id: "islamic.prayer.customIshaAngle",
            label: "Custom isha angle",
            value: state.customIshaAngle
          });
          state.settings.prayerPanelVisible = ctx.settings.registerSetting({
            id: "islamic.prayer.panelVisible",
            label: "Prayer panel visibility",
            value: state.prayerPanelVisible
          });
          ctx.actions.registerAction({
            id: "islamic.guide.toggle",
            label: "Toggle Islamic guide",
            run: function run(payload) {
              var key = payload && payload.key;
              if (!Object.prototype.hasOwnProperty.call(DEFAULT_GUIDES, key)) return getTemplateState();
              return setGuideVisibility(key, !state.guideVisibility[key]);
            }
          });
          ctx.actions.registerAction({
            id: "islamic.guide.setVisibility",
            label: "Set Islamic guide visibility",
            run: function run(payload) {
              var key = payload && payload.key;
              return setGuideVisibility(key, !!(payload && payload.enabled));
            }
          });
          ctx.actions.registerAction({
            id: "islamic.prayer.method.set",
            label: "Set prayer method",
            run: function run(payload) {
              return setPrayerMethod(payload && payload.methodKey);
            }
          });
          ctx.actions.registerAction({
            id: "islamic.prayer.customAngles.set",
            label: "Set custom prayer angles",
            run: function run(payload) {
              return setCustomPrayerAngles(payload || {});
            }
          });
          ctx.actions.registerAction({
            id: "islamic.prayer.panelVisible.set",
            label: "Set prayer panel visibility",
            run: function run(payload) {
              return setPrayerPanelVisible(!!(payload && payload.visible));
            }
          });
          if (ctx.getCapabilities().includes("overlay.landmarks")) {
            Object.keys(LANDMARKS).forEach(function eachLandmark(key) {
              var site = LANDMARKS[key];
              var overlayId = ctx.map.addOverlay({
                id: "holy-site-" + site.id,
                type: "landmark",
                category: "holy-site",
                label: site.name,
                lat: site.lat,
                lon: site.lon
              });
              if (overlayId) state.overlayIds.push(overlayId);
            });
          }
          if (ctx.getCapabilities().includes("ui.panel")) {
            state.panelId = ctx.ui.registerPanel({
              id: "islamic-prayer-times",
              title: "Prayer Times",
              type: "prayer-times",
              templateId: "islamic"
            });
            state.widgetId = ctx.ui.registerWidget({
              id: "islamic-prayer-widget",
              type: "prayer-summary",
              templateId: "islamic"
            });
          }
          persistSettings();
          syncRegisteredSettings();
          syncPrayerTimes(ctx.getState());
          ctx.metrics.emit("template_islamic_init", {
            method: state.selectedMethod,
            landmarks: Object.keys(LANDMARKS)
          });
        },
        onLocationTimeChange: function onLocationTimeChange(_, runtimeState) {
          syncPrayerTimes(runtimeState);
          ctx.metrics.emit("template_islamic_location_time", {
            lat: runtimeState.lat,
            lon: runtimeState.lon,
            date: runtimeState.date instanceof Date ? runtimeState.date.toISOString() : String(runtimeState.date)
          });
        },
        onDispose: function onDispose() {
          state.overlayIds.forEach(function removeOverlay(overlayId) {
            ctx.map.removeOverlay(overlayId);
          });
          state.overlayIds = [];
          if (state.panelId) {
            ctx.ui.unregisterPanel(state.panelId);
            state.panelId = null;
          }
          if (state.widgetId) {
            ctx.ui.unregisterWidget(state.widgetId);
            state.widgetId = null;
          }
          persistSettings();
        }
      },
      metadata: {
        labels: LABELS,
        defaultGuides: clonePlainObject(DEFAULT_GUIDES),
        landmarks: clonePlainObject(LANDMARKS),
        prayer: {
          methods: clonePlainObject(PRAYER_METHODS),
          commonMethodKeys: COMMON_METHOD_KEYS.slice(),
          languageMethodKeys: clonePlainObject(LANGUAGE_METHOD_KEYS)
        }
      },
      services: {
        getLandmarks: function getLandmarks() {
          return clonePlainObject(LANDMARKS);
        },
        getPrayerMethods: function getPrayerMethods() {
          return clonePlainObject(PRAYER_METHODS);
        },
        getCurrentPrayerTimes: function getCurrentPrayerTimes() {
          return toServicePrayerTimes(state.lastPrayerTimes);
        },
        computePrayerTimes: function computePrayerTimes(input) {
          if (!input) return null;
          var date = input.date instanceof Date ? input.date : new Date(input.date || Date.now());
          var lat = Number(input.lat);
          var lon = Number(input.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
          var method = resolveMethodFromInput(input, currentMethodConfig());
          return toServicePrayerTimes(getPrayerTimesForDate(date, lat, lon, method));
        },
        getGuideVisibility: function getGuideVisibility() {
          return clonePlainObject(state.guideVisibility);
        },
        getPrayerState: function getPrayerState() {
          return {
            methodKey: state.selectedMethod,
            customFajrAngle: state.customFajrAngle,
            customIshaAngle: state.customIshaAngle,
            panelVisible: state.prayerPanelVisible,
            currentMethod: currentMethodConfig()
          };
        },
        getState: function getState() {
          return getTemplateState();
        }
      }
    };
  }

  globalScope.LunarCore = globalScope.LunarCore || {};
  globalScope.LunarCore.templates = globalScope.LunarCore.templates || {};
  globalScope.LunarCore.templates.islamic = {
    id: "islamic",
    displayName: "Islamic Template",
    capabilities: ["ui.panel", "overlay.landmarks", "overlay.lines", "storage.local"],
    metadata: {
      labels: LABELS,
      defaultGuides: DEFAULT_GUIDES,
      landmarks: LANDMARKS,
      prayer: {
        methods: PRAYER_METHODS,
        commonMethodKeys: COMMON_METHOD_KEYS,
        languageMethodKeys: LANGUAGE_METHOD_KEYS
      }
    },
    createTemplate: createIslamicTemplate
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
