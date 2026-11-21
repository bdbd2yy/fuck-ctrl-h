"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { install } = require("../discovery.js");

function fixture({ type = 73, serviceId = 92001, enumId = 27, chord = "Control+H", lateEnum = false } = {}) {
  const states = [];
  class Service {
    initShortcutBuildIn() {
      this.mapperShortcutBuildIn = {
        [type]: { type, keys: ["ControlLeft", "KeyH"], acc: chord },
        888: { type: 888, keys: ["ControlLeft", "KeyJ"], acc: "Control+J" }
      };
      return "initialized";
    }
    registerAllShortcut() { return Object.values(this.mapperShortcutBuildIn).map(m => m.acc); }
    unregisterShortcut() {}
    getShortcutModel() {}
  }
  const modules = {
    [enumId]: mod => { mod.exports = { arbitraryExport: { HideAllWindow: type, ToggleMainWindow: 74, QuitApp: 75, ScreenShot: 76 } }; },
    [serviceId]: mod => { mod.exports = { renamedExport: Service }; }
  };
  const originalFactories = { ...modules };
  const Module = { _load: () => ({ modules }) };
  const originalLoad = Module._load;
  const handle = install({ Module, report: stage => states.push(stage) });
  const require = id => {
    if (!require.c[id]) {
      const mod = { exports: {} }; require.c[id] = mod;
      require.m[id](mod, mod.exports, require);
    }
    return require.c[id].exports;
  };
  require.m = modules; require.c = {};
  Module._load("./random-name.background.js");
  if (!lateEnum) require(enumId);
  require(serviceId);
  const service = new Service();
  assert.equal(service.initShortcutBuildIn(), "initialized");
  if (lateEnum) require(enumId);
  return { service, states, handle, Module, originalLoad, modules, originalFactories };
}

test("discovers changed module IDs, export names and enum values", () => {
  for (const type of [9, 73, 105]) {
    const f = fixture({ type, serviceId: type + 1000, enumId: type + 2000 });
    assert.deepEqual(f.service.registerAllShortcut(), ["Control+J"]);
    assert.equal(f.states.at(-1), "disabled");
    assert.equal(f.Module._load, f.originalLoad);
    assert.deepEqual(f.modules, f.originalFactories);
    f.service.initShortcutBuildIn();
    assert.deepEqual(f.service.registerAllShortcut(), ["Control+J"]);
    f.handle.stop();
  }
});

test("handles the enum loading after the service initializes", () => {
  const f = fixture({ lateEnum: true });
  assert.deepEqual(f.service.registerAllShortcut(), ["Control+J"]);
  f.handle.stop();
});

test("preserves a changed shortcut instead of deleting by enum alone", () => {
  const f = fixture({ chord: "Control+Shift+H" });
  assert.equal(f.service.registerAllShortcut().length, 2);
  assert.ok(f.states.includes("unexpected-shortcut-model"));
  f.handle.stop();
});

test("restores discovery hooks when no compatible service exists", () => {
  const original = () => ({ modules: { 1: mod => { mod.exports = {}; } } });
  const Module = { _load: original };
  const handle = install({ Module });
  assert.notEqual(Module._load, original);
  handle.stop();
  assert.equal(Module._load, original);
});
