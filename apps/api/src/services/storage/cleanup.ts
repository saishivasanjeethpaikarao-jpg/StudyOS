/**
 * Storage Orphan Cleanup Utility for StudyOS
 *
 * Identifies and safely cleans up unreferenced/orphaned storage objects:
 * 1. Safe Retention Window: Objects created within the grace period (default 24h) are
 *    never pruned, preventing race conditions with in-flight uploads.
 * 2. Dry-Run Verification: Supports simulated execution to audit candidates before mutation.
 * 3. Tenant Boundary Preservation: Only prunes unreferenced objects; never prunes active records.
 * 4. Error Resilience: Logs failures cleanly without leaking storage credentials or secrets.
 */

import type { StorageProvider } from './index.js';

export interface StoredObjectSummary {
  key: string;
  lastModified: Date;
  sizeBytes?: number;
}

export interface OrphanDetectionResult {
  candidateKeys: string[];
  retainedRecentKeys: string[];
  activeKeysCount: number;
  totalStoredObjects: number;
}

export interface CleanupExecutionResult {
  dryRun: boolean;
  totalCandidates: number;
  deletedKeys: string[];
  failedKeys: Array<{ key: string; error: string }>;
}

/**
 * Compare stored object keys against known database reference keys.
 * Objects not in knownKeys and older than gracePeriodHours are flagged as orphans.
 */
export function detectOrphanedObjects(
  knownDatabaseKeys: Set<string>,
  storedObjects: StoredObjectSummary[],
  gracePeriodHours: number = 24,
  now: Date = new Date()
): OrphanDetectionResult {
  const candidateKeys: string[] = [];
  const retainedRecentKeys: string[] = [];
  const gracePeriodMs = gracePeriodHours * 60 * 60 * 1000;
  const cutoffTime = new Date(now.getTime() - gracePeriodMs);

  for (const obj of storedObjects) {
    if (!knownDatabaseKeys.has(obj.key)) {
      if (obj.lastModified > cutoffTime) {
        // Created recently; retain to avoid deleting concurrent in-flight uploads
        retainedRecentKeys.push(obj.key);
      } else {
        // Stale unreferenced object; safe for pruning
        candidateKeys.push(obj.key);
      }
    }
  }

  return {
    candidateKeys,
    retainedRecentKeys,
    activeKeysCount: knownDatabaseKeys.size,
    totalStoredObjects: storedObjects.length,
  };
}

/**
 * Execute cleanup of confirmed orphan candidate keys.
 * In dry-run mode (default), returns candidates without mutating storage.
 */
export async function executeOrphanCleanup(
  provider: StorageProvider,
  candidateKeys: string[],
  dryRun: boolean = true
): Promise<CleanupExecutionResult> {
  const deletedKeys: string[] = [];
  const failedKeys: Array<{ key: string; error: string }> = [];

  if (dryRun) {
    return {
      dryRun: true,
      totalCandidates: candidateKeys.length,
      deletedKeys: [],
      failedKeys: [],
    };
  }

  for (const key of candidateKeys) {
    try {
      await provider.delete(key);
      deletedKeys.push(key);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown storage deletion error';
      failedKeys.push({ key, error: message });
    }
  }

  return {
    dryRun: false,
    totalCandidates: candidateKeys.length,
    deletedKeys,
    failedKeys,
  };
}
