import * as crypto from 'crypto';
import * as argon2 from 'argon2';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Hash password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64MB
    timeCost: 3,
    parallelism: 4
  });
}

/**
 * Verify password against Argon2id hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (err) {
    return false;
  }
}

/**
 * Encrypt a plain text string using AES-256-GCM.
 * The master key is read from env.MASTER_ENCRYPTION_KEY (must be 32 bytes hex).
 */
export function encrypt(text: string): string {
  const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY;
  if (!masterKeyHex || masterKeyHex.length !== 64) {
    throw new Error('MASTER_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }
  const key = Buffer.from(masterKeyHex, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();

  // Return IV + AuthTag + EncryptedText in a single colon-separated string
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a cipher text string using AES-256-GCM.
 */
export function decrypt(cipherText: string): string {
  const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY;
  if (!masterKeyHex || masterKeyHex.length !== 64) {
    throw new Error('MASTER_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }
  const key = Buffer.from(masterKeyHex, 'hex');

  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format.');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encryptedText = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedText);
  // Buffer.concat with final decrypted buffer
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}
