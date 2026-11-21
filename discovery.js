"use strict";

// QQ's webpack module IDs, export names and enum values change between builds.
// Discover only modules QQ actually executes; never require arbitrary modules.
exports.install = function install({ Module, report = () => {}, timeout = 30000 }) {
  const originalLoad = Module._load;
  const wrappers = new WeakMap();
  const replacements = [];
  const services = new WeakSet();
  const instances = new Set();
  let hideType;
  let hooked = false;
  let removed = false;
  let stopped = false;
  let timer;

  function emit(stage, details = {}) {
    try { report(stage, details); } catch { /* Logging must not break QQ. */ }
  }

  function remove(service) {
    const table = service.mapperShortcutBuildIn;
    if (!table || hideType === undefined) return;
    const model = table[hideType];
    if (!model) return;
    // Match the action AND the exact chord, preserving every other shortcut.
    const keys = model.keys;
    if (model.type !== hideType || !Array.isArray(keys) || keys.length !== 2 ||
        !keys.includes("KeyH") ||
        !keys.some(key => key === "ControlLeft" || key === "ControlRight") ||
        !/^(?:control|ctrl)\+h$/i.test(model.acc || "")) {
      emit("unexpected-shortcut-model");
      return;
    }
    delete table[hideType];
    removed = true;
    emit("disabled", { shortcut: "HideAllWindow", accelerator: model.acc });
  }

  function cleanup() {
    if (stopped) return;
    stopped = true;
    if (timer) clearTimeout(timer);
    if (Module._load === load) Module._load = originalLoad;
    for (const [table, key, original, wrapper] of replacements) {
      if (table[key] === wrapper) table[key] = original;
    }
    replacements.length = 0;
  }

  function inspect(value) {
    if (!value || !["function", "object"].includes(typeof value)) return;
    if (typeof value === "object" &&
        ["HideAllWindow", "ToggleMainWindow", "QuitApp", "ScreenShot"]
          .every(key => Object.hasOwn(value, key) && Number.isInteger(value[key]))) {
      hideType = value.HideAllWindow;
      for (const service of instances) remove(service);
    }
    if (typeof value === "function" && value.prototype && !services.has(value)) {
      const proto = value.prototype;
      if (["initShortcutBuildIn", "registerAllShortcut", "unregisterShortcut", "getShortcutModel"]
          .every(key => typeof Object.getOwnPropertyDescriptor(proto, key)?.value === "function")) {
        services.add(value);
        const init = proto.initShortcutBuildIn;
        proto.initShortcutBuildIn = function (...args) {
          instances.add(this);
          const result = Reflect.apply(init, this, args);
          remove(this);
          return result;
        };
        const register = proto.registerAllShortcut;
        proto.registerAllShortcut = function (...args) {
          instances.add(this);
          remove(this);
          return Reflect.apply(register, this, args);
        };
        hooked = true;
        emit("hooked");
      }
    }
    if (hooked && hideType !== undefined) cleanup();
  }

  function inspectExports(exports) {
    inspect(exports);
    if (!exports || !["object", "function"].includes(typeof exports)) return;
    for (const key of Object.getOwnPropertyNames(exports)) {
      // Webpack uses getters for live exports; an unfinished cyclic export can
      // throw a TDZ error. Skip it and inspect again after module execution.
      try { inspect(exports[key]); } catch { /* Not a compatible export. */ }
    }
  }

  function wrap(table) {
    if (stopped || !table) return;
    for (const key of Object.keys(table)) {
      const original = table[key];
      if (typeof original !== "function" || wrappers.has(original)) continue;
      const wrapper = function (mod, exports, require) {
        if (!stopped && typeof require === "function" && require.m) {
          wrap(require.m);
          if (require.c) for (const cached of Object.values(require.c)) {
            try { inspectExports(cached.exports); } catch { /* Ignore unrelated modules. */ }
          }
        }
        const result = Reflect.apply(original, this, arguments);
        if (!stopped) {
          try { inspectExports(mod.exports); } catch { /* Leave QQ running. */ }
        }
        return result;
      };
      wrappers.set(original, wrapper);
      wrappers.set(wrapper, wrapper);
      replacements.push([table, key, original, wrapper]);
      table[key] = wrapper;
    }
  }

  function load(id) {
    const result = Reflect.apply(originalLoad, this, arguments);
    if (!stopped && typeof id === "string" && /(?:^|[\\/])[^\\/]*\.background\.js$/.test(id)) {
      wrap(result?.modules);
    }
    return result;
  }

  Module._load = load;
  emit("waiting-for-service");
  timer = setTimeout(() => {
    if (!removed) emit(hooked ? "waiting-for-initialization" : "service-not-found");
    cleanup();
  }, timeout);
  timer.unref?.();
  return { stop: cleanup };
};
