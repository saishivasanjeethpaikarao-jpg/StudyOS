import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM

function getMasterKey(): Buffer {
  const secret =
    process.env.STUDYOS_SECRET_KEY ||
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    "studyos-dev-encryption-key-fallback-32b";
  // Always derive a strictly 32-byte key via SHA-256
  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a sensitive API key using AES-256-GCM.
 * Output format: "ivHex:tagHex:encryptedHex"
 */
export function encryptApiKey(plainKey: string): string {
  if (!plainKey || typeof plainKey !== "string") {
    throw new Error("Invalid key for encryption");
  }
  const iv = randomBytes(IV_LENGTH);
  const key = getMasterKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainKey, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt an AES-256-GCM encrypted API key.
 * Throws if tampering or invalid authentication tag is detected.
 */
export function decryptApiKey(cipherText: string): string {
  if (!cipherText || typeof cipherText !== "string") {
    throw new Error("Invalid ciphertext for decryption");
  }
  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed ciphertext structure");
  }
  const [ivHex, tagHex, encryptedHex] = parts;
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error("Missing IV, tag, or encrypted payload");
  }

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const key = getMasterKey();

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Mask an API key so that only a safe suffix is visible to the client.
 * Example: "AIzaSyD...9abc" or "...9abc"
 */
export function maskApiKey(key: string): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return "..." + trimmed.slice(-2);
  }
  return "..." + trimmed.slice(-4);
}
