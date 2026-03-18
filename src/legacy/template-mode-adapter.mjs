(function legacyTemplateModeAdapter(globalScope) {
  "use strict";

  function createLegacyTemplateModeAdapter(options) {
    var opts = options || {};
    var storageKey = opts.storageKey || "lunar_template_mode";
    var mode = (opts.defaultMode || "islamic").toLowerCase() === "core" ? "core" : "islamic";

    var listeners = new Set();

    function readPersistedMode(storage) {
      if (!storage || typeof storage.getItem !== "function") return mode;
      var stored = (storage.getItem(storageKey) || "").toLowerCase();
      return stored === "core" || stored === "islamic" ? stored : mode;
    }

    function persistMode(storage, nextMode) {
      if (!storage || typeof storage.setItem !== "function") return;
      storage.setItem(storageKey, nextMode);
    }

    function notify(nextMode) {
      listeners.forEach(function eachListener(listener) {
        listener(nextMode);
      });
    }

    function setMode(nextMode, storage) {
      mode = nextMode === "core" ? "core" : "islamic";
      persistMode(storage, mode);
      notify(mode);
      return mode;
    }

    function onChange(listener) {
      if (typeof listener !== "function") return function noop() {};
      listeners.add(listener);
      return function unsubscribe() { listeners.delete(listener); };
    }

    return {
      initFromStorage: function initFromStorage(storage) {
        mode = readPersistedMode(storage);
        notify(mode);
        return mode;
      },
      getMode: function getMode() {
        return mode;
      },
      setMode: setMode,
      onChange: onChange
    };
  }

  globalScope.LunarCore = globalScope.LunarCore || {};
  globalScope.LunarCore.createLegacyTemplateModeAdapter = createLegacyTemplateModeAdapter;
})(typeof globalThis !== "undefined" ? globalThis : window);
