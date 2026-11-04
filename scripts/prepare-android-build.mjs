#!/usr/bin/env node
/**
 * StudyOS Android Build & Signing Preparation
 * Configures NDK C++ STL linkages, worklets CMake targets, and production keystore signing if present.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();
const androidDir = join(rootDir, "apps/expo-mobile/android");
const workletsCmake = join(rootDir, "node_modules/react-native-worklets/android/CMakeLists.txt");
const rootBuildGradle = join(androidDir, "build.gradle");
const appBuildGradle = join(androidDir, "app/build.gradle");

console.log("=== StudyOS Android Build Preparation ===");

// 1. Verify Android directory exists
if (!existsSync(androidDir)) {
  console.error("✗ apps/expo-mobile/android not found. Ensure 'expo prebuild' was executed first.");
  process.exit(1);
}

// 2. Patch react-native-worklets CMakeLists.txt to link c++_shared
if (existsSync(workletsCmake)) {
  let content = readFileSync(workletsCmake, "utf8");
  if (!content.includes("c++_shared")) {
    content = content.replace("fbjni::fbjni)", "fbjni::fbjni c++_shared)");
    writeFileSync(workletsCmake, content, "utf8");
    console.log("✓ Patched react-native-worklets CMakeLists.txt with 'c++_shared'");
  } else {
    console.log("✓ react-native-worklets CMakeLists.txt already links 'c++_shared'");
  }
} else {
  console.log("ℹ react-native-worklets CMakeLists.txt not found (optional/skipped)");
}

// 3. Patch android/build.gradle for global subproject CMake C++ STL flags
if (existsSync(rootBuildGradle)) {
  let content = readFileSync(rootBuildGradle, "utf8");
  if (!content.includes("CMAKE_CXX_STANDARD_LIBRARIES")) {
    const subprojectsConfig = `
subprojects { project ->
  project.plugins.withId("com.android.library") {
    project.android {
      defaultConfig {
        externalNativeBuild {
          cmake {
            arguments "-DANDROID_STL=c++_shared", "-DCMAKE_CXX_STANDARD_LIBRARIES=-lc++_shared -latomic -lm"
          }
        }
      }
    }
  }
  project.plugins.withId("com.android.application") {
    project.android {
      defaultConfig {
        externalNativeBuild {
          cmake {
            arguments "-DANDROID_STL=c++_shared", "-DCMAKE_CXX_STANDARD_LIBRARIES=-lc++_shared -latomic -lm"
          }
        }
      }
    }
  }
}
`;
    content += subprojectsConfig;
    writeFileSync(rootBuildGradle, content, "utf8");
    console.log("✓ Added global subproject CMake C++ STL configuration to android/build.gradle");
  } else {
    console.log("✓ android/build.gradle already contains global CMake STL configuration");
  }
}

// 4. Configure Android Signing
const isPublish = process.env.PUBLISH_RELEASE === "true" || process.env.PUBLISH_RELEASE === true;
const keystoreB64 = process.env.STUDYOS_KEYSTORE_BASE64?.trim();
const keystorePassword = process.env.STUDYOS_KEYSTORE_PASSWORD?.trim();
const keyAlias = process.env.STUDYOS_KEY_ALIAS?.trim();
const keyPassword = process.env.STUDYOS_KEY_PASSWORD?.trim();

const missingSecrets = [];
if (!keystoreB64) missingSecrets.push("STUDYOS_KEYSTORE_BASE64");
if (!keystorePassword) missingSecrets.push("STUDYOS_KEYSTORE_PASSWORD");
if (!keyAlias) missingSecrets.push("STUDYOS_KEY_ALIAS");
if (!keyPassword) missingSecrets.push("STUDYOS_KEY_PASSWORD");

const signingStatusFile = join(androidDir, "signing-status.json");

if (isPublish && missingSecrets.length > 0) {
  console.error("\n=======================================================");
  console.error("✗ FATAL ERROR: ANDROID PRODUCTION SIGNING CREDENTIALS MISSING");
  console.error("=======================================================");
  console.error("A production release was explicitly approved (publish_release: true),");
  console.error("but the following required Android signing secrets are missing in the environment:");
  missingSecrets.forEach((s) => console.error(`  - ${s}`));
  console.error("");
  console.error("Debug signing is strictly prohibited for production releases.");
  console.error("The production release cannot proceed without authentic production keystore credentials.");
  console.error("Please configure the required repository secrets before triggering a production release.");
  console.error("For QA and test builds without secrets, run the workflow with 'publish_release: false'.");
  console.error("=======================================================\n");
  process.exit(1);
}

if (!missingSecrets.length) {
  console.log("✓ Found complete production signing credentials in environment.");
  try {
    const keystoreDest = join(androidDir, "app/release.keystore");
    const keystoreBuffer = Buffer.from(keystoreB64, "base64");
    if (keystoreBuffer.length < 100) {
      throw new Error("Decoded keystore payload is too small (<100 bytes). Verify base64 encoding.");
    }
    writeFileSync(keystoreDest, keystoreBuffer);

    const propsContent = [
      "storeFile=release.keystore",
      `storePassword=${keystorePassword}`,
      `keyAlias=${keyAlias}`,
      `keyPassword=${keyPassword}`,
    ].join("\n");

    writeFileSync(join(androidDir, "app/keystore.properties"), propsContent, "utf8");
    console.log("✓ Configured production release.keystore and keystore.properties safely");

    // Write signing status metadata (NEVER include passwords or secrets here)
    const signingStatus = {
      isProductionSigned: true,
      mode: "production",
      keyAlias: keyAlias,
      timestamp: new Date().toISOString(),
    };
    writeFileSync(signingStatusFile, JSON.stringify(signingStatus, null, 2), "utf8");
    console.log("✓ Generated Android signing status metadata: mode=production");

    // Wire keystore.properties into app/build.gradle if not already present
    if (existsSync(appBuildGradle)) {
      let appGradleContent = readFileSync(appBuildGradle, "utf8");
      if (!appGradleContent.includes("keystore.properties")) {
        const releaseSigningSnippet = `
def keystorePropertiesFile = file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    def keystoreProperties = new Properties()
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
    android.signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.release
}
`;
        appGradleContent += releaseSigningSnippet;
        writeFileSync(appBuildGradle, appGradleContent, "utf8");
        console.log("✓ Wired production keystore.properties into app/build.gradle");
      }
    }
  } catch (err) {
    console.error("✗ Error configuring production keystore:", err.message);
    process.exit(1);
  }
} else {
  console.log("ℹ No production keystore secrets configured in environment.");
  console.log("  Required secrets for production signing:");
  console.log("  - STUDYOS_KEYSTORE_BASE64");
  console.log("  - STUDYOS_KEYSTORE_PASSWORD");
  console.log("  - STUDYOS_KEY_ALIAS");
  console.log("  - STUDYOS_KEY_PASSWORD");
  console.log("ℹ Running in QA / Dry-Run mode: using fallback Android debug keystore.");
  console.log("ℹ The generated APK and AAB will be explicitly labelled as QA test artifacts.");

  const signingStatus = {
    isProductionSigned: false,
    mode: "debug-qa",
    warning: "Unsigned/debug-signed QA test artifact only - strictly not for production release",
    timestamp: new Date().toISOString(),
  };
  writeFileSync(signingStatusFile, JSON.stringify(signingStatus, null, 2), "utf8");
  console.log("✓ Generated Android signing status metadata: mode=debug-qa");
}

console.log("✓ Android build preparation complete.");
