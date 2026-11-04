#!/usr/bin/env node
/**
 * StudyOS Release Invariants Verifier
 * Enforces production readiness:
 * 1. Verifies version synchronization across monorepo workspace configs.
 * 2. Verifies cryptographic SHA-256 checksums match all packaged assets.
 * 3. Enforces that production releases (PUBLISH_RELEASE=true) contain ONLY production-signed
 *    binaries and reject any QA/debug-signed or incomplete artifacts.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const rootDir = process.cwd();
const assetsDir = join(rootDir, "release-assets");

const rootPkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = process.env.VERSION || rootPkg.version;
const isPublish = process.env.PUBLISH_RELEASE === "true" || process.env.PUBLISH_RELEASE === true;

console.log("=======================================================");
console.log(` StudyOS Release Invariants Verification: v${version}`);
console.log(` Target Mode: ${isPublish ? "PRODUCTION PUBLISH" : "QA / DRY-RUN VALIDATION"}`);
console.log("=======================================================");

let hasErrors = false;
function logError(msg) {
  console.error(`✗ [ERROR] ${msg}`);
  hasErrors = true;
}
function logSuccess(msg) {
  console.log(`✓ [PASS] ${msg}`);
}

// ----------------------------------------------------------------------------
// 1. Cross-Workspace Version Synchronization
// ----------------------------------------------------------------------------
console.log("\n[1/4] Verifying monorepo version synchronization...");
const versionTargets = [
  { file: "package.json", key: "version" },
  { file: "apps/desktop/src-tauri/tauri.conf.json", key: "version" },
  { file: "apps/expo-mobile/package.json", key: "version" },
  { file: "apps/web/package.json", key: "version" },
  { file: "apps/api/package.json", key: "version" },
];

for (const target of versionTargets) {
  const filePath = join(rootDir, target.file);
  if (!existsSync(filePath)) {
    logError(`Version target file missing: ${target.file}`);
    continue;
  }
  const content = JSON.parse(readFileSync(filePath, "utf8"));
  const targetVersion = content[target.key];
  if (targetVersion !== version) {
    logError(`Version mismatch in ${target.file}: expected '${version}', found '${targetVersion}'`);
  } else {
    logSuccess(`${target.file} synchronized at '${version}'`);
  }
}

// ----------------------------------------------------------------------------
// 2. Asset Directory & File Integrity
// ----------------------------------------------------------------------------
console.log("\n[2/4] Verifying packaged release assets...");
if (!existsSync(assetsDir)) {
  logError(`Release assets directory not found at: ${assetsDir}`);
  process.exit(1);
}

const assetFiles = readdirSync(assetsDir);
console.log(`Found ${assetFiles.length} files in ${assetsDir}`);

// ----------------------------------------------------------------------------
// 3. Android Signing Verification & Debug Artifact Rejection
// ----------------------------------------------------------------------------
console.log("\n[3/4] Verifying Android signing status and artifact provenance...");
const signingStatusPath = join(assetsDir, "signing-status.json");

if (isPublish) {
  // STRICT PRODUCTION RELEASE GATE
  if (!existsSync(signingStatusPath)) {
    logError("signing-status.json is missing. Cannot verify Android signing provenance for production release.");
  } else {
    try {
      const status = JSON.parse(readFileSync(signingStatusPath, "utf8"));
      if (status.isProductionSigned !== true || status.mode !== "production") {
        logError(
          `Android artifact is NOT production-signed (mode='${status.mode}'). Production release rejected!`
        );
      } else {
        logSuccess(`Android artifact confirmed production-signed with key alias '${status.keyAlias}'`);
      }
    } catch (err) {
      logError(`Failed to parse signing-status.json: ${err.message}`);
    }
  }

  // Reject any QA/debug or unsigned artifacts in production release
  const debugArtifacts = assetFiles.filter(
    (f) => f.includes("qa-debug") || f.includes("unsigned") || f.includes("debug")
  );
  if (debugArtifacts.length > 0) {
    logError(`Production release contains rejected QA/debug artifacts: ${debugArtifacts.join(", ")}`);
  }

  // Verify all required production assets exist
  const requiredProductionAssets = [
    `StudyOS_${version}_x64-setup.exe`,
    `StudyOS_${version}.apk`,
    `StudyOS_${version}.aab`,
    `StudyOS_${version}_web.zip`,
    "SHA256SUMS.txt",
    "RELEASE_NOTES.md"
  ];

  for (const asset of requiredProductionAssets) {
    const fullPath = join(assetsDir, asset);
    if (!existsSync(fullPath)) {
      logError(`Missing required production release asset: ${asset}`);
    } else {
      const size = statSync(fullPath).size;
      if (size === 0) {
        logError(`Required asset '${asset}' is 0 bytes (empty file)`);
      } else {
        logSuccess(`Found production asset: ${asset} (${(size / (1024 * 1024)).toFixed(2)} MB)`);
      }
    }
  }
} else {
  // QA / DRY RUN MODE
  logSuccess("QA / Dry-Run mode: Allowing developer testing artifacts (debug-signed / unsigned permitted).");
  if (existsSync(signingStatusPath)) {
    const status = JSON.parse(readFileSync(signingStatusPath, "utf8"));
    console.log(`  ℹ Android Signing Provenance: ${status.mode} (${status.isProductionSigned ? "Production key" : "Debug key"})`);
  }
}

// ----------------------------------------------------------------------------
// 4. SHA-256 Checksum Manifest Validation
// ----------------------------------------------------------------------------
console.log("\n[4/4] Validating cryptographic SHA-256 checksums...");
const checksumFile = join(assetsDir, "SHA256SUMS.txt");

if (!existsSync(checksumFile)) {
  logError("SHA256SUMS.txt manifest is missing.");
} else {
  const checksumLines = readFileSync(checksumFile, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (checksumLines.length === 0) {
    logError("SHA256SUMS.txt is empty.");
  } else {
    for (const line of checksumLines) {
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const expectedHash = parts[0];
      const filename = parts[1].replace(/^\*/, ""); // handle binary mode prefix if any
      const fullPath = join(assetsDir, filename);

      if (!existsSync(fullPath)) {
        logError(`File in SHA256SUMS.txt not found on disk: ${filename}`);
        continue;
      }

      const fileBuffer = readFileSync(fullPath);
      const actualHash = createHash("sha256").update(fileBuffer).digest("hex");

      if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) {
        logError(`SHA-256 checksum mismatch for ${filename}!\n  Expected: ${expectedHash}\n  Actual:   ${actualHash}`);
      } else {
        logSuccess(`SHA-256 verified for ${filename}`);
      }
    }
  }
}

console.log("\n=======================================================");
if (hasErrors) {
  console.error("✗ RELEASE INVARIANTS CHECK FAILED!");
  console.error("One or more critical release constraints were violated.");
  console.error("Aborting release pipeline before any GitHub release can be created.");
  console.error("=======================================================\n");
  process.exit(1);
} else {
  console.log("✓ ALL RELEASE INVARIANTS PASSED SUCCESSFULLY!");
  console.log("=======================================================\n");
  process.exit(0);
}
