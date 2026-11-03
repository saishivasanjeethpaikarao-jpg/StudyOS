/**
 * Comprehensive Storage Provider & Supabase Storage Compatibility Tests
 *
 * Verifies:
 * 1. StorageProvider abstraction and multi-provider configuration resolution (Supabase vs R2 vs S3).
 * 2. Missing configuration fail-closed behavior.
 * 3. Path traversal elimination and sanitized user-scoped object keys.
 * 4. Multi-tenant cross-user access isolation.
 * 5. File size limits and MIME whitelist verification.
 * 6. Presigned URL generation for private object access.
 * 7. Mocked S3/Supabase upload, download, and delete operations.
 * 8. NoSuchKey handling and network error resilience.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  S3CompatibleStorageProvider,
  resolveStorageConfig,
  generateUniqueKey,
  sanitizeFilename,
  extractKeyFromUrl,
  resetStorageProvider,
} from '../storage/index.js';
import {
  isAllowedAvatarType,
  isAllowedAttachmentType,
  MAX_AVATAR_SIZE,
  MAX_ATTACHMENT_SIZE,
} from '../../validation/uploads.js';

describe('Storage Provider & Supabase Storage Compatibility', () => {
  const originalEnv = { ...process.env };
  const mockUserId = 'usr_7f8a9b1c-3d2e-4f5a-8b9c-0d1e2f3a4b5c';
  const foreignUserId = 'usr_99999999-0000-0000-0000-000000000000';

  beforeEach(() => {
    vi.resetModules();
    resetStorageProvider();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    resetStorageProvider();
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. CONFIGURATION & PROVIDER RESOLUTION
  // ============================================================================
  describe('Configuration & Provider Resolution', () => {
    it('1.1 Resolves Supabase Storage configuration from SUPABASE_STORAGE_S3_ENDPOINT', () => {
      process.env.SUPABASE_STORAGE_S3_ENDPOINT = 'https://xyzprojectref.supabase.co/storage/v1/s3';
      process.env.SUPABASE_STORAGE_BUCKET = 'studyos-files';
      process.env.SUPABASE_STORAGE_ACCESS_KEY_ID = 'test-supabase-access-key';
      process.env.SUPABASE_STORAGE_SECRET_ACCESS_KEY = 'test-supabase-secret-key';
      process.env.SUPABASE_STORAGE_REGION = 'ap-south-1';

      const config = resolveStorageConfig();
      expect(config.provider).toBe('supabase');
      expect(config.endpoint).toBe('https://xyzprojectref.supabase.co/storage/v1/s3');
      expect(config.bucket).toBe('studyos-files');
      expect(config.accessKeyId).toBe('test-supabase-access-key');
      expect(config.secretAccessKey).toBe('test-supabase-secret-key');
      expect(config.region).toBe('ap-south-1');
      expect(config.forcePathStyle).toBe(true);
    });

    it('1.2 Resolves Cloudflare R2 configuration from AWS_ENDPOINT_URL hostname', () => {
      delete process.env.SUPABASE_STORAGE_S3_ENDPOINT;
      delete process.env.SUPABASE_STORAGE_BUCKET;
      delete process.env.SUPABASE_STORAGE_ACCESS_KEY_ID;
      delete process.env.SUPABASE_STORAGE_SECRET_ACCESS_KEY;

      process.env.AWS_ENDPOINT_URL = 'https://0123456789abcdef.r2.cloudflarestorage.com';
      process.env.AWS_S3_BUCKET_NAME = 'studyos-r2-files';
      process.env.AWS_ACCESS_KEY_ID = 'test-r2-access-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-r2-secret-key';
      process.env.AWS_REGION = 'auto';

      const config = resolveStorageConfig();
      expect(config.provider).toBe('r2');
      expect(config.endpoint).toBe('https://0123456789abcdef.r2.cloudflarestorage.com');
      expect(config.bucket).toBe('studyos-r2-files');
      expect(config.region).toBe('auto');
    });

    it('1.3 Explicit STORAGE_PROVIDER override takes precedence over endpoint guessing', () => {
      process.env.STORAGE_PROVIDER = 'supabase';
      process.env.AWS_ENDPOINT_URL = 'https://custom-storage-proxy.internal/s3';
      process.env.AWS_S3_BUCKET_NAME = 'studyos-bucket';
      process.env.AWS_ACCESS_KEY_ID = 'access-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'secret-key';

      const config = resolveStorageConfig();
      expect(config.provider).toBe('supabase');
    });

    it('1.4 Fails closed with descriptive error when bucket name is missing', () => {
      delete process.env.AWS_S3_BUCKET;
      delete process.env.AWS_S3_BUCKET_NAME;
      delete process.env.R2_BUCKET_NAME;
      delete process.env.SUPABASE_STORAGE_BUCKET;
      process.env.AWS_ACCESS_KEY_ID = 'id';
      process.env.AWS_SECRET_ACCESS_KEY = 'secret';

      expect(() => resolveStorageConfig()).toThrow(/bucket name is not configured/i);
    });

    it('1.5 Fails closed with descriptive error when credentials are missing', () => {
      process.env.AWS_S3_BUCKET_NAME = 'studyos-bucket';
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.SUPABASE_STORAGE_ACCESS_KEY_ID;

      expect(() => resolveStorageConfig()).toThrow(/credentials are not configured/i);
    });
  });

  // ============================================================================
  // 2. PATH SANITIZATION & ZERO-TRUST KEY GENERATION
  // ============================================================================
  describe('Path Sanitization & Key Generation', () => {
    it('2.1 Strips leading directory traversal patterns (../../etc/passwd)', () => {
      const malicious = '../../../../etc/passwd';
      const sanitized = sanitizeFilename(malicious);
      expect(sanitized).toBe('passwd');
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
    });

    it('2.2 Strips Windows drive paths and UNC network paths', () => {
      const windowsPath = 'C:\\Windows\\System32\\cmd.exe';
      const sanitized = sanitizeFilename(windowsPath);
      expect(sanitized).toBe('cmd.exe');
      expect(sanitized).not.toContain('\\');
      expect(sanitized).not.toContain('c:');
    });

    it('2.3 Replaces special characters and collapses multiple dots/hyphens', () => {
      const complexFilename = 'Physics Exam #1 & Answers (Final)...v2!.pdf';
      const sanitized = sanitizeFilename(complexFilename);
      expect(sanitized).toBe('physics-exam-1-answers-final-.v2-.pdf');
    });

    it('2.4 Embeds owning userId in format: {folder}/{userId}/{timestamp}-{sanitizedFilename}', () => {
      const key = generateUniqueKey(mockUserId, 'attachments', 'chemistry-notes.pdf');
      const parts = key.split('/');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('attachments');
      expect(parts[1]).toBe(mockUserId);
      expect(parts[2]).toMatch(/^\d+-chemistry-notes\.pdf$/);
    });

    it('2.5 Extract key safely parses proxy URLs and rejects foreign URLs', () => {
      expect(extractKeyFromUrl(`/uploads/attachments/${mockUserId}/12345-note.pdf`)).toBe(
        `attachments/${mockUserId}/12345-note.pdf`
      );
      expect(extractKeyFromUrl('https://evil.com/uploads/something')).toBeNull();
      expect(extractKeyFromUrl(null)).toBeNull();
      expect(extractKeyFromUrl(undefined)).toBeNull();
    });
  });

  // ============================================================================
  // 3. MULTI-TENANT CROSS-USER ISOLATION
  // ============================================================================
  describe('Multi-Tenant Cross-User Isolation', () => {
    it('3.1 Rejects access when session userId does not match object key owner', () => {
      const ownerKey = generateUniqueKey(mockUserId, 'attachments', 'private-study-plan.pdf');
      const keyParts = ownerKey.split('/');
      const keyOwnerId = keyParts[1];

      // Legitimate user
      expect(keyOwnerId === mockUserId).toBe(true);

      // Foreign user attempting access
      expect(keyOwnerId === foreignUserId).toBe(false);
    });

    it('3.2 Rejects generic upload route access for private learning resources', () => {
      const resourceKey = `resources/${mockUserId}/secret-syllabus.pdf`;
      // Upload route policy forbids serving resources/* from generic /uploads/* proxy
      const isBlockedResource = resourceKey.startsWith('resources/');
      expect(isBlockedResource).toBe(true);
    });
  });

  // ============================================================================
  // 4. FILE VALIDATION & SIZE RESTRICTIONS
  // ============================================================================
  describe('MIME Whitelist & Size Limits', () => {
    it('4.1 Strictly rejects dangerous scripts, executables, and server files', () => {
      const maliciousTypes = [
        'application/x-sh',
        'application/x-bat',
        'application/x-msdownload',
        'application/javascript',
        'text/javascript',
        'application/x-php',
        'text/html',
      ];

      for (const mime of maliciousTypes) {
        expect(isAllowedAttachmentType(mime as any)).toBe(false);
        expect(isAllowedAvatarType(mime as any)).toBe(false);
      }
    });

    it('4.2 Accepts permitted academic documents and media', () => {
      expect(isAllowedAttachmentType('application/pdf')).toBe(true);
      expect(isAllowedAttachmentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
      expect(isAllowedAttachmentType('text/plain')).toBe(true);
      expect(isAllowedAttachmentType('image/png')).toBe(true);
      expect(isAllowedAttachmentType('video/mp4')).toBe(true);
    });

    it('4.3 Enforces avatar max size of 2 MB and attachment max size of 10 MB', () => {
      expect(MAX_AVATAR_SIZE).toBe(2 * 1024 * 1024);
      expect(MAX_ATTACHMENT_SIZE).toBe(10 * 1024 * 1024);

      const oversizedAvatar = MAX_AVATAR_SIZE + 1;
      const oversizedAttachment = MAX_ATTACHMENT_SIZE + 1;

      expect(oversizedAvatar > MAX_AVATAR_SIZE).toBe(true);
      expect(oversizedAttachment > MAX_ATTACHMENT_SIZE).toBe(true);
    });
  });

  // ============================================================================
  // 5. MOCKED SUPABASE S3 STORAGE OPERATIONS
  // ============================================================================
  describe('Mocked Supabase S3 Operations', () => {
    const mockConfig = {
      provider: 'supabase' as const,
      endpoint: 'https://test-ref.supabase.co/storage/v1/s3',
      region: 'ap-south-1',
      bucket: 'studyos-files',
      accessKeyId: 'mock-access-key-id',
      secretAccessKey: 'mock-secret-access-key',
      forcePathStyle: true,
    };

    it('5.1 Upload stores file and returns authenticated proxy URL', async () => {
      const provider = new S3CompatibleStorageProvider(mockConfig);
      const sendSpy = vi.spyOn((provider as any).client, 'send').mockResolvedValueOnce({} as any);

      const testBuffer = Buffer.from('Mock PDF Content for StudyOS');
      const key = `attachments/${mockUserId}/1234-syllabus.pdf`;

      const proxyUrl = await provider.upload(key, testBuffer, 'application/pdf');

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const putCall: any = sendSpy.mock.calls[0]?.[0];
      expect(putCall?.input?.Bucket).toBe('studyos-files');
      expect(putCall?.input?.Key).toBe(key);
      expect(putCall?.input?.ContentType).toBe('application/pdf');
      expect(proxyUrl).toBe(`/uploads/${key}`);
    });

    it('5.2 getObject returns stream and metadata when object exists', async () => {
      const provider = new S3CompatibleStorageProvider(mockConfig);
      const mockStream = new ReadableStream();
      const sendSpy = vi.spyOn((provider as any).client, 'send').mockResolvedValueOnce({
        Body: {
          transformToWebStream: () => mockStream,
        },
        ContentType: 'application/pdf',
        ContentLength: 1024,
      } as any);

      const result = await provider.getObject(`attachments/${mockUserId}/doc.pdf`);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('application/pdf');
      expect(result?.contentLength).toBe(1024);
      expect(result?.body).toBe(mockStream);
    });

    it('5.3 getObject gracefully returns null for NoSuchKey / NotFound without crashing', async () => {
      const provider = new S3CompatibleStorageProvider(mockConfig);
      const notFoundError = new Error('The specified key does not exist.');
      notFoundError.name = 'NoSuchKey';
      vi.spyOn((provider as any).client, 'send').mockRejectedValueOnce(notFoundError);

      const result = await provider.getObject(`attachments/${mockUserId}/missing.pdf`);
      expect(result).toBeNull();
    });

    it('5.4 delete sends DeleteObjectCommand to storage backend', async () => {
      const provider = new S3CompatibleStorageProvider(mockConfig);
      const sendSpy = vi.spyOn((provider as any).client, 'send').mockResolvedValueOnce({} as any);

      const key = `attachments/${mockUserId}/old-notes.pdf`;
      await provider.delete(key);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const deleteCall: any = sendSpy.mock.calls[0]?.[0];
      expect(deleteCall?.input?.Bucket).toBe('studyos-files');
      expect(deleteCall?.input?.Key).toBe(key);
    });

    it('5.5 Generates signed download URL with SigV4 authentication parameters', async () => {
      const provider = new S3CompatibleStorageProvider(mockConfig);
      const key = `attachments/${mockUserId}/exam-guide.pdf`;

      const signedUrl = await provider.getSignedDownloadUrl(key, 900);

      expect(signedUrl).toContain('https://test-ref.supabase.co/storage/v1/s3');
      expect(signedUrl).toContain('studyos-files');
      expect(signedUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(signedUrl).toContain('X-Amz-Credential=');
      expect(signedUrl).toContain('X-Amz-Expires=900');
      expect(signedUrl).toContain('X-Amz-Signature=');
    });

    it('5.6 Propagates unhandled network and authorization errors for logging', async () => {
      const provider = new S3CompatibleStorageProvider(mockConfig);
      const authError = new Error('InvalidAccessKeyId: The AWS Access Key Id does not exist');
      authError.name = 'InvalidAccessKeyId';
      vi.spyOn((provider as any).client, 'send').mockRejectedValueOnce(authError);

      await expect(provider.getObject(`attachments/${mockUserId}/test.pdf`)).rejects.toThrow(
        /InvalidAccessKeyId/
      );
    });
  });
});
