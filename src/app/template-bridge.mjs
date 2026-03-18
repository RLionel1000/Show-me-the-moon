(function registerTemplateHostBridge(globalScope) {
  "use strict";

  function createTemplateHostBridge(options) {
    var opts = options || {};
    var runtime = opts.runtime;
    if (!runtime) {
      throw new Error("A runtime instance is required");
    }

    function getActiveTemplate() {
      return typeof runtime.getActiveTemplate === "function" ? runtime.getActiveTemplate() : null;
    }

    function getActiveTemplateId() {
      var active = getActiveTemplate();
      return active && active.id ? active.id : null;
    }

    function getActiveMetadata() {
      return typeof runtime.getActiveTemplateMetadata === "function" ? runtime.getActiveTemplateMetadata() : null;
    }

    function getActiveServices() {
      return typeof runtime.getActiveTemplateServices === "function" ? runtime.getActiveTemplateServices() : null;
    }

    function syncState(nextState) {
      if (typeof runtime.updateState === "function") {
        runtime.updateState(nextState || {});
      }
      return getActiveTemplate();
    }

    function invokeAction(actionId, payload) {
      if (typeof runtime.invokeAction !== "function") return null;
      return runtime.invokeAction(actionId, payload || {});
    }

    return {
      syncState: syncState,
      getActiveTemplate: getActiveTemplate,
      getActiveTemplateId: getActiveTemplateId,
      getActiveMetadata: getActiveMetadata,
      getActiveServices: getActiveServices,
      getGuideVisibility: function getGuideVisibility() {
        var services = getActiveServices();
        return services && typeof services.getGuideVisibility === "function"
          ? services.getGuideVisibility()
          : null;
      },
      getPrayerState: function getPrayerState() {
        var services = getActiveServices();
        return services && typeof services.getPrayerState === "function"
          ? services.getPrayerState()
          : null;
      },
      getCurrentPrayerTimes: function getCurrentPrayerTimes() {
        var services = getActiveServices();
        return services && typeof services.getCurrentPrayerTimes === "function"
          ? services.getCurrentPrayerTimes()
          : null;
      },
      computePrayerTimes: function computePrayerTimes(input) {
        var services = getActiveServices();
        return services && typeof services.computePrayerTimes === "function"
          ? services.computePrayerTimes(input || {})
          : null;
      },
      setGuideVisibility: function setGuideVisibility(key, enabled) {
        return invokeAction("islamic.guide.setVisibility", { key: key, enabled: enabled });
      },
      toggleGuide: function toggleGuide(key) {
        return invokeAction("islamic.guide.toggle", { key: key });
      },
      setPrayerMethod: function setPrayerMethod(methodKey) {
        return invokeAction("islamic.prayer.method.set", { methodKey: methodKey });
      },
      setCustomPrayerAngles: function setCustomPrayerAngles(fajrAngle, ishaAngle) {
        return invokeAction("islamic.prayer.customAngles.set", {
          fajrAngle: fajrAngle,
          ishaAngle: ishaAngle
        });
      },
      setPrayerPanelVisible: function setPrayerPanelVisible(visible) {
        return invokeAction("islamic.prayer.panelVisible.set", { visible: visible });
      }
    };
  }

  globalScope.LunarCore = globalScope.LunarCore || {};
  globalScope.LunarCore.createTemplateHostBridge = createTemplateHostBridge;
})(typeof globalThis !== "undefined" ? globalThis : window);
