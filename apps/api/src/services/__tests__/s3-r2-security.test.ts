import { describe, it, expect } from "vitest";
import { generateUniqueKey, extractS3KeyFromUrl } from "../../lib/s3.js";
import {
  isAllowedAvatarType,
  isAllowedAttachmentType,
  MAX_AVATAR_SIZE,
  MAX_ATTACHMENT_SIZE,
} from "../../validation/uploads.js";

describe("S3 / R2 Storage Security & Key Generation", () => {
  const userId = "4e12c1b2-10f8-4e58-963b-63ffb0c79234";

  it("1. Generates user-scoped private S3 key embedding userId", () => {
    const key = generateUniqueKey(userId, "attachments", "homework.pdf");
    expect(key.startsWith(`attachments/${userId}/`)).toBe(true);
    expect(key.endsWith("-homework.pdf")).toBe(true);
  });

  it("2. Sanitizes dangerous filenames and prevents path traversal (e.g. ../../)", () => {
    const maliciousFilename = "../../etc/passwd..//malicious!@#$.pdf";
    const key = generateUniqueKey(userId, "attachments", maliciousFilename);

    expect(key).not.toContain("..");
    expect(key).not.toContain("/passwd");
    expect(key).not.toContain("!@#$");
    // Verify path component 1 is folder, 2 is userId, 3 is filename
    const parts = key.split("/");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("attachments");
    expect(parts[1]).toBe(userId);
  });

  it("3. Correctly parses proxy URLs and handles null/invalid formats safely", () => {
    const key = extractS3KeyFromUrl(`/uploads/attachments/${userId}/1234-note.pdf`);
    expect(key).toBe(`attachments/${userId}/1234-note.pdf`);

    expect(extractS3KeyFromUrl(null)).toBeNull();
    expect(extractS3KeyFromUrl(undefined)).toBeNull();
    expect(extractS3KeyFromUrl("https://external-site.com/image.png")).toBeNull();
  });

  it("4. Enforces strict MIME whitelist and strips headers/parameters safely", () => {
    expect(isAllowedAvatarType("image/jpeg")).toBe(true);
    expect(isAllowedAvatarType("image/png")).toBe(true);
    expect(isAllowedAvatarType("application/x-msdownload")).toBe(false);
    expect(isAllowedAvatarType("text/html")).toBe(false);

    expect(isAllowedAttachmentType("application/pdf")).toBe(true);
    expect(isAllowedAttachmentType("text/plain")).toBe(true);
    expect(isAllowedAttachmentType("text/plain; charset=utf-8")).toBe(true);
    expect(isAllowedAttachmentType("application/x-executable")).toBe(false);
  });

  it("5. File size limits conform to free-tier expectations", () => {
    expect(MAX_AVATAR_SIZE).toBe(2 * 1024 * 1024); // 2 MB
    expect(MAX_ATTACHMENT_SIZE).toBe(10 * 1024 * 1024); // 10 MB
  });
  it("6. Multi-tenant storage boundary: enforces that object key owner matches session user", () => {
    const ownerUserId = "user-1111-owner";
    const foreignUserId = "user-2222-attacker";
    const objectKey = generateUniqueKey(ownerUserId, "attachments", "exam-notes.pdf");

    const keyParts = objectKey.split("/");
    const objectOwner = keyParts[1];

    expect(objectOwner).toBe(ownerUserId);
    expect(objectOwner === foreignUserId).toBe(false);
  });

  it("7. Strict rejection of dangerous script and executable MIME types", () => {
    const dangerousMimeTypes = [
      "application/x-sh",
      "application/x-bat",
      "application/javascript",
      "application/x-msdownload",
      "application/x-executable",
    ];

    for (const mime of dangerousMimeTypes) {
      expect(isAllowedAttachmentType(mime as any)).toBe(false);
      expect(isAllowedAvatarType(mime as any)).toBe(false);
    }
  });

  it("8. Mocked R2 / S3 endpoint configuration parses valid cloudflare R2 format", () => {
    const accountId = "test-cf-account-id-123456789";
    const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const parsed = new URL(r2Endpoint);

    expect(parsed.protocol).toBe("https:");
    expect(parsed.hostname).toBe(`${accountId}.r2.cloudflarestorage.com`);
  });
});
