(function bootstrapTemplateRuntime(globalScope) {
  "use strict";

  var CORE_API_VERSION = "0.1.0";
  var MAX_METRICS_EVENTS = 500;
  var ALLOWED_CAPABILITIES = new Set([
    "ui.panel",
    "overlay.landmarks",
    "overlay.lines",
    "storage.local",
    "network.http"
  ]);

  function createTemplateRuntime(options) {
    var opts = options || {};
    var now = typeof opts.now === "function" ? opts.now : function defaultNow() { return Date.now(); };
    var templates = new Map();
    var metricsEvents = [];
    var state = Object.assign(
      {
        lat: 48.8566,
        lon: 2.3522,
        date: new Date(),
        lang: "fr",
        moon: {},
        sun: {},
        fps: 0
      },
      opts.initialState || {}
    );

    var active = null;
    var inMemoryStorage = new Map();
    var overlays = new Map();
    var panels = new Map();
    var widgets = new Map();
    var actions = new Map();
    var settings = new Map();
    var eventHandlers = new Map();
    var hostDiagnosticsProvider = null;

    function emitMetric(eventName, payload) {
      metricsEvents.push({ eventName: eventName, payload: payload || null, ts: now() });
      if (metricsEvents.length > MAX_METRICS_EVENTS) {
        metricsEvents.splice(0, metricsEvents.length - MAX_METRICS_EVENTS);
      }
    }

    function normalizeCapabilities(capabilities) {
      if (!Array.isArray(capabilities)) return [];
      var seen = new Set();
      var result = [];
      for (var i = 0; i < capabilities.length; i += 1) {
        var cap = capabilities[i];
        if (!ALLOWED_CAPABILITIES.has(cap) || seen.has(cap)) continue;
        seen.add(cap);
        result.push(cap);
      }
      return result;
    }

    function emit(eventName, payload) {
      var handlers = eventHandlers.get(eventName);
      if (!handlers || handlers.size === 0) return;
      handlers.forEach(function eachHandler(entry) {
        try {
          entry.handler(payload);
        } catch (error) {
          emitMetric("template_error", {
            where: "events." + eventName,
            message: String(error && error.message ? error.message : error)
          });
        }
      });
    }

    function namespaceKey(templateId, key) {
      return templateId + "::" + key;
    }

    function removeOwnedEntries(map, templateId) {
      Array.from(map.keys()).forEach(function eachKey(key) {
        var entry = map.get(key);
        if (entry && entry.templateId === templateId) {
          map.delete(key);
        }
      });
    }

    function cleanupTemplateResources(templateId) {
      if (!templateId) return;
      removeOwnedEntries(overlays, templateId);
      removeOwnedEntries(panels, templateId);
      removeOwnedEntries(widgets, templateId);
      removeOwnedEntries(actions, templateId);
      removeOwnedEntries(settings, templateId);
      Array.from(eventHandlers.keys()).forEach(function eachEventName(eventName) {
        var entries = eventHandlers.get(eventName);
        if (!entries || entries.size === 0) return;
        Array.from(entries).forEach(function eachEntry(entry) {
          if (entry && entry.templateId === templateId) {
            entries.delete(entry);
          }
        });
        if (entries.size === 0) {
          eventHandlers.delete(eventName);
        }
      });
    }

    function createContext(templateEntry) {
      return {
        getState: function getState() {
          return Object.assign({}, state);
        },
        getCapabilities: function getCapabilities() {
          return templateEntry.capabilities.slice();
        },
        ui: {
          registerPanel: function registerPanel(panelDef) {
            if (!templateEntry.capabilities.includes("ui.panel")) return null;
            var panelId = panelDef && panelDef.id ? panelDef.id : templateEntry.id + "-panel-" + (panels.size + 1);
            panels.set(panelId, Object.assign({}, panelDef || {}, { id: panelId, templateId: templateEntry.id }));
            emitMetric("template_panel_registered", { templateId: templateEntry.id, panelId: panelId });
            return panelId;
          },
          unregisterPanel: function unregisterPanel(panelId) {
            panels.delete(panelId);
          },
          registerWidget: function registerWidget(widgetDef) {
            var widgetId = widgetDef && widgetDef.id ? widgetDef.id : templateEntry.id + "-widget-" + (widgets.size + 1);
            widgets.set(widgetId, Object.assign({}, widgetDef || {}, { id: widgetId, templateId: templateEntry.id }));
            emitMetric("template_widget_registered", { templateId: templateEntry.id, widgetId: widgetId });
            return widgetId;
          },
          unregisterWidget: function unregisterWidget(widgetId) {
            widgets.delete(widgetId);
          }
        },
        map: {
          addOverlay: function addOverlay(overlayDef) {
            var overlayId = overlayDef && overlayDef.id ? overlayDef.id : templateEntry.id + "-overlay-" + (overlays.size + 1);
            overlays.set(overlayId, Object.assign({}, overlayDef || {}, { id: overlayId, templateId: templateEntry.id }));
            emitMetric("template_overlay_count", { templateId: templateEntry.id, count: overlays.size });
            return overlayId;
          },
          removeOverlay: function removeOverlay(overlayId) {
            overlays.delete(overlayId);
            emitMetric("template_overlay_count", { templateId: templateEntry.id, count: overlays.size });
          }
        },
        actions: {
          registerAction: function registerAction(actionDef) {
            if (!actionDef || typeof actionDef.id !== "string" || typeof actionDef.run !== "function") {
              throw new Error("Invalid template action");
            }
            var actionId = actionDef.id;
            actions.set(actionId, {
              id: actionId,
              label: actionDef.label || actionId,
              run: actionDef.run,
              templateId: templateEntry.id
            });
            emitMetric("template_action_registered", { templateId: templateEntry.id, actionId: actionId });
            return actionId;
          },
          unregisterAction: function unregisterAction(actionId) {
            actions.delete(actionId);
          }
        },
        settings: {
          registerSetting: function registerSetting(settingDef) {
            if (!settingDef || typeof settingDef.id !== "string") {
              throw new Error("Invalid template setting");
            }
            var settingId = settingDef.id;
            settings.set(settingId, Object.assign({}, settingDef || {}, { id: settingId, templateId: templateEntry.id }));
            emitMetric("template_setting_registered", { templateId: templateEntry.id, settingId: settingId });
            return settingId;
          },
          unregisterSetting: function unregisterSetting(settingId) {
            settings.delete(settingId);
          },
          updateSetting: function updateSetting(settingId, nextValue) {
            var current = settings.get(settingId);
            if (!current || current.templateId !== templateEntry.id) return null;
            var updated = Object.assign({}, current, { value: nextValue });
            settings.set(settingId, updated);
            return Object.assign({}, updated);
          },
          getSetting: function getSetting(settingId) {
            var current = settings.get(settingId);
            return current ? Object.assign({}, current) : null;
          }
        },
        storage: {
          get: function getStorage(key) {
            return inMemoryStorage.get(namespaceKey(templateEntry.id, key));
          },
          set: function setStorage(key, value) {
            inMemoryStorage.set(namespaceKey(templateEntry.id, key), value);
          }
        },
        events: {
          on: function on(eventName, handler) {
            if (!eventHandlers.has(eventName)) eventHandlers.set(eventName, new Set());
            var entries = eventHandlers.get(eventName);
            var duplicate = Array.from(entries).some(function sameHandler(entry) {
              return entry && entry.templateId === templateEntry.id && entry.handler === handler;
            });
            if (!duplicate) {
              entries.add({
                templateId: templateEntry.id,
                handler: handler
              });
            }
          },
          off: function off(eventName, handler) {
            if (!eventHandlers.has(eventName)) return;
            var entries = eventHandlers.get(eventName);
            Array.from(entries).forEach(function eachEntry(entry) {
              if (entry && entry.templateId === templateEntry.id && entry.handler === handler) {
                entries.delete(entry);
              }
            });
            if (entries.size === 0) {
              eventHandlers.delete(eventName);
            }
          }
        },
        metrics: {
          emit: emitMetric
        }
      };
    }

    function runHook(hookName, fn, context, payload) {
      if (typeof fn !== "function") return;
      if (hookName === "onFrame") {
        try {
          fn(context, payload);
        } catch (error) {
          emitMetric("template_error", {
            templateId: active ? active.id : null,
            hook: hookName,
            message: String(error && error.message ? error.message : error)
          });
        }
        return;
      }
      var start = now();
      try {
        fn(context, payload);
      } catch (error) {
        emitMetric("template_error", {
          templateId: active ? active.id : null,
          hook: hookName,
          message: String(error && error.message ? error.message : error)
        });
      } finally {
        emitMetric("template_hook_duration_ms", {
          templateId: active ? active.id : null,
          hook: hookName,
          durationMs: now() - start
        });
      }
    }

    function registerTemplate(registration) {
      if (!registration || typeof registration.id !== "string" || typeof registration.createTemplate !== "function") {
        throw new Error("Invalid template registration");
      }
      var entry = {
        id: registration.id,
        displayName: registration.displayName || registration.id,
        createTemplate: registration.createTemplate,
        capabilities: normalizeCapabilities(registration.capabilities || []),
        metadata: Object.assign({}, registration.metadata || {})
      };
      templates.set(entry.id, entry);
      return entry.id;
    }

    function activateTemplate(templateId) {
      var entry = templates.get(templateId);
      if (!entry) throw new Error("Unknown template: " + templateId);

      if (active) {
        runHook("onDispose", active.hooks && active.hooks.onDispose, active.context);
        cleanupTemplateResources(active.id);
      }

      var context = createContext(entry);
      var instance = entry.createTemplate(context) || {};
      active = {
        id: entry.id,
        displayName: instance.displayName || entry.displayName,
        capabilities: entry.capabilities.slice(),
        hooks: instance.hooks || {},
        context: context,
        metadata: Object.assign({}, entry.metadata || {}, instance.metadata || {}, instance.config || {}),
        services: Object.assign({}, instance.services || {})
      };

      emitMetric("template_loaded", {
        templateId: active.id,
        coreApiVersion: CORE_API_VERSION,
        capabilities: active.capabilities.slice()
      });
      emit("template_loaded", { templateId: active.id });
      runHook("onInit", active.hooks.onInit, active.context);
      return active.id;
    }

    function updateState(nextState) {
      state = Object.assign({}, state, nextState || {});
      if (state.date && !(state.date instanceof Date)) {
        state.date = new Date(state.date);
      }
      if (active) {
        runHook("onLocationTimeChange", active.hooks.onLocationTimeChange, active.context, Object.assign({}, state));
      }
    }

    function frame(frameInfo) {
      if (!active) return;
      runHook("onFrame", active.hooks.onFrame, active.context, frameInfo || {});
    }

    function dispose() {
      if (!active) return;
      runHook("onDispose", active.hooks.onDispose, active.context);
      cleanupTemplateResources(active.id);
      active = null;
    }

    function invokeAction(actionId, payload) {
      var action = actions.get(actionId);
      if (!action || !active || action.templateId !== active.id) {
        return null;
      }
      return action.run(payload, active.context, Object.assign({}, state));
    }

    function getActiveTemplate() {
      if (!active) return null;
      return {
        id: active.id,
        displayName: active.displayName,
        capabilities: active.capabilities.slice(),
        metadata: Object.assign({}, active.metadata || {})
      };
    }

    function getActiveTemplateServices() {
      return active ? Object.assign({}, active.services || {}) : null;
    }

    function getActiveTemplateMetadata() {
      return active ? Object.assign({}, active.metadata || {}) : null;
    }

    function getDiagnostics() {
      var hostDiagnostics = null;
      if (typeof hostDiagnosticsProvider === "function") {
        try {
          hostDiagnostics = hostDiagnosticsProvider();
        } catch (error) {
          hostDiagnostics = {
            error: String(error && error.message ? error.message : error)
          };
        }
      }
      return {
        coreApiVersion: CORE_API_VERSION,
        activeTemplateId: active ? active.id : null,
        activeTemplateCapabilities: active ? active.capabilities.slice() : [],
        registeredTemplates: Array.from(templates.keys()),
        overlayCount: overlays.size,
        panelCount: panels.size,
        widgetCount: widgets.size,
        actionCount: actions.size,
        settingCount: settings.size,
        panelIds: Array.from(panels.keys()),
        widgetIds: Array.from(widgets.keys()),
        actionIds: Array.from(actions.keys()),
        settingIds: Array.from(settings.keys()),
        metricsEvents: metricsEvents.slice(),
        hostDiagnostics: hostDiagnostics
      };
    }

    function setHostDiagnosticsProvider(provider) {
      hostDiagnosticsProvider = typeof provider === "function" ? provider : null;
    }

    return {
      registerTemplate: registerTemplate,
      activateTemplate: activateTemplate,
      updateState: updateState,
      frame: frame,
      dispose: dispose,
      invokeAction: invokeAction,
      emit: emit,
      setHostDiagnosticsProvider: setHostDiagnosticsProvider,
      getActiveTemplate: getActiveTemplate,
      getActiveTemplateServices: getActiveTemplateServices,
      getActiveTemplateMetadata: getActiveTemplateMetadata,
      getState: function getState() { return Object.assign({}, state); },
      getDiagnostics: getDiagnostics
    };
  }

  globalScope.LunarCore = globalScope.LunarCore || {};
  globalScope.LunarCore.coreApiVersion = CORE_API_VERSION;
  globalScope.LunarCore.createTemplateRuntime = createTemplateRuntime;
})(typeof globalThis !== "undefined" ? globalThis : window);
