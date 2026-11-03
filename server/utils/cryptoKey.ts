import crypto from 'crypto';

export interface GeneratedApiKey {
  rawKey: string;     // Shown strictly once to the user upon creation
  keyHash: string;    // SHA-256 digest stored securely in MongoDB
  keyPrefix: string;  // Safe preview for dashboard (e.g., sab_live_a3f9...c4b2)
}

/**
 * Generates a cryptographically secure API key with prefix and at least 32 bytes of entropy.
 */
export function generateSecureApiKey(prefix = 'sab_live_'): GeneratedApiKey {
  // 32 bytes of cryptographically secure random bytes
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const rawKey = `${prefix}${randomBytes}`;

  // Compute secure SHA-256 hash
  const keyHash = hashApiKey(rawKey);

  // Generate safe masked display prefix (e.g. sab_live_a3f9...d2e1)
  const keyPrefix = `${rawKey.slice(0, 13)}...${rawKey.slice(-4)}`;

  return {
    rawKey,
    keyHash,
    keyPrefix,
  };
}

/**
 * Generates SHA-256 hash of an API key for database lookup.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex');
}
