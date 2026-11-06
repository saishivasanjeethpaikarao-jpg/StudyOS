#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const confPath = resolve(process.cwd(), "apps/desktop/src-tauri/tauri.conf.json");
console.log("Configuring Tauri build configuration at:", confPath);

const conf = JSON.parse(readFileSync(confPath, "utf8"));

// Clear beforeBuildCommand during CI because frontend is built and staged separately in previous steps
conf.build.beforeBuildCommand = "";
delete conf.build.devUrl;
conf.build.frontendDist = "../dist";
if (!conf.app) conf.app = {};
if (!Array.isArray(conf.app.windows) || conf.app.windows.length === 0) conf.app.windows = [{ title: "StudyOS" }];
conf.app.windows[0].label = "main";
conf.app.windows[0].url = "index.html";
console.log("✓ Cleared beforeBuildCommand (assets already staged in apps/desktop/dist)");

if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
  conf.bundle.createUpdaterArtifacts = false;
  console.log("✓ Disabled createUpdaterArtifacts (unsigned build)");
} else {
  console.log("✓ Production signing key detected");
}

writeFileSync(confPath, JSON.stringify(conf, null, 2), "utf8");
console.log("✓ Saved updated tauri.conf.json");
