import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32;

function getDerivedKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for encryption");
  // Derive a stable 32-byte key from the session secret
  return scryptSync(secret, "project-nexus-vault-salt", KEY_LEN);
}

export function encrypt(plaintext: string): { encryptedValue: string; iv: string } {
  const key = getDerivedKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Store: authTag (16 bytes) + ciphertext, base64-encoded
  const combined = Buffer.concat([authTag, encrypted]);
  return {
    encryptedValue: combined.toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decrypt(encryptedValue: string, iv: string): string {
  const key = getDerivedKey();
  const ivBuf = Buffer.from(iv, "base64");
  const combined = Buffer.from(encryptedValue, "base64");
  const authTag = combined.subarray(0, 16);
  const ciphertext = combined.subarray(16);
  const decipher = createDecipheriv(ALGORITHM, key, ivBuf);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}
