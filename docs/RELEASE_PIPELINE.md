# StudyOS Unified Multi-Platform Release Pipeline

## 1. Overview & Objectives

The StudyOS release pipeline is a single, unified, coordinated CI/CD release system built on GitHub Actions ([`.github/workflows/release.yml`](file:///D:/StudyOS-Project/studyos/.github/workflows/release.yml)). It automates the verification, compilation, packaging, and publishing of all supported client and server components for the StudyOS ecosystem:

- **Windows Desktop Application:** Tauri v2 NSIS setup installer (`StudyOS_{version}_x64-setup.exe`) and MSI package (if generated).
- **Android Mobile Application:** Universal installable APK (`StudyOS_{version}.apk`) and Google Play Android App Bundle (`StudyOS_{version}.aab`).
- **Web Application:** Production static distribution archive (`StudyOS_{version}_web.zip`).
- **Backend API & Shared Packages:** Zero-deployment verification running comprehensive typechecks, linters, and unit tests across all monorepo workspaces.
- **Cryptographic Verification:** SHA-256 checksum manifest (`SHA256SUMS.txt`) generated and embedded into the release metadata.

---

## 2. Release Pipeline Architecture & Job Topology

```mermaid
flowchart TD
    trigger["Manual Trigger: workflow_dispatch only<br>(publish_release: true / false)"] --> validate["Job 1: validate (ubuntu-latest, 1x)<br>Typecheck, Lint, Tests, Web & API Build"]
    
    validate -->|web-distribution artifact| release["Job 4: release (ubuntu-latest, 1x)<br>Collect Assets, SHA-256 Manifest, Release Notes"]
    validate -->|version output| build_android["Job 2: build-android (ubuntu-latest, 1x)<br>Expo Prebuild, C++ STL Linkage, Gradle assemble/bundle"]
    validate -->|version output| build_windows["Job 3: build-windows (windows-latest, 2x)<br>Rust Toolchain, Web Prep, Tauri NSIS Installer"]
    
    build_android -->|android-packages artifact + signing-status.json| release
    build_windows -->|windows-installers artifact| release
    
    release --> invariants["Run verify-release-invariants.mjs<br>(Version sync, complete assets, checksums, signing)"]
    invariants --> gate{"publish_release == true?"}
    gate -->|Yes| publish["Publish GitHub Release via softprops/action-gh-release@v2"]
    gate -->|No (QA Build)| dryrun["Retain Artifacts in Run Summary (No Release Created)"]
```

### Job Breakdown & Security Permissions

| Job | Runner OS | Rate | Permissions | Key Deliverables / Artifacts |
| :--- | :--- | :--- | :--- | :--- |
| **`validate`** | `ubuntu-latest` | 1x | `contents: read` | `StudyOS_{version}_web.zip`, monorepo test reports |
| **`build-android`** | `ubuntu-latest` | 1x | `contents: read` | `StudyOS_{version}.apk` (or `_qa-debug.apk`), `.aab`, `signing-status.json` |
| **`build-windows`** | `windows-latest` | 2x | `contents: read` | `StudyOS_{version}_x64-setup.exe` (NSIS) |
| **`release`** | `ubuntu-latest` | 1x | `contents: write` | `SHA256SUMS.txt`, `RELEASE_NOTES.md`, GitHub Release (if approved) |

---

## 3. Strict Manual Release Approval Gate

To eliminate accidental, unapproved, or premature releases:

1. **Tag-Push Publishing Is Permanently Removed:**
   - Git tag pushes (e.g. `git push origin v1.0.17`) **do not** trigger automated publishing.
   - All builds require explicit initiation via GitHub Actions `workflow_dispatch`.
2. **Explicit Approval Gate (`publish_release: true`):**
   - The default input is strictly `publish_release: false`.
   - When `publish_release` is `false`:
     - Full multi-platform compilation executes.
     - Artifacts are uploaded as workflow run artifacts for QA inspection.
     - Android binaries are explicitly branded and staged as QA test artifacts (`*_qa-debug.apk`).
     - **No GitHub Release is created, modified, or tagged.**
   - When `publish_release` is `true`:
     - Android production signing secrets are strictly required. Missing secrets immediately abort the build.
     - The release verifier ensures no QA/debug artifacts exist, all required production files exist, version numbers match across all 5 workspace files, and SHA-256 checksums match 100%.
     - Only upon passing all verification gates does the workflow create the public GitHub Release.

---

## 4. Code Signing Architecture & Invariants

### Android Mobile Signing
- **Production Releases:** Strictly requires four repository secrets (`STUDYOS_KEYSTORE_BASE64`, `STUDYOS_KEYSTORE_PASSWORD`, `STUDYOS_KEY_ALIAS`, `STUDYOS_KEY_PASSWORD`).
- **QA / Test Builds:** If secrets are absent and `publish_release` is `false`, the build cleanly falls back to Android's debug keystore, staging artifacts clearly labelled `StudyOS_{version}_qa-debug.apk` and `StudyOS_{version}_qa-debug.aab`.
- **Production Guard:** If `publish_release` is `true` and any keystore secret is missing, [`scripts/prepare-android-build.mjs`](file:///D:/StudyOS-Project/studyos/scripts/prepare-android-build.mjs) terminates with code 1. Debug-signed binaries are rejected by [`scripts/verify-release-invariants.mjs`](file:///D:/StudyOS-Project/studyos/scripts/verify-release-invariants.mjs).

### Windows Desktop Signing
- **Unsigned Developer Build:** By default, the Windows NSIS installer is generated without an enterprise Authenticode certificate.
- **SmartScreen Transparency:** The release notes and documentation explicitly state that the binary is an **Unsigned Developer Build**. Users will encounter the standard Windows Defender SmartScreen "Unknown Publisher" prompt and must click **More Info** $\to$ **Run Anyway**.
- **No False Claims:** Self-signed certificates do **not** bypass Windows SmartScreen reputation filters. Only a publicly trusted CA EV Authenticode certificate satisfies SmartScreen without user prompts.

---

## 5. Pre-Publish Release Invariants (`scripts/verify-release-invariants.mjs`)

Before any release is published, the verifier executes five mandatory verification checks:
1. **Version Consistency:** Ensures the target version string matches across `package.json`, `apps/desktop/src-tauri/tauri.conf.json`, `apps/expo-mobile/package.json`, `apps/web/package.json`, and `apps/api/package.json`.
2. **Asset Completeness:** Confirms `StudyOS_{version}_x64-setup.exe`, `StudyOS_{version}.apk`, `StudyOS_{version}.aab`, `StudyOS_{version}_web.zip`, and `SHA256SUMS.txt` all exist and are non-empty (>0 bytes).
3. **Debug Artifact Rejection:** Strictly scans the asset directory to ensure no QA or debug-signed artifacts (`*_qa-debug.apk`, `*unsigned*`) are included in a production release.
4. **Android Provenance:** Parses `signing-status.json` to verify `isProductionSigned: true` and `mode: "production"`.
5. **SHA-256 Checksum Integrity:** Computes cryptographic hashes for all downloaded artifacts and verifies 100% concordance against `SHA256SUMS.txt`.

---

## 6. Runner Cost Policy & Free-Tier Economics

StudyOS enforces a strict **₹0 / month** CI budget:

1. **Repository Visibility Allowances:**
   - **Public Repositories:** Standard GitHub-hosted runners (Ubuntu, Windows) are completely free with unlimited minutes within standard fair-use parameters.
   - **Private Repositories:** GitHub provides 2,000 free minutes per month on the standard Free plan.
2. **Runner Consumption Multipliers:**
   - `ubuntu-latest`: **1x multiplier** (1 min used = 1 min billed). Used for `validate`, `build-android`, and `release`.
   - `windows-latest`: **2x multiplier** (1 min used = 2 min billed). Used strictly for Tauri desktop packaging.
   - `macos-latest`: **10x multiplier** (1 min used = 10 min billed). **Strictly excluded** from the pipeline to protect the free tier quota.
3. **Aggressive Cache Optimization:**
   - Bun package cache (`~/.bun/install/cache`).
   - Gradle wrapper and dependency caches (`~/.gradle/caches`).
   - Rust toolchain and cargo workspaces cache (`Swatinem/rust-cache@v2`).
4. **Zero Paid Services:** No external build farms, no paid action plugins, and no cloud infrastructure provisioning.

---

## 7. Security & Secrets Management

- **Least Privilege:** Top-level workflow permissions default to `contents: read`. Only the final `release` job is granted `contents: write`.
- **Zero Secret Leakage:**
  - Keystore passwords and private key passphrases are never printed, echoed, or included in build logs or generated metadata.
  - `signing-status.json` records only public metadata (`isProductionSigned`, `mode`, `keyAlias`, `timestamp`).
  - Temporary keystores and properties files are excluded from Git and artifacts.
- **Zero Cloud Deployment:** The pipeline strictly tests and builds application binaries. No database migrations, Cloudflare deployments, or Supabase alterations take place.

---

## 8. Maintainer Step-by-Step Guide: First Safe QA Run

To run the first safe verification and QA build on GitHub Actions without publishing a release:

1. **Navigate to GitHub Actions:**
   Open the repository on GitHub and select the **Actions** tab.
2. **Select the Workflow:**
   Click **StudyOS Unified Release Pipeline** in the left sidebar.
3. **Trigger Workflow Run:**
   Click **Run workflow**.
   - **Branch:** Select `studyos-development` (or target branch).
   - **`publish_release`:** Leave set to `false` (Unchecked).
   - **`version_override`:** Leave empty (defaults to `package.json` version, e.g. `1.0.17`).
4. **Inspect Execution:**
   - `validate` verifies TypeScript, ESLint, unit tests, and packages `StudyOS_{version}_web.zip`.
   - `build-android` exports Expo bundle, links C++ STL, and builds `StudyOS_{version}_qa-debug.apk` and `StudyOS_{version}_qa-debug.aab`.
   - `build-windows` strips marketing assets and packages `StudyOS_{version}_x64-setup.exe`.
   - `release` aggregates all artifacts, verifies SHA-256 hashes, outputs release notes in the workflow summary, and keeps the publishing gate **closed**.
5. **Download & Test Artifacts:**
   After the workflow finishes, download the artifacts directly from the workflow summary:
   - `web-distribution`
   - `android-packages`
   - `windows-installers`
