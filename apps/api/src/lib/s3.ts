/**
 * S3 / Object Storage utilities for StudyOS API
 *
 * Implements lazy initialization and provider-agnostic storage access:
 * Supports Supabase Storage (100% cardless free tier), Cloudflare R2, and AWS S3.
 */

import {
  getStorageProvider,
  extractKeyFromUrl,
  type StorageObjectResult,
} from '../services/storage/index.js';

export { generateUniqueKey, extractKeyFromUrl, sanitizeFilename } from '../services/storage/index.js';

/**
 * Upload a file to object storage (Supabase Storage / Cloudflare R2 / S3)
 * @param key - The object key (path)
 * @param body - The file content as a Buffer
 * @param contentType - The MIME type of the file
 * @returns The proxy URL for accessing the file (/uploads/{key})
 */
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const provider = getStorageProvider();
  return provider.upload(key, body, contentType);
}

/**
 * Get an object from storage
 * @param key - The object key (path)
 * @returns The object body stream, content type, and content length, or null if not found
 */
export async function getS3Object(
  key: string
): Promise<StorageObjectResult | null> {
  const provider = getStorageProvider();
  return provider.getObject(key);
}

/**
 * Delete an object from storage
 * @param key - The object key (path)
 */
export async function deleteFromS3(key: string): Promise<void> {
  const provider = getStorageProvider();
  return provider.delete(key);
}

/**
 * Extract S3/Storage key from a proxy URL (/uploads/{key})
 * @param url - The proxy URL (e.g., /uploads/avatars/user-id/timestamp-filename.jpg)
 * @returns The storage key or null if not a valid proxy URL
 */
export function extractS3KeyFromUrl(url: string | null | undefined): string | null {
  return extractKeyFromUrl(url);
}

/**
 * Delete a file from storage if the URL points to our storage
 * Safely handles null/undefined URLs and non-storage URLs
 * @param url - The proxy URL to delete
 */
export async function deleteFromS3ByUrl(url: string | null | undefined): Promise<void> {
  const key = extractS3KeyFromUrl(url);
  if (key) {
    await deleteFromS3(key);
  }
}
