import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const KEYS_DIR = path.join(process.cwd(), 'keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.key');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.key');

/**
 * Ensures that RSA keys exist, generating them if they don't.
 * Returns { privateKey: string, publicKey: string }
 */
export function getRsaKeys(): { privateKey: string; publicKey: string } {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
    return { privateKey, publicKey };
  }

  // Generate 2048-bit RSA key pair
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);

  return { privateKey, publicKey };
}
