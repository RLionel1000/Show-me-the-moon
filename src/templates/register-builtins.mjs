(function registerBuiltins(globalScope) {
  "use strict";

  function registerBuiltInTemplates(runtime) {
    if (!runtime || typeof runtime.registerTemplate !== "function") {
      throw new Error("A valid runtime is required");
    }

    var templates = (globalScope.LunarCore && globalScope.LunarCore.templates) || {};
    var ids = Object.keys(templates);
    for (var i = 0; i < ids.length; i += 1) {
      runtime.registerTemplate(templates[ids[i]]);
    }
    return ids;
  }

  globalScope.LunarCore = globalScope.LunarCore || {};
  globalScope.LunarCore.registerBuiltInTemplates = registerBuiltInTemplates;
})(typeof globalThis !== "undefined" ? globalThis : window);
