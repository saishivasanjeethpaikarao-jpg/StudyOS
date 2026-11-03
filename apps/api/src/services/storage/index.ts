/**
 * Storage Provider Abstraction for StudyOS API
 *
 * Provides a unified, provider-agnostic interface for object storage:
 * - Supabase Storage (S3-compatible endpoint: https://<project-ref>.supabase.co/storage/v1/s3) [100% Cardless Free Tier]
 * - Cloudflare R2 (S3-compatible endpoint: https://<account-id>.r2.cloudflarestorage.com) [Card-on-file Free Tier]
 * - Standard AWS S3 / MinIO / Railway private buckets
 *
 * Architecture Principles:
 * 1. Zero Trust: Object keys embed owner userId (`{folder}/{userId}/{timestamp}-{filename}`).
 * 2. Multi-tenant Isolation: User ID in key must match authenticated session.
 * 3. Path Traversal Elimination: Filenames are strictly sanitized before key generation.
 * 4. Dual Delivery Mode: Supports secure streaming proxy (/uploads/*) and short-lived S3 presigned URLs.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type StorageProviderType = 'supabase' | 'r2' | 's3';

export interface StorageProviderConfig {
  provider: StorageProviderType;
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

export interface StorageObjectResult {
  body: ReadableStream;
  contentType: string;
  contentLength: number;
}

export interface StorageProvider {
  readonly providerType: StorageProviderType;
  readonly bucket: string;
  upload(key: string, body: Buffer, contentType: string): Promise<string>;
  getObject(key: string): Promise<StorageObjectResult | null>;
  delete(key: string): Promise<void>;
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  getSignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;
}

/**
 * Sanitize a filename for use in storage keys.
 * Removes/replaces characters that could cause directory traversal or path issues.
 */
export function sanitizeFilename(filename: string): string {
  // Strip any leading path components to eliminate directory traversal attempts
  const base = filename.replace(/^.*[\\/]/, '');
  return base
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/\.{2,}/g, '.') // Collapse multiple dots
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^[-.]+|[-.]+$/g, ''); // Remove leading/trailing hyphens and dots
}

/**
 * Generate a unique storage key for a file upload.
 * Format: {folder}/{userId}/{timestamp}-{sanitized-filename}
 */
export function generateUniqueKey(
  userId: string,
  folder: string,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = sanitizeFilename(filename);
  return `${folder}/${userId}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Extract storage key from a proxy URL (/uploads/{key}).
 */
export function extractKeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/uploads/')) {
    return url.replace(/^\/uploads\//, '');
  }
  return null;
}

/**
 * S3-Compatible Storage Provider Implementation.
 * Connects seamlessly to Supabase Storage S3 endpoint, Cloudflare R2, or AWS S3.
 */
export class S3CompatibleStorageProvider implements StorageProvider {
  public readonly providerType: StorageProviderType;
  public readonly bucket: string;
  private readonly client: S3Client;

  constructor(config: StorageProviderConfig) {
    this.providerType = config.provider;
    this.bucket = config.bucket;

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? true,
    });
  }

  /**
   * Upload an object to storage and return the proxy URL.
   */
  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    // Return proxy URL to ensure requests flow through authenticated API gateway
    return `/uploads/${key}`;
  }

  /**
   * Get an object from storage for authenticated streaming.
   */
  async getObject(key: string): Promise<StorageObjectResult | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      if (!response.Body) {
        return null;
      }

      return {
        body: response.Body.transformToWebStream(),
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength || 0,
      };
    } catch (error: unknown) {
      if (error instanceof NoSuchKey) {
        return null;
      }
      if (error instanceof Error && (error.name === 'NoSuchKey' || error.name === 'NotFound')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete an object from storage.
   */
  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  /**
   * Generate a short-lived presigned GET URL (default: 15 minutes = 900 seconds).
   */
  async getSignedDownloadUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Generate a short-lived presigned PUT URL for direct client upload (default: 15 minutes = 900 seconds).
   */
  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number = 900
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}

// Singleton instance and factory
let activeProvider: StorageProvider | null = null;

/**
 * Resolve storage configuration from environment variables.
 * Automatically identifies Supabase Storage vs Cloudflare R2 vs standard S3.
 */
export function resolveStorageConfig(): StorageProviderConfig {
  const explicitProvider = (process.env.STORAGE_PROVIDER?.toLowerCase() as StorageProviderType) || undefined;
  const endpoint = process.env.SUPABASE_STORAGE_S3_ENDPOINT || process.env.AWS_ENDPOINT_URL;
  const bucket =
    process.env.SUPABASE_STORAGE_BUCKET ||
    process.env.R2_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET;

  const accessKeyId =
    process.env.SUPABASE_STORAGE_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID;

  const secretAccessKey =
    process.env.SUPABASE_STORAGE_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY;

  const region =
    process.env.SUPABASE_STORAGE_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    process.env.AWS_REGION ||
    'auto';

  // Determine provider type
  let provider: StorageProviderType = 's3';
  if (explicitProvider) {
    provider = explicitProvider;
  } else if (endpoint?.includes('supabase.co')) {
    provider = 'supabase';
  } else if (endpoint?.includes('r2.cloudflarestorage.com')) {
    provider = 'r2';
  }

  if (!bucket) {
    throw new Error('Object storage bucket name is not configured (check AWS_S3_BUCKET_NAME / SUPABASE_STORAGE_BUCKET)');
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Object storage credentials are not configured (check AWS_ACCESS_KEY_ID / SUPABASE_STORAGE_ACCESS_KEY_ID)');
  }

  return {
    provider,
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: true,
  };
}

/**
 * Get or initialize the active storage provider singleton.
 */
export function getStorageProvider(): StorageProvider {
  if (!activeProvider) {
    const config = resolveStorageConfig();
    activeProvider = new S3CompatibleStorageProvider(config);
  }
  return activeProvider;
}

/**
 * Set an explicit storage provider (useful for testing and dependency injection).
 */
export function setStorageProvider(provider: StorageProvider | null): void {
  activeProvider = provider;
}

/**
 * Reset active storage provider instance.
 */
export function resetStorageProvider(): void {
  activeProvider = null;
}
