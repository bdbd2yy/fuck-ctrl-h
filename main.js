"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { install } = require("./discovery.js");
const plugin = LiteLoader.plugins.no_ctrl_h;
const statusPath = path.join(plugin.path.data, "status.json");

install({
  Module,
  report(stage, details) {
    const value = {
      stage,
      qqVersion: LiteLoader.versions.qqnt,
      time: new Date().toISOString(),
      ...details
    };
    console.log("[no_ctrl_h]", JSON.stringify(value));
    try {
      fs.mkdirSync(path.dirname(statusPath), { recursive: true });
      fs.writeFileSync(statusPath, JSON.stringify(value, null, 2) + "\n");
    } catch (error) {
      console.warn("[no_ctrl_h] Cannot write status:", error.message);
    }
  }
});
