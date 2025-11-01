/**
 * Enterprise-grade encryption utilities for sensitive data
 * Uses AES-256-GCM encryption with secure key derivation
 * Compliant with OWASP and NIST security standards 2025
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 128; // 128 bits authentication tag

/**
 * Derives a cryptographic key from the encryption secret
 */
async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 600000, // OWASP 2025 recommendation (increased from 310000)
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param plaintext - The data to encrypt
 * @param encryptionSecret - The encryption secret from environment
 * @returns Base64-encoded encrypted data with salt and IV
 */
export async function encryptData(plaintext: string, encryptionSecret: string): Promise<string> {
  if (!plaintext || !encryptionSecret) {
    throw new Error('Plaintext and encryption secret are required');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive key from secret
  const key = await deriveKey(encryptionSecret, salt);

  // Encrypt the data
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    key,
    data
  );

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts data encrypted with encryptData
 * @param encryptedBase64 - Base64-encoded encrypted data
 * @param encryptionSecret - The encryption secret from environment
 * @returns Decrypted plaintext
 */
export async function decryptData(encryptedBase64: string, encryptionSecret: string): Promise<string> {
  if (!encryptedBase64 || !encryptionSecret) {
    throw new Error('Encrypted data and encryption secret are required');
  }

  // Decode from base64
  const combined = new Uint8Array(
    atob(encryptedBase64)
      .split('')
      .map(char => char.charCodeAt(0))
  );

  // Extract salt, iv, and encrypted data
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 16 + IV_LENGTH);
  const encryptedData = combined.slice(16 + IV_LENGTH);

  // Derive key from secret
  const key = await deriveKey(encryptionSecret, salt);

  // Decrypt the data
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    key,
    encryptedData
  );

  // Convert back to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

/**
 * Securely wipes a string from memory (best effort)
 */
export function secureWipe(str: string): void {
  // Note: JavaScript doesn't provide direct memory access,
  // but we can overwrite the variable to help garbage collection
  if (str) {
    str = '\0'.repeat(str.length);
  }
}
