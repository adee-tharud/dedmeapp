// /**
//  * Client-side encryption for secret message bodies.
//  *
//  * Security design: see SECURITY.md in this directory.
//  *
//  * Algorithm : XSalsa20-Poly1305 (NaCl secretbox) via tweetnacl
//  * Key store : expo-secure-store (iOS Keychain / Android Keystore)
//  * Key size  : 32 bytes (256-bit)
//  * Nonce     : 24 bytes, cryptographically random per encrypt call
//  *
//  * Wire format stored in DB:
//  *   <base64url(nonce)>.<base64url(ciphertext)>
//  *
//  * NEVER log or transmit the plaintext body or the encryption key.
//  */
// import * as SecureStore from 'expo-secure-store';
// import nacl from 'tweetnacl';

// // ── RNG helper ────────────────────────────────────────────────────────────────
// // In React Native / Hermes the Web Crypto API lives on `global.crypto`, not
// // the bare `crypto` identifier that works in a browser or Node.js.
// function randomBytes(length: number): Uint8Array {
//   const buf = new Uint8Array(length);
//   const webCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
//   if (webCrypto?.getRandomValues) {
//     webCrypto.getRandomValues(buf);
//   } else {
//     // Should never happen on Expo SDK 50+ / Hermes, but fail loudly if it does.
//     throw new Error('No cryptographically secure RNG available on this platform.');
//   }
//   return buf;
// }

// // ── Key management ─────────────────────────────────────────────────────────────

// const KEY_PREFIX = 'msg_key_';

// /**
//  * Returns the SecureStore key name for a given user.
//  * Namespaced so multiple accounts on the same device don't collide.
//  */
// function storeKeyName(userId: string): string {
//   return `${KEY_PREFIX}${userId}`;
// }

// /**
//  * Retrieve the user's encryption key from SecureStore.
//  * Returns null if no key has been stored yet.
//  *
//  * @internal — call getOrCreateKey() from outside this module.
//  */
// async function loadKey(userId: string): Promise<Uint8Array | null> {
//   const stored = await SecureStore.getItemAsync(storeKeyName(userId));
//   if (!stored) return null;
//   return base64ToBytes(stored);
// }

// /**
//  * Persist the encryption key in SecureStore with the most restrictive
//  * access level: only accessible when the device is unlocked.
//  */
// async function saveKey(userId: string, key: Uint8Array): Promise<void> {
//   await SecureStore.setItemAsync(
//     storeKeyName(userId),
//     bytesToBase64(key),
//     {
//       // requireAuthentication: false — don't require biometrics on every access;
//       // the Keychain itself is hardware-protected when the device is locked.
//       keychainAccessible: SecureStore.WHEN_UNLOCKED,
//     },
//   );
// }

// /**
//  * Get the encryption key for a user, creating and persisting a new one
//  * if it doesn't exist yet. This is the single entry point for key access.
//  *
//  * Security: key is generated using expo-crypto (cryptographically secure RNG).
//  * The key NEVER leaves the device — it is never sent to the server.
//  */
// export async function getOrCreateKey(userId: string): Promise<Uint8Array> {
//   const existing = await loadKey(userId);
//   if (existing) return existing;

//   // Generate a new 32-byte (256-bit) key using the Web Crypto API (built into
//   // Hermes/React Native — no native module or dev build required).
//   const key = randomBytes(nacl.secretbox.keyLength);

//   await saveKey(userId, key);
//   return key;
// }

// /**
//  * Delete the encryption key from SecureStore.
//  * CAUTION: Call this only on account deletion. All messages become
//  * permanently unreadable once the key is deleted.
//  */
// export async function deleteKey(userId: string): Promise<void> {
//   await SecureStore.deleteItemAsync(storeKeyName(userId));
// }

// // ── Encrypt / Decrypt ──────────────────────────────────────────────────────────

// /**
//  * Encrypt a plaintext message body for storage in Supabase.
//  *
//  * Returns a string in the format: `<base64(nonce)>.<base64(ciphertext)>`
//  * A fresh random nonce is generated for each call, so encrypting the same
//  * plaintext twice produces different ciphertexts (semantic security).
//  */
// export async function encryptBody(plaintext: string, userId: string): Promise<string> {
//   const key = await getOrCreateKey(userId);

//   // Fresh 24-byte random nonce for every message (Web Crypto API)
//   const nonce = randomBytes(nacl.secretbox.nonceLength);

//   const messageBytes = textEncoder.encode(plaintext);
//   const box = nacl.secretbox(messageBytes, nonce, key);

//   return `${bytesToBase64(nonce)}.${bytesToBase64(box)}`;
// }

