(function registerCoreTemplate(globalScope) {
  "use strict";

  var CORE_METADATA = {
    kind: "core",
    labels: {},
    landmarks: {},
    prayer: {
      methods: {},
      commonMethodKeys: [],
      languageMethodKeys: {}
    },
    features: {
      guides: false,
      prayerPanel: false,
      domainWidgets: false
    }
  };

  function createCoreTemplate(ctx) {
    var state = {
      lastRuntimeState: ctx.getState()
    };

    return {
      id: "core",
      displayName: "Core Viewer",
      metadata: CORE_METADATA,
      hooks: {
        onInit: function onInit() {
          state.lastRuntimeState = ctx.getState();
        },
        onLocationTimeChange: function onLocationTimeChange(_, runtimeState) {
          state.lastRuntimeState = runtimeState || ctx.getState();
        },
        onFrame: function onFrame() {},
        onDispose: function onDispose() {}
      },
      services: {
        getLandmarks: function getLandmarks() {
          return {};
        },
        getPrayerMethods: function getPrayerMethods() {
          return {};
        },
        getCurrentPrayerTimes: function getCurrentPrayerTimes() {
          return null;
        },
        computePrayerTimes: function computePrayerTimes() {
          return null;
        },
        getGuideVisibility: function getGuideVisibility() {
          return {
            qibla: false,
            alquds: false,
            medina: false
          };
        },
        getPrayerState: function getPrayerState() {
          return {
            methodKey: null,
            customFajrAngle: null,
            customIshaAngle: null,
            panelVisible: false,
            currentMethod: null
          };
        },
        getState: function getState() {
          return {
            guideVisibility: {
              qibla: false,
              alquds: false,
              medina: false
            },
            prayer: {
              methodKey: null,
              customFajrAngle: null,
              customIshaAngle: null,
              panelVisible: false,
              currentMethod: null
            },
            prayerTimes: null,
            runtime: Object.assign({}, state.lastRuntimeState || {})
          };
        }
      }
    };
  }

  globalScope.LunarCore = globalScope.LunarCore || {};
  globalScope.LunarCore.templates = globalScope.LunarCore.templates || {};
  globalScope.LunarCore.templates.core = {
    id: "core",
    displayName: "Core Viewer",
    capabilities: [],
    metadata: CORE_METADATA,
    createTemplate: createCoreTemplate
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
