# Secret Messages — Security Architecture

## Threat Model

Messages are private final notes. A breach that exposes them is a broken promise 
to someone who may no longer be able to complain. We treat the message body with 
the same care as a password.

## What we protect against

| Threat | Mitigation |
|---|---|
| Supabase database breach | Client-side encryption: DB only stores ciphertext |
| RLS misconfiguration exposing rows | Encryption is a defence-in-depth layer |
| Another user calling the API with a different user_id | RLS policy: `auth.uid() = user_id` |
| Plaintext body in transit | HTTPS (Supabase default) |
| Key extracted from JS bundle | Key lives only in expo-secure-store (Keychain/Keystore), never in code |
| Logs leaking body | Never log message body anywhere |

## Encryption scheme

- **Algorithm**: XSalsa20-Poly1305 (NaCl `secretbox`) via `tweetnacl`
  - Authenticated encryption: confidentiality + integrity in one primitive
  - 256-bit key, 192-bit random nonce per message
  - Well-audited pure-JS, no native module required → works in Expo Go + dev builds
  
- **Key management**:
  - One 32-byte random key per user, generated on first login
  - Stored in `expo-secure-store` keyed by `msg_key_<userId>`
  - On iOS → device Keychain (hardware-backed on modern devices)
  - On Android → Android Keystore
  - Key NEVER leaves the device. Server only ever sees ciphertext.

- **Stored format** in `messages.body`:
  ```
  <base64(nonce)>.<base64(ciphertext)>
  ```
  Nonce is prepended so each encrypt call is unique and decryptable independently.

## What is NOT encrypted (by design)

- `recipient_name`, `recipient_email`, `recipient_phone` — needed server-side
  to actually deliver the message when the escalation engine fires. These are 
  protected by RLS only.
- `timing_type`, `status`, `created_at` — operational metadata.

## Key loss scenario

If a user deletes the app or loses their device, their encryption key is lost
and existing messages cannot be decrypted. This is the correct trade-off at MVP:
- Document this clearly in the UI before the user writes their first message
- Future: allow optional key backup via a user-held passphrase (PBKDF2/Argon2)

## Migration path to recipient-side E2E (post-MVP)

At MVP: symmetric key per user, held on device.
Later: generate a keypair per user; encrypt message body with recipient's public key
so only the recipient can decrypt on delivery. This requires recipient key exchange
during the invitation flow — documented here for future implementation.
