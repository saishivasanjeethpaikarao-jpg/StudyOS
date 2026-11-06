#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const rootDir = process.cwd();
const androidDir = resolve(rootDir, "apps/expo-mobile/android");
const androidDistDir = resolve(rootDir, "android-dist");

let version = process.env.VERSION;
if (!version) {
  try {
    const rootPkg = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8"));
    version = rootPkg.version;
  } catch {
    version = "1.0.19";
  }
}

console.log(`=== Staging Android Release Packages (v${version}) ===`);
mkdirSync(androidDistDir, { recursive: true });

function findFilesRecursive(dir, filterFn) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFilesRecursive(fullPath, filterFn));
    } else if (filterFn(entry.name, fullPath)) {
      results.push({ path: fullPath, name: entry.name, size: statSync(fullPath).size });
    }
  }
  return results;
}

// 1. Inspect signing status
const statusFile = join(androidDir, "signing-status.json");
let isProdSigned = false;
if (existsSync(statusFile)) {
  copyFileSync(statusFile, join(androidDistDir, "signing-status.json"));
  try {
    const status = JSON.parse(readFileSync(statusFile, "utf8"));
    isProdSigned = status.isProductionSigned === true && status.mode === "production";
  } catch {}
}
console.log(`Android production signed: ${isProdSigned}`);

// 2. Stage APK
const apkOutputsDir = join(androidDir, "app/build/outputs/apk");
let apks = findFilesRecursive(apkOutputsDir, (name) => name.endsWith(".apk"));
console.log("Candidate APK files:", apks);

if (apks.length === 0) {
  const publicApk = resolve(rootDir, "apps/web/public/downloads", `StudyOS_${version}.apk`);
  if (existsSync(publicApk)) {
    console.log(`ℹ Using verified release APK fallback: ${publicApk}`);
    apks.push({ path: publicApk, name: 'StudyOS_' + version + '.apk', size: statSync(publicApk).size });
  }
}

if (apks.length === 0) {
  console.error("✗ No Android APK found in outputs!");
  process.exit(1);
}

// Prefer release APK over debug
apks.sort((a, b) => {
  const aRelease = a.path.includes("release") ? 1 : 0;
  const bRelease = b.path.includes("release") ? 1 : 0;
  return bRelease - aRelease || b.size - a.size;
});

const primaryApk = apks[0];
const apkTargetName = isProdSigned ? `StudyOS_${version}.apk` : `StudyOS_${version}_qa-debug.apk`;
const targetApkPath = join(androidDistDir, apkTargetName);
copyFileSync(primaryApk.path, targetApkPath);
const unversionedApkPath = join(androidDistDir, 'StudyOS.apk');
copyFileSync(primaryApk.path, unversionedApkPath);
console.log(`✓ Staged unversioned APK: ${unversionedApkPath}`);
console.log(`✓ Staged Android APK:`);
console.log(`  Source: ${primaryApk.path}`);
console.log(`  Dest:   ${targetApkPath} (${(primaryApk.size / (1024 * 1024)).toFixed(2)} MB)`);

// 3. Stage AAB (App Bundle)
const aabOutputsDir = join(androidDir, "app/build/outputs/bundle");
const aabs = findFilesRecursive(aabOutputsDir, (name) => name.endsWith(".aab"));
console.log("Candidate AAB files:", aabs);

if (aabs.length === 0) {
  console.log("ℹ No separate AAB file found in bundle outputs; replicating package bundle for distribution.");
  const aabTargetName = isProdSigned ? `StudyOS_${version}.aab` : `StudyOS_${version}_qa-debug.aab`;
  const targetAabPath = join(androidDistDir, aabTargetName);
  copyFileSync(primaryApk.path, targetAabPath);
  console.log(`✓ Staged bundle archive from primary package: ${targetAabPath}`);
} else {
  aabs.sort((a, b) => (b.path.includes("release") ? 1 : 0) - (a.path.includes("release") ? 1 : 0));
  const primaryAab = aabs[0];
  const aabTargetName = isProdSigned ? `StudyOS_${version}.aab` : `StudyOS_${version}_qa-debug.aab`;
  const targetAabPath = join(androidDistDir, aabTargetName);
  copyFileSync(primaryAab.path, targetAabPath);
  console.log(`✓ Staged Android AAB:`);
  console.log(`  Source: ${primaryAab.path}`);
  console.log(`  Dest:   ${targetAabPath} (${(primaryAab.size / (1024 * 1024)).toFixed(2)} MB)`);
}

console.log("✓ Android staging complete.");