// /**
//  * Decrypt a ciphertext string previously produced by encryptBody.
//  *
//  * Returns the original plaintext, or throws if:
//  * - The format is malformed
//  * - The key is wrong (different user's key)
//  * - The ciphertext has been tampered with (authentication tag fails)
//  *
//  * Security: authentication failure is indistinguishable from decryption
//  * failure — we throw a generic error to avoid oracle attacks.
//  */
// export async function decryptBody(ciphertext: string, userId: string): Promise<string> {
//   const parts = ciphertext.split('.');
//   if (parts.length !== 2) {
//     throw new Error('Invalid ciphertext format');
//   }

//   const nonce = base64ToBytes(parts[0]);
//   const box   = base64ToBytes(parts[1]);

//   const key = await getOrCreateKey(userId);
//   const plainBytes = nacl.secretbox.open(box, nonce, key);

//   if (!plainBytes) {
//     // Authentication failed — key mismatch or tampered ciphertext
//     throw new Error('Decryption failed: authentication tag mismatch');
//   }

//   return textDecoder.decode(plainBytes);
// }

// /**
//  * Returns true if a string looks like an encrypted body (nonce.ciphertext format).
//  * Use this to safely skip decryption on legacy plaintext rows if any exist.
//  */
// export function isEncrypted(body: string): boolean {
//   const parts = body.split('.');
//   return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
// }

// // ── Helpers ────────────────────────────────────────────────────────────────────

// // Reuse encoder/decoder instances for performance
// const textEncoder = new TextEncoder();
// const textDecoder = new TextDecoder();

// function bytesToBase64(bytes: Uint8Array): string {
//   // btoa works with latin1 byte strings
//   return btoa(String.fromCharCode(...bytes));
// }

// function base64ToBytes(b64: string): Uint8Array {
//   const binaryStr = atob(b64);
//   const bytes = new Uint8Array(binaryStr.length);
//   for (let i = 0; i < binaryStr.length; i++) {
//     bytes[i] = binaryStr.charCodeAt(i);
//   }
//   return bytes;
// }


/**
 * Client-side encryption for secret message bodies.
 *
 * Security design: see SECURITY.md in this directory.
 *
 * Algorithm : XSalsa20-Poly1305 (NaCl secretbox) via tweetnacl
 * Key store : expo-secure-store (iOS Keychain / Android Keystore)
 * Key size  : 32 bytes (256-bit)
 * Nonce     : 24 bytes, cryptographically random per encrypt call
 *
 * Wire format stored in DB:
 *   <base64url(nonce)>.<base64url(ciphertext)>
 *
 * NEVER log or transmit the plaintext body or the encryption key.
 */

import 'expo-crypto';

import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';

// ── RNG helper ────────────────────────────────────────────────────────────────

/**
 * Generate cryptographically secure random bytes using the Web Crypto API.
 *
 * In React Native / Hermes, access Web Crypto through globalThis.crypto.
 *
 * IMPORTANT:
 * Do not fall back to Math.random() or any non-CSPRNG source.
 */
function randomBytes(length: number): Uint8Array {
  const webCrypto = globalThis.crypto;

  if (!webCrypto?.getRandomValues) {
    throw new Error(
      'Web Crypto getRandomValues() is not available on this platform.',
    );
  }

  const buf = new Uint8Array(length);
  webCrypto.getRandomValues(buf);

  return buf;
}

// ── Key management ───────────────────────────────────────────────────────────

const KEY_PREFIX = 'msg_key_';

/**
 * Returns the SecureStore key name for a given user.
 *
 * Namespaced so multiple accounts on the same device don't collide.
 */
function storeKeyName(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

/**
 * Retrieve the user's encryption key from SecureStore.
 *
 * Returns null if no key has been stored yet.
 *
 * @internal — call getOrCreateKey() from outside this module.
 */
async function loadKey(userId: string): Promise<Uint8Array | null> {
  const stored = await SecureStore.getItemAsync(storeKeyName(userId));

  if (!stored) {
    return null;
  }

  try {
    const key = base64UrlToBytes(stored);

    if (key.length !== nacl.secretbox.keyLength) {
      throw new Error('Invalid stored encryption key length.');
    }

    return key;
  } catch {
    throw new Error('Invalid stored encryption key.');
  }
}

/**
 * Persist the encryption key in SecureStore.
 *
 * WHEN_UNLOCKED means the Keychain item is only accessible while
 * the device is unlocked.
 */
async function saveKey(
  userId: string,
  key: Uint8Array,
): Promise<void> {
  if (key.length !== nacl.secretbox.keyLength) {
    throw new Error('Invalid encryption key length.');
  }

  await SecureStore.setItemAsync(
    storeKeyName(userId),
    bytesToBase64Url(key),
    {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    },
  );
}

/**
 * Get the encryption key for a user, creating and persisting a new one
 * if it doesn't exist yet.
 *
 * Security:
 * - Key is generated using Web Crypto getRandomValues().
 * - Key is stored in SecureStore.
 * - Key is never sent to the server.
 */
export async function getOrCreateKey(
  userId: string,
): Promise<Uint8Array> {
  if (!userId) {
    throw new Error('userId is required.');
  }

  const existing = await loadKey(userId);

  if (existing) {
    return existing;
  }

  const key = randomBytes(nacl.secretbox.keyLength);

  await saveKey(userId, key);

  return key;
}

/**
 * Delete the encryption key from SecureStore.
 *
 * CAUTION:
 * Call this only when intentionally deleting the account/key.
 * All messages encrypted with this key become permanently unreadable.
 */
export async function deleteKey(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('userId is required.');
  }

  await SecureStore.deleteItemAsync(storeKeyName(userId));
}

// ── Encrypt ──────────────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext message body for storage in Supabase.
 *
 * Returns:
 *
 *   <base64url(nonce)>.<base64url(ciphertext)>
 *
 * A fresh random nonce is generated for every encryption call.
 *
 * Encrypting the same plaintext twice therefore produces different
 * ciphertexts.
 */
export async function encryptBody(
  plaintext: string,
  userId: string,
): Promise<string> {
  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a string.');
  }

  const key = await getOrCreateKey(userId);

  // XSalsa20-Poly1305 requires a 24-byte nonce.
  const nonce = randomBytes(nacl.secretbox.nonceLength);

  const messageBytes = textEncoder.encode(plaintext);

  const box = nacl.secretbox(
    messageBytes,
    nonce,
    key,
  );

  return [
    bytesToBase64Url(nonce),
    bytesToBase64Url(box),
  ].join('.');
}

// ── Decrypt ──────────────────────────────────────────────────────────────────

/**
 * Decrypt a ciphertext previously produced by encryptBody().
 *
 * Throws if:
 * - ciphertext format is malformed
 * - nonce length is invalid
 * - ciphertext is too short
 * - the wrong user's key is used
 * - ciphertext has been modified
 */
export async function decryptBody(
  ciphertext: string,
  userId: string,
): Promise<string> {
  if (typeof ciphertext !== 'string') {
    throw new Error('Ciphertext must be a string.');
  }

  const parts = ciphertext.split('.');

  if (parts.length !== 2) {
    throw new Error('Invalid ciphertext format.');
  }

  let nonce: Uint8Array;
  let box: Uint8Array;

  try {
    nonce = base64UrlToBytes(parts[0]);
    box = base64UrlToBytes(parts[1]);
  } catch {
    throw new Error('Invalid ciphertext encoding.');
  }

  if (nonce.length !== nacl.secretbox.nonceLength) {
    throw new Error('Invalid ciphertext nonce.');
  }

  if (box.length < nacl.secretbox.overheadLength) {
    throw new Error('Invalid ciphertext length.');
  }

  const key = await getOrCreateKey(userId);

  const plainBytes = nacl.secretbox.open(
    box,
    nonce,
    key,
  );

  if (!plainBytes) {
    // Do not distinguish between:
    // - wrong key
    // - modified ciphertext
    // - invalid authentication tag
    throw new Error('Decryption failed.');
  }

  return textDecoder.decode(plainBytes);
}

// ── Encryption detection ─────────────────────────────────────────────────────

/**
 * Returns true if a string has the expected encrypted-body structure.
 *
 * This does NOT prove that the ciphertext is authentic.
 * Authentication is performed by decryptBody().
 *
 * This is intended primarily for distinguishing encrypted rows
 * from legacy plaintext rows.
 */
export function isEncrypted(body: string): boolean {
  if (typeof body !== 'string') {
    return false;
  }

  const parts = body.split('.');

  if (parts.length !== 2) {
    return false;
  }

  try {
    const nonce = base64UrlToBytes(parts[0]);
    const box = base64UrlToBytes(parts[1]);

    return (
      nonce.length === nacl.secretbox.nonceLength &&
      box.length >= nacl.secretbox.overheadLength
    );
  } catch {
    return false;
  }
}

// ── Text encoding ─────────────────────────────────────────────────────────────

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// ── Base64URL helpers ─────────────────────────────────────────────────────────

/**
 * Convert bytes to Base64URL without padding.
 *
 * Base64URL uses:
 *   + -> -
 *   / -> _
 *   = -> removed
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';

  // Avoid spreading a large Uint8Array into function arguments.
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  const base64 = btoa(binary);

  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * Convert Base64URL to bytes.
 */
function base64UrlToBytes(value: string): Uint8Array {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('Invalid Base64URL.');
  }

  // Convert Base64URL back to normal Base64.
  let base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Restore Base64 padding.
  const padding = base64.length % 4;

  if (padding === 2) {
    base64 += '==';
  } else if (padding === 3) {
    base64 += '=';
  } else if (padding === 1) {
    throw new Error('Invalid Base64URL length.');
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}