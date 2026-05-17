import { pbkdf2Sync, randomBytes } from "crypto";

/**
 * Hashing password using PBKDF2 with random salt
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plain text password against the stored salted hash
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    if (!stored || !stored.includes(":")) {
      // If the password is pure plain text (e.g. initial seed or legacy migration), do a direct match
      return password === stored;
    }
    const [salt, hash] = stored.split(":");
    const testHash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return testHash === hash;
  } catch {
    return false;
  }
}
