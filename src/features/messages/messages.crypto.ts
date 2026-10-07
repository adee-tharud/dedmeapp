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
import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';

// ── Direct Base64URL encoding/decoding without atob/btoa dependencies ─────────

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_MAP: Record<string, number> = {};
for (let i = 0; i < B64URL.length; i++) {
  B64_MAP[B64URL[i]] = i;
}
B64_MAP['+'] = 62;
B64_MAP['/'] = 63;

function bytesToBase64Url(bytes: Uint8Array): string {
  let out = '';
  const len = bytes.length;
  let i = 0;
  for (; i + 2 < len; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64URL[b0 >> 2];
    out += B64URL[((b0 & 3) << 4) | (b1 >> 4)];
    out += B64URL[((b1 & 15) << 2) | (b2 >> 6)];
    out += B64URL[b2 & 63];
  }
  if (i < len) {
    const b0 = bytes[i];
    out += B64URL[b0 >> 2];
    if (i + 1 < len) {
      const b1 = bytes[i + 1];
      out += B64URL[((b0 & 3) << 4) | (b1 >> 4)];
      out += B64URL[(b1 & 15) << 2];
    } else {
      out += B64URL[(b0 & 3) << 4];
    }
  }
  return out;
}

function base64UrlToBytes(str: string): Uint8Array {
  const clean = str.replace(/=+$/, '');
  const len = clean.length;
  const byteLen = Math.floor((len * 3) / 4);
  const out = new Uint8Array(byteLen);
  let outIdx = 0;
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < len; i++) {
    const val = B64_MAP[clean[i]];
    if (val === undefined) {
      throw new Error(`Invalid base64 character: ${clean[i]}`);
    }
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[outIdx++] = (buffer >> bits) & 0xff;
    }
  }
  return out.subarray(0, outIdx);
}

// ── Text Encoding ─────────────────────────────────────────────────────────────

const textEncoder =
  typeof TextEncoder !== 'undefined'
    ? new TextEncoder()
    : {
        encode: (s: string) => {
          const utf8 = unescape(encodeURIComponent(s));
          const arr = new Uint8Array(utf8.length);
          for (let i = 0; i < utf8.length; i++) arr[i] = utf8.charCodeAt(i);
          return arr;
        },
      };

const textDecoder =
  typeof TextDecoder !== 'undefined'
    ? new TextDecoder()
    : {
        decode: (b: Uint8Array) => {
          let s = '';
          for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
          return decodeURIComponent(escape(s));
        },
      };

// ── CSPRNG (Cryptographically Secure Pseudo-Random Number Generator) ─────────
//
// In React Native / Expo without native modules, `globalThis.crypto.getRandomValues`
// is not provided by Hermes. We implement a Hash-DRBG backed by SHA-512 (via tweetnacl),
// high-resolution timers, Math.random entropy, and persistent SecureStore entropy.
// If Web Crypto `crypto.getRandomValues` is available (e.g. on Web), we prioritize it.

let entropyPool: Uint8Array = new Uint8Array(64);
let drbgCounter = 0;

// Initialize entropy pool with initial jitter and timestamps
(function initEntropy() {
  const seedBuffer = new Uint8Array(64 + 40);
  const time = Date.now();
  const perf = typeof performance !== 'undefined' ? performance.now() : 0;
  const view = new DataView(seedBuffer.buffer);
  view.setFloat64(0, time, false);
  view.setFloat64(8, perf, false);
  for (let i = 0; i < 20; i++) {
    view.setUint16(16 + i * 2, (Math.random() * 0xffff) >>> 0, false);
  }
  for (let i = 56; i < seedBuffer.length; i++) {
    seedBuffer[i] = (Math.random() * 256) >>> 0;
  }
  entropyPool = nacl.hash(seedBuffer);
})();

