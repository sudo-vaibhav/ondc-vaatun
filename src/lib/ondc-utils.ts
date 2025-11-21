import crypto from 'crypto';
import _sodium from 'libsodium-wrappers';

// ONDC Configuration - loaded from environment variables
function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const ENCRYPTION_PRIVATE_KEY = getEnvVar('ENCRYPTION_PRIVATE_KEY');
export const ONDC_PUBLIC_KEY = getEnvVar('ONDC_PUBLIC_KEY');
export const REQUEST_ID = getEnvVar('REQUEST_ID');
export const SIGNING_PRIVATE_KEY = getEnvVar('SIGNING_PRIVATE_KEY');

// Pre-compute keys and shared secret
const privateKey = crypto.createPrivateKey({
  key: Buffer.from(ENCRYPTION_PRIVATE_KEY, 'base64'),
  format: 'der',
  type: 'pkcs8',
});

const publicKey = crypto.createPublicKey({
  key: Buffer.from(ONDC_PUBLIC_KEY, 'base64'),
  format: 'der',
  type: 'spki',
});

// Calculate the shared secret key using Diffie-Hellman
export const sharedKey = crypto.diffieHellman({
  privateKey: privateKey,
  publicKey: publicKey,
});

/**
 * Decrypt using AES-256-ECB
 */
export function decryptAES256ECB(key: Buffer, encrypted: string): string {
  const iv = Buffer.alloc(0); // ECB doesn't use IV
  const decipher = crypto.createDecipheriv('aes-256-ecb', key, iv);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Sign a message using libsodium
 */
export async function signMessage(
  signingString: string,
  privateKey: string
): Promise<string> {
  await _sodium.ready;
  const sodium = _sodium;
  const signedMessage = sodium.crypto_sign_detached(
    signingString,
    sodium.from_base64(privateKey, _sodium.base64_variants.ORIGINAL)
  );
  const signature = sodium.to_base64(
    signedMessage,
    _sodium.base64_variants.ORIGINAL
  );
  return signature;
}
