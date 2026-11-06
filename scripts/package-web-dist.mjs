#!/usr/bin/env node
import { existsSync, mkdirSync, statSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const rootDir = process.cwd();
const distDir = resolve(rootDir, "apps/web/dist");
const webDistOutDir = resolve(rootDir, "web-dist");

const version = process.env.VERSION || JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8")).version;
const zipDest = resolve(webDistOutDir, `StudyOS_${version}_web.zip`);
const pyScript = resolve(rootDir, "scripts/make-zip.py");

console.log(`Packaging Web Distribution for StudyOS v${version}...`);

if (!existsSync(distDir)) {
  console.error(`Error: apps/web/dist not found at ${distDir}`);
  process.exit(1);
}

mkdirSync(webDistOutDir, { recursive: true });

let packaged = false;

// Attempt 1: Native zip command
try {
  console.log("Attempting native zip...");
  execSync(`cd "${distDir}" && zip -r "${zipDest}" .`, { stdio: "inherit" });
  if (existsSync(zipDest) && statSync(zipDest).size > 0) {
    packaged = true;
    console.log("✓ Successfully packaged via native zip.");
  }
} catch (e) {
  console.log("Native zip command not available or failed:", e.message);
}

// Attempt 2: Python make-zip.py
if (!packaged && existsSync(pyScript)) {
  try {
    console.log("Attempting packaging via Python make-zip.py...");
    const pyCmd = process.platform === "win32" ? "python" : "python3";
    execSync(`${pyCmd} "${pyScript}" "${distDir}" "${zipDest}"`, { stdio: "inherit" });
    if (existsSync(zipDest) && statSync(zipDest).size > 0) {
      packaged = true;
      console.log("✓ Successfully packaged via Python make-zip.py.");
    }
  } catch (pyErr) {
    console.log("Python make-zip packaging failed:", pyErr.message);
  }
}

if (!packaged || !existsSync(zipDest) || statSync(zipDest).size === 0) {
  console.error("✗ Failed to package web distribution.");
  process.exit(1);
}

const sizeMb = (statSync(zipDest).size / (1024 * 1024)).toFixed(2);
console.log(`✓ Web distribution package created: ${zipDest} (${sizeMb} MB)`);