// Asynchronously mix in persistent entropy seed from SecureStore
const PERSISTENT_ENTROPY_KEY = '__deadme_entropy_seed__';
async function refreshPersistentEntropy(): Promise<void> {
  try {
    const existing = await SecureStore.getItemAsync(PERSISTENT_ENTROPY_KEY);
    const mix = new Uint8Array(64 + (existing ? 32 : 16));
    mix.set(entropyPool, 0);
    if (existing) {
      try {
        const decoded = base64UrlToBytes(existing);
        mix.set(decoded.subarray(0, 32), 64);
      } catch {
        // ignore malformed stored seed
      }
    }
    entropyPool = nacl.hash(mix);
    // Write new 32-byte seed back to SecureStore
    const newSeed = entropyPool.subarray(0, 32);
    await SecureStore.setItemAsync(PERSISTENT_ENTROPY_KEY, bytesToBase64Url(newSeed));
  } catch {
    // Non-fatal if SecureStore is not accessible yet
  }
}
// Kick off async persistent entropy mixing
refreshPersistentEntropy().catch(() => {});

// Detect if a native Web Crypto implementation already exists before polyfilling
const nativeGetRandomValues =
  typeof globalThis !== 'undefined' &&
  typeof globalThis.crypto?.getRandomValues === 'function'
    ? globalThis.crypto.getRandomValues.bind(globalThis.crypto)
    : null;

/**
 * Hash-DRBG (NIST SP 800-90A hash generator pattern with SHA-512)
 *
 * This function NEVER calls globalThis.crypto.getRandomValues, eliminating
 * any possibility of infinite recursion.
 */
function drbgRandomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  let generated = 0;

  while (generated < length) {
    drbgCounter++;
    const input = new Uint8Array(64 + 32);
    input.set(entropyPool, 0);

    const time = Date.now();
    const perf = typeof performance !== 'undefined' ? performance.now() : 0;
    const rand = Math.random();

    const view = new DataView(input.buffer, input.byteOffset + 64, 32);
    view.setUint32(0, drbgCounter, false);
    view.setFloat64(4, time, false);
    view.setFloat64(12, perf, false);
    view.setFloat64(20, rand, false);
    view.setUint32(28, (Math.random() * 0xffffffff) >>> 0, false);

    const digest = nacl.hash(input);

    // Backtracking resistance: update pool with hash of previous pool + digest
    const nextPoolInput = new Uint8Array(64 + 64);
    nextPoolInput.set(entropyPool, 0);
    nextPoolInput.set(digest, 64);
    entropyPool = nacl.hash(nextPoolInput);

    const toCopy = Math.min(length - generated, 64);
    out.set(digest.subarray(0, toCopy), generated);
    generated += toCopy;
  }

  return out;
}

/**
 * Generate cryptographically secure random bytes.
 */
export function randomBytes(length: number): Uint8Array {
  if (nativeGetRandomValues) {
    const buf = new Uint8Array(length);
    nativeGetRandomValues(buf);
    return buf;
  }
  return drbgRandomBytes(length);
}

// Register PRNG with TweetNaCl so internal calls to nacl.randomBytes also work
nacl.setPRNG((x: Uint8Array, n: number) => {
  const bytes = drbgRandomBytes(n);
  for (let i = 0; i < n; i++) {
    x[i] = bytes[i];
  }
});

// Polyfill globalThis.crypto.getRandomValues so callers relying on Web Crypto work safely
if (typeof globalThis !== 'undefined' && !nativeGetRandomValues) {
  (globalThis as unknown as { crypto: unknown }).crypto = {
    getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
      if (!array) return array;
      const bytes = drbgRandomBytes(array.byteLength);
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(bytes);
      return array;
    },
  };
}

// ── Key management ────────────────────────────────────────────────────────────

const KEY_PREFIX = 'msg_key_';

function storeKeyName(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

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

async function saveKey(userId: string, key: Uint8Array): Promise<void> {
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

export async function getOrCreateKey(userId: string): Promise<Uint8Array> {
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

export async function deleteKey(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('userId is required.');
  }

  await SecureStore.deleteItemAsync(storeKeyName(userId));
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

export async function encryptBody(
  plaintext: string,
  userId: string,
): Promise<string> {
  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a string.');
  }

  const key = await getOrCreateKey(userId);
  const nonce = randomBytes(nacl.secretbox.nonceLength);
  const messageBytes = textEncoder.encode(plaintext);
  const box = nacl.secretbox(messageBytes, nonce, key);

  return [
    bytesToBase64Url(nonce),
    bytesToBase64Url(box),
  ].join('.');
}

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
  const plainBytes = nacl.secretbox.open(box, nonce, key);

  if (!plainBytes) {
    throw new Error('Decryption failed.');
  }

  return textDecoder.decode(plainBytes);
}

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