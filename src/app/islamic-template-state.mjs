export function createIslamicTemplateState(options) {
  const opts = options || {};
  const appServices = opts.appServices;
  const builtinPrayerMethods = opts.builtinPrayerMethods || {};

  function getBridge() {
    return typeof opts.getTemplateHostBridge === "function" ? opts.getTemplateHostBridge() : null;
  }

  function getServices() {
    const bridge = getBridge();
    if (!bridge || typeof bridge.getActiveServices !== "function") return null;
    return bridge.getActiveServices();
  }

  function getSnapshot() {
    const services = getServices();
    if (!services || typeof services.getState !== "function") return null;
    return services.getState();
  }

  function syncPrayerStateFromTemplate() {
    const snapshot = getSnapshot();
    if (!snapshot || !snapshot.prayer) return null;
    if (typeof opts.applyPrayerState === "function") {
      opts.applyPrayerState(snapshot.prayer);
    }
    const togglePrayerPanel = typeof opts.getPrayerPanelToggle === "function" ? opts.getPrayerPanelToggle() : null;
    if (togglePrayerPanel) {
      togglePrayerPanel.checked = !!snapshot.prayer.panelVisible;
    }
    const controller = typeof opts.getPrayerPanelController === "function" ? opts.getPrayerPanelController() : null;
    if (controller) {
      controller.syncFromTemplate();
      controller.updatePrayerMethodOptionLabels();
      controller.setAngleSelectValues();
    }
    return snapshot.prayer;
  }

  function syncGuideStateFromTemplate() {
    const snapshot = getSnapshot();
    if (!snapshot || !snapshot.guideVisibility) return null;
    if (typeof opts.applyGuideState === "function") {
      opts.applyGuideState(snapshot.guideVisibility);
    }
    return snapshot.guideVisibility;
  }

  function persistPrayerPrefs(state) {
    const prayerState = state || {};
    const prayerMethod = String(prayerState.prayerMethod || "MWL");
    const customFajrAngle = Number(prayerState.customFajrAngle);
    const customIshaAngle = Number(prayerState.customIshaAngle);
    const bridge = getBridge();

    if (bridge) {
      if (prayerMethod === "CUSTOM") {
        bridge.setCustomPrayerAngles(customFajrAngle, customIshaAngle);
        syncPrayerStateFromTemplate();
        return true;
      }
      if (Object.prototype.hasOwnProperty.call(builtinPrayerMethods, prayerMethod)) {
        bridge.setPrayerMethod(prayerMethod);
        syncPrayerStateFromTemplate();
        return true;
      }
      return false;
    }

    if (!appServices) return false;
    appServices.setCookie("lunar_prayer_method", prayerMethod, 365);
    appServices.setCookie("lunar_custom_fajr", customFajrAngle, 365);
    appServices.setCookie("lunar_custom_isha", customIshaAngle, 365);
    return true;
  }

  function loadPrayerPrefsFromStorage() {
    if (getBridge()) {
      syncPrayerStateFromTemplate();
      return true;
    }
    if (!appServices || typeof opts.applyPrayerState !== "function") return false;
    const prayerMethod = appServices.getCookie("lunar_prayer_method");
    const customFajrAngle = Number.parseFloat(appServices.getCookie("lunar_custom_fajr"));
    const customIshaAngle = Number.parseFloat(appServices.getCookie("lunar_custom_isha"));
    opts.applyPrayerState({
      methodKey: prayerMethod,
      customFajrAngle: Number.isFinite(customFajrAngle) ? customFajrAngle : undefined,
      customIshaAngle: Number.isFinite(customIshaAngle) ? customIshaAngle : undefined
    });
    return true;
  }

  function loadPrayerCountryPrefs(cookieKey) {
    if (!appServices) return {};
    const raw = appServices.getCookie(cookieKey);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function persistPrayerCountryPrefs(cookieKey, value) {
    if (!appServices) return false;
    try {
      appServices.setCookie(cookieKey, JSON.stringify(value || {}), 365);
      return true;
    } catch {
      return false;
    }
  }

  return {
    getServices,
    getSnapshot,
    syncPrayerStateFromTemplate,
    syncGuideStateFromTemplate,
    persistPrayerPrefs,
    loadPrayerPrefsFromStorage,
    loadPrayerCountryPrefs,
    persistPrayerCountryPrefs
  };
}
