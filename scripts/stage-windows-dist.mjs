#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync } from "node:fs";
import { resolve, join, basename } from "node:path";

const rootDir = process.cwd();
const tauriTargetDir = resolve(rootDir, "apps/desktop/src-tauri/target");
const windowsDistDir = resolve(rootDir, "windows-dist");

let version = process.env.VERSION;
if (!version) {
  try {
    const rootPkg = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8"));
    version = rootPkg.version;
  } catch {
    version = "1.0.18";
  }
}

console.log(`=== Staging Windows Release Installers (v${version}) ===`);
mkdirSync(windowsDistDir, { recursive: true });

function findFilesRecursive(dir, filterFn) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip heavy build cache directories
      if (["incremental", "deps", ".fingerprint", "build"].includes(entry.name)) {
        continue;
      }
      results.push(...findFilesRecursive(fullPath, filterFn));
    } else if (filterFn(entry.name, fullPath)) {
      results.push({ path: fullPath, name: entry.name, size: statSync(fullPath).size });
    }
  }
  return results;
}

// 1. Search for NSIS setup installer
const nsisDir = resolve(tauriTargetDir, "release/bundle/nsis");
console.log(`Checking NSIS bundle directory: ${nsisDir}`);
let exeInstallers = findFilesRecursive(nsisDir, (name) => name.endsWith(".exe"));

if (exeInstallers.length === 0) {
  console.log("No .exe found directly in bundle/nsis, scanning entire target/release...");
  exeInstallers = findFilesRecursive(
    resolve(tauriTargetDir, "release"),
    (name, fullPath) => name.endsWith(".exe") && (name.toLowerCase().includes("setup") || fullPath.includes("bundle"))
  );
}

if (exeInstallers.length === 0) {
  console.log("Scanning target directory broadly for any setup .exe...");
  exeInstallers = findFilesRecursive(
    tauriTargetDir,
    (name) => name.endsWith(".exe") && name.toLowerCase().includes("setup")
  );
}

console.log("Candidate Windows installers found:", exeInstallers);

if (exeInstallers.length === 0) {
  console.error("✗ No Windows installer executable found in target directory!");
  process.exit(1);
}

// Pick the primary setup executable (prefer largest or one with 'setup')
exeInstallers.sort((a, b) => b.size - a.size);
const primaryExe = exeInstallers[0];
const targetExePath = resolve(windowsDistDir, `StudyOS_${version}_x64-setup.exe`);

copyFileSync(primaryExe.path, targetExePath);
console.log(`✓ Staged Windows setup installer:`);
console.log(`  Source: ${primaryExe.path}`);
console.log(`  Dest:   ${targetExePath} (${(primaryExe.size / (1024 * 1024)).toFixed(2)} MB)`);

// 2. Search for MSI installer (optional)
const msiFiles = findFilesRecursive(tauriTargetDir, (name) => name.endsWith(".msi"));
if (msiFiles.length > 0) {
  const primaryMsi = msiFiles[0];
  const targetMsiPath = resolve(windowsDistDir, `StudyOS_${version}_x64.msi`);
  copyFileSync(primaryMsi.path, targetMsiPath);
  console.log(`✓ Staged Windows MSI installer:`);
  console.log(`  Source: ${primaryMsi.path}`);
  console.log(`  Dest:   ${targetMsiPath} (${(primaryMsi.size / (1024 * 1024)).toFixed(2)} MB)`);
}

console.log("✓ Windows staging complete.");
