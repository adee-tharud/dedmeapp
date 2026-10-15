/**
 * Client-side encryption for secret message bodies.
 *
 * Security architecture & threat model: see SECURITY.md in this directory.
 *
 * Cryptographic Primitives:
 * - CSPRNG        : Hardware-backed native randomness via expo-crypto (SecRandomCopyBytes / getrandom)
 * - Message Cipher: XSalsa20-Poly1305 (NaCl secretbox) via tweetnacl
 * - User Envelope : NaCl secretbox with device key in expo-secure-store (Keychain / Keystore)
 * - Escrow Envelope: Anonymous sealed box (Ephemeral-Static X25519-XSalsa20-Poly1305) with server Escrow Public Key
 *
 * Stored Wire Format (v2):
 *   v2.<user_envelope>.<escrow_envelope>.<msg_nonce>.<msg_ciphertext>
 *
 * Legacy Wire Format (v1):
 *   <msg_nonce>.<msg_ciphertext>  (supported transparently for backward compatibility)
 *
 * NEVER log or transmit the plaintext body or the private encryption keys.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';

// ── Base64URL encoding/decoding ───────────────────────────────────────────────

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_MAP: Record<string, number> = {};
for (let i = 0; i < B64URL.length; i++) {
  B64_MAP[B64URL[i]] = i;
}
B64_MAP['+'] = 62;
B64_MAP['/'] = 63;

export function bytesToBase64Url(bytes: Uint8Array): string {
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

export function base64UrlToBytes(str: string): Uint8Array {
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

// ── CSPRNG (Hardware-Backed Native Randomness) ────────────────────────────────

/**
 * Generates cryptographically secure random bytes using OS-level entropy pool
 * via expo-crypto (SecRandomCopyBytes on iOS / getrandom on Android).
 */
export function randomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  return Crypto.getRandomValues(buf);
}

// Bind TweetNaCl's internal PRNG to native hardware-backed randomness
nacl.setPRNG((x: Uint8Array, n: number) => {
  const bytes = Crypto.getRandomValues(new Uint8Array(n));
  for (let i = 0; i < n; i++) {
    x[i] = bytes[i];
  }
});

// Polyfill globalThis.crypto.getRandomValues if missing
if (typeof globalThis !== 'undefined' && !globalThis.crypto?.getRandomValues) {
  (globalThis as unknown as { crypto: unknown }).crypto = {
    getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
      if (!array) return array;
      const bytes = Crypto.getRandomValues(new Uint8Array(array.byteLength));
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(bytes);
      return array;
    },
  };
}

// ── User Device Key Management (SecureStore) ──────────────────────────────────

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

// ── Escrow Public Key Configuration ──────────────────────────────────────────

/**
 * Reads the public escrow key configured in EXPO_PUBLIC_ESCROW_PUBLIC_KEY.
 * The corresponding private key is held strictly as a Supabase Edge Function secret
 * (ESCROW_PRIVATE_KEY) and NEVER exists in the mobile application.
 */
