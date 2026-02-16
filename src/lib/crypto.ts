import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is not set");
  return Buffer.from(key, "hex");
}

export function encrypt(plaintext: Buffer): {
  encrypted: Buffer;
  iv: string;
  tag: string;
} {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

export function decrypt(
  encrypted: Buffer,
  ivHex: string,
  tagHex: string
): Buffer {
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function encryptText(text: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const result = encrypt(Buffer.from(text, "utf8"));
  return {
    encrypted: result.encrypted.toString("hex"),
    iv: result.iv,
    tag: result.tag,
  };
}

export function decryptText(
  encryptedHex: string,
  iv: string,
  tag: string
): string {
  const buffer = decrypt(Buffer.from(encryptedHex, "hex"), iv, tag);
  return buffer.toString("utf8");
}
