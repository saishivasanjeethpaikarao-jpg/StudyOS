# Phase 9D.4B — Gate B: Disposable Supabase Project Specification

**Document Version:** 1.0.0  
**Repository:** `D:\StudyOS-Project\studyos`  
**Branch:** `studyos-development`  
**Starting Commit:** `a18103a734a364c901e57a67ccf8ea518a4370ea`  
**Target Operating Cost:** ₹0 / month (Strict zero-cost, cardless architecture)  
**Gate B Status:** `SPECIFICATION COMPLETED` (Approved configuration documented; project creation remains strictly pending user action)  
**Overall Phase Status:** `ACCEPTED WITH LIMITATIONS` (Configuration specified; actual cloud project creation is NOT performed by agent)

---

## 1. Executive Summary

Phase 9D.4B — Gate B defines the exact technical specification, pre-submission verification steps, and safety guardrails for the temporary **StudyOS Disposable Supabase Test Project**. 

Following the completion of Gate A (confirming the user's manual access to the `Couple-Stars` organization on the Supabase Free plan without payment prompts), Gate B prepares the project parameters for an isolated test environment. This environment will validate database connectivity, Drizzle schema migrations, S3-compatible file storage, and tenant isolation using **strictly synthetic test data**.

### Non-Negotiable Governance Rules
1. **Agent Has Zero Cloud Access:** The AI agent does NOT create the project, does NOT submit forms on the Supabase dashboard, does NOT handle or store live cloud passwords, and does NOT connect to live cloud databases in this phase.
2. **Zero Paid Resources:** The project must be explicitly created on the **Free Plan ($0/month)**.
3. **Strictly Ephemeral & Synthetic:** The project exists solely to execute synthetic end-to-end verification and will be retained for a maximum of 14 days before deletion.

---

## 2. Approved Disposable Project Configuration

The user has explicitly approved the following project configuration in the Supabase Dashboard:

| Parameter | Approved Value | Architectural Rationale & Constraints |
| :--- | :--- | :--- |
| **Organization** | `Couple-Stars` | Verified user organization on the Supabase Free tier. |
| **Project Name** | `studyos-disposable-test` | Explicitly marked as a temporary test environment to prevent confusing it with any future production setup. |
| **Database Password** | *User-Generated Strong Password* | Must be a strong, randomly generated secret (min 16 chars). **Must NEVER be committed to Git, shared in chat, or hardcoded.** |
| **Pricing Plan** | **Free Plan ($0 / month)** | Non-negotiable ₹0 cost ceiling. 500 MB database, 1 GB storage, 50 MB max file size, 10 GB bandwidth. |
| **Deployment Region** | **`ap-south-1` (Mumbai, India)** | Lowest latency (~15–35 ms) to Indian edge nodes; optimal alignment with local academic workloads. Available at ₹0 surcharge. |
| **Test Data Policy** | **Synthetic test data only** | Zero real student records, school emails, or genuine academic papers. |
| **Project Retention** | **14 calendar days maximum** | Disposable project must be deleted immediately after verification is complete. |

---

## 3. Pre-Submission Verification Instructions (User Manual Checklist)

Before clicking the **"Create new project"** button in the Supabase Dashboard, the user must visually inspect and confirm the following parameters on screen:

### Step-by-Step Pre-Submission Check
1. **Organization Dropdown:**
   - Confirm that `Couple-Stars` is selected as the organization.
2. **Project Name Field:**
   - Enter `studyos-disposable-test`.
3. **Database Password Field:**
   - Generate and safely store a secure password in a local password manager.
   - Do NOT enter this password into any terminal command or Git commit.
4. **Region Selection:**
   - Select **South Asia (Mumbai) / `ap-south-1`**.
   - Verify that no warning or surcharge indicator appears next to the region.
5. **Pricing Plan Display:**
   - Visually verify that the bottom or side pricing summary indicates:
     - **Plan: Free ($0/month)**
     - Included: 500 MB Database, 1 GB Storage, 50,000 Monthly Active Users.
   - Ensure that the button reads **"Create new project"** and NOT "Upgrade to Pro" or "Enter Payment Details".

---

## 4. Critical Stop Conditions & Circuit Breakers

The user must immediately halt the process and report back if any of the following occur:

```
================================================================================
                           GATE B CRITICAL STOP CONDITIONS
================================================================================
STOP IMMEDIATELY and DO NOT SUBMIT the creation form if:
  1. Supabase prompts for credit card, debit card, or payment details.
  2. The Free tier quota for the organization is exhausted (e.g., maximum 2 free
     projects already active).
  3. The Mumbai (`ap-south-1`) region is shown as unavailable or requiring a paid plan.
  4. Any paid add-on is selected by default (e.g. Dedicated IPv4, Compute add-on).
  5. The creation modal displays any non-zero monthly or setup cost.

Under NO circumstances should billing be activated or payment methods entered.
================================================================================
```

---

## 5. Project Creation Status

As mandated by repository safety rules, actual cloud project creation is **NOT PERFORMED** by the agent and remains pending user manual action:

| Gate Milestone | Action Description | Execution Responsibility | Current Status |
| :--- | :--- | :---: | :---: |
| **Gate A** | Account & Free-Plan Verification | User / Dashboard | **COMPLETED (User-Confirmed)** |
| **Gate B** | Disposable Project Specification | Agent / Documentation | **COMPLETED** |
| **Gate B Execution** | Project Creation in Dashboard | User (Manual) | **PENDING USER CREATION** |
| **Gate C** | Live Database Connection & Migration | Agent / Tooling | **NOT AUTHORIZED (Awaiting Gate B)** |
| **Gate D** | Private Storage Bucket Creation | Agent / Tooling | **NOT AUTHORIZED** |
| **Gate E** | S3 Credential Generation & Secret Injection | Agent / Tooling | **NOT AUTHORIZED** |

---

## 6. Synthetic Data Protocol

When the disposable project is eventually initialized for testing in subsequent gates, the following strict data constraints will apply:
1. **Synthetic User Personas:**
   - `test_student_alpha@studyos.local`
   - `test_student_beta@studyos.local`
2. **Synthetic Academic Tasks:**
   - "Math 101: Review Linear Algebra Chapter 3"
   - "Physics 202: Lab Report Draft on Thermodynamics"
3. **Synthetic File Attachments:**
   - Dummy text files (< 10 KB) and dummy PDFs (< 500 KB) containing placeholder lorem ipsum academic notes.
   - Zero real student notes, grades, or copyrighted textbooks.

---

## 7. Deterministic Teardown & Deletion Runbook

To maintain zero billing risk and clean hygiene, the disposable project must be deleted using this procedure:
1. **Purge Storage:** Delete all objects inside `studyos-materials` via the dashboard.
2. **Drop Schema:** Drop created tables or execute down-migrations.
3. **Delete Project:** Navigate to **Project Settings > General > Delete Project**, type the project name `studyos-disposable-test`, and confirm deletion.
4. **Verification:** Confirm that project status is `Terminated` and organization project count returns to baseline.

---

## 8. Summary of Local Verification

- **Repository Branch:** `studyos-development` (Preserved)
- **Unstaged User Modifications:** Untouched in working tree.
- **Git State:** Clean staging with zero untracked credentials.
- **Automated Tests:** 218 passing, 89 skipped, 0 failures (100% pass rate).

---

## 9. Final Acceptance Verdict

### Status: `ACCEPTED WITH LIMITATIONS`

**Justification:**  
The specification for the disposable test project (`studyos-disposable-test` under organization `Couple-Stars` in region `ap-south-1`) has been completely documented with clear pre-submission verification instructions and stop conditions. Actual project creation is intentionally withheld and remains pending user manual execution.