function getEscrowPublicKey(): Uint8Array | null {
  const pubKeyStr = process.env.EXPO_PUBLIC_ESCROW_PUBLIC_KEY;
  if (!pubKeyStr) return null;

  try {
    const bytes = base64UrlToBytes(pubKeyStr);
    if (bytes.length === nacl.box.publicKeyLength) {
      return bytes;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Encrypt / Decrypt with Dual-Envelope Architecture ─────────────────────────

/**
 * Encrypts a message using a dual-envelope architecture:
 * 1. Generates a fresh random 256-bit Message Data Key (MDK).
 * 2. Encrypts the plaintext body with MDK using XSalsa20-Poly1305.
 * 3. User Envelope: MDK is encrypted with the user's device key (for local read/edit).
 * 4. Escrow Envelope: MDK is encrypted with the server's Escrow Public Key using
 *    an ephemeral-static Diffie-Hellman sealed box (for posthumous Stage 3 delivery).
 */
export async function encryptBody(
  plaintext: string,
  userId: string,
): Promise<string> {
  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a string.');
  }

  const userKey = await getOrCreateKey(userId);

  // 1. Generate single-use Message Data Key (MDK) and message nonce
  const mdk = randomBytes(nacl.secretbox.keyLength);
  const msgNonce = randomBytes(nacl.secretbox.nonceLength);
  const messageBytes = textEncoder.encode(plaintext);
  const msgCiphertext = nacl.secretbox(messageBytes, msgNonce, mdk);

  // 2. Build User Envelope: Encrypt MDK with User Device Key
  const userEnvNonce = randomBytes(nacl.secretbox.nonceLength);
  const userEnvBox = nacl.secretbox(mdk, userEnvNonce, userKey);
  const userEnvelope = `${bytesToBase64Url(userEnvNonce)}:${bytesToBase64Url(userEnvBox)}`;

  // 3. Build Escrow Envelope: Encrypt MDK with Escrow Public Key (if configured)
  let escrowEnvelope = 'none';
  const escrowPubKey = getEscrowPublicKey();

  if (escrowPubKey) {
    const ephKeyPair = nacl.box.keyPair();
    const escrowNonce = randomBytes(nacl.box.nonceLength);
    const escrowBox = nacl.box(mdk, escrowNonce, escrowPubKey, ephKeyPair.secretKey);
    escrowEnvelope = `${bytesToBase64Url(ephKeyPair.publicKey)}:${bytesToBase64Url(escrowNonce)}:${bytesToBase64Url(escrowBox)}`;
  }

  // Wire format: v2.<user_envelope>.<escrow_envelope>.<msg_nonce>.<msg_ciphertext>
  return [
    'v2',
    userEnvelope,
    escrowEnvelope,
    bytesToBase64Url(msgNonce),
    bytesToBase64Url(msgCiphertext),
  ].join('.');
}

/**
 * Decrypts a message body on the user's device using their hardware-stored device key.
 * Transparently supports both v2 (dual-envelope) and v1 (legacy direct secretbox).
 */
export async function decryptBody(
  ciphertext: string,
  userId: string,
): Promise<string> {
  if (typeof ciphertext !== 'string') {
    throw new Error('Ciphertext must be a string.');
  }

  const parts = ciphertext.split('.');

  // ── v2 format: v2.<user_env>.<escrow_env>.<msg_nonce>.<msg_ciphertext> ───────
  if (parts[0] === 'v2' && parts.length === 5) {
    const userEnvParts = parts[1].split(':');
    if (userEnvParts.length !== 2) {
      throw new Error('Malformed user envelope in ciphertext.');
    }

    const userEnvNonce = base64UrlToBytes(userEnvParts[0]);
    const userEnvBox = base64UrlToBytes(userEnvParts[1]);
    const msgNonce = base64UrlToBytes(parts[3]);
    const msgBox = base64UrlToBytes(parts[4]);

    const userKey = await getOrCreateKey(userId);
    const mdk = nacl.secretbox.open(userEnvBox, userEnvNonce, userKey);

    if (!mdk) {
      throw new Error('Failed to unseal message envelope with user device key.');
    }

    const plainBytes = nacl.secretbox.open(msgBox, msgNonce, mdk);
    if (!plainBytes) {
      throw new Error('Message body decryption failed.');
    }

    return textDecoder.decode(plainBytes);
  }

  // ── Legacy v1 format: <msg_nonce>.<msg_ciphertext> ──────────────────────────
  if (parts.length === 2) {
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

  throw new Error('Unrecognized ciphertext format.');
}

/**
 * Backend Escalation Function helper:
 * Decrypts a v2 ciphertext using the server-side Escrow Secret Key.
 * Used exclusively by the Stage 3 Escalation Edge Function during posthumous delivery.
 */
export function decryptEscrowBody(
  ciphertext: string,
  escrowSecretKey: Uint8Array,
): string {
  const parts = ciphertext.split('.');
  if (parts[0] !== 'v2' || parts.length !== 5) {
    throw new Error('Only v2 dual-envelope messages can be decrypted via escrow.');
  }

  const escrowEnvStr = parts[2];
  if (escrowEnvStr === 'none') {
    throw new Error('This message was encrypted without an escrow envelope.');
  }

  const escrowParts = escrowEnvStr.split(':');
  if (escrowParts.length !== 3) {
    throw new Error('Malformed escrow envelope.');
  }

  const ephPublicKey = base64UrlToBytes(escrowParts[0]);
  const escrowNonce = base64UrlToBytes(escrowParts[1]);
  const escrowBox = base64UrlToBytes(escrowParts[2]);
  const msgNonce = base64UrlToBytes(parts[3]);
  const msgBox = base64UrlToBytes(parts[4]);

  // Unseal MDK using ephemeral public key and escrow secret key
  const mdk = nacl.box.open(escrowBox, escrowNonce, ephPublicKey, escrowSecretKey);
  if (!mdk) {
    throw new Error('Failed to unseal MDK with escrow private key.');
  }

  // Decrypt message body with recovered MDK
  const plainBytes = nacl.secretbox.open(msgBox, msgNonce, mdk);
  if (!plainBytes) {
    throw new Error('Escrow message decryption failed.');
  }

  return textDecoder.decode(plainBytes);
}

/**
 * Evaluates whether a body string is in a recognized encrypted format (v2 or v1).
 */
export function isEncrypted(body: string): boolean {
  if (typeof body !== 'string') {
    return false;
  }

  const parts = body.split('.');

  // v2 check
  if (parts[0] === 'v2' && parts.length === 5) {
    return true;
  }

  // v1 legacy check
  if (parts.length === 2) {
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

  return false;
}