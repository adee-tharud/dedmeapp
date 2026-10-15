# Secret Messages — Security Architecture

## Threat Model

Messages are private final notes. A breach that exposes them is a broken promise to someone who may no longer be able to complain. We treat the message body with the same care as a password.

At the same time, because **Deadme is a dead-man's switch**, the system must guarantee that if the monitored individual passes away or is incapacitated, their intended recipients **can actually receive and read** the final notes they left behind.

---

## What We Protect Against

| Threat | Mitigation |
|---|---|
| Supabase database breach | Zero plaintext in DB: `messages.body` only ever contains encrypted ciphertext and envelopes. |
| RLS misconfiguration exposing rows | Encryption provides defence-in-depth: reading raw rows grants no plaintext access. |
| Another user calling the API with different `user_id` | RLS policies: `auth.uid() = user_id`. |
| Plaintext body in transit | Client-side encryption before HTTP dispatch + TLS/HTTPS. |
| Key extraction from JS bundle | User keys live exclusively in hardware-backed `expo-secure-store` (Keychain / Keystore). |
| Server-side message snooping in daily life | Escrow private key is restricted to the isolated Stage 3 Escalation Edge Function, which runs only after check-ins and grace periods have completely lapsed. |
| Weak or predictable random numbers | Hardware-backed native CSPRNG via `expo-crypto` (`SecRandomCopyBytes` / `getrandom`). |
| Logs leaking body or private keys | Bodies and private keys are strictly barred from console output, logs, or telemetry. |

---

## Dual-Envelope Encryption Architecture (v2)

To resolve the **Dead-Man's Switch Delivery Paradox** (where a local-only key prevents posthumous delivery), Deadme employs a **Dual-Envelope Envelope Encryption** scheme:

```
                            ┌────────────────────────┐
                            │  Message Body (Plain)  │
                            └───────────┬────────────┘
                                        │ Encrypted with Message Data Key (MDK)
                                        │ via XSalsa20-Poly1305 (secretbox)
                                        ▼
                            ┌────────────────────────┐
                            │   Message Ciphertext   │
                            └────────────────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
       [ User Device Envelope ]                      [ Escrow Delivery Envelope ]
    MDK encrypted with User Device Key            MDK sealed with Server Escrow Public Key
      (from expo-secure-store)                     (via Ephemeral-Static X25519 nacl.box)
                 │                                             │
                 └──────────────────────┬──────────────────────┘
                                        ▼
                         v2.<user_env>.<escrow_env>.<nonce>.<ciphertext>
                                        │
                                        ▼
                          Stored in `messages.body`
```

### 1. Message Data Key (MDK)
- Every message encrypt generates a fresh, cryptographically random 32-byte key ($K_m$) and 24-byte nonce using `expo-crypto`.
- The plaintext is encrypted using XSalsa20-Poly1305 (`nacl.secretbox`).

### 2. Envelope A: User Device Envelope (Local Read/Edit)
- $K_m$ is encrypted with the user's local 256-bit key ($K_{user}$) stored in `expo-secure-store`.
- Format: `<user_nonce>:<user_box>`
- Enables the user to view, edit, and manage their letters locally at any time without involving the server.

### 3. Envelope B: Escrow Delivery Envelope (Posthumous Delivery)
- $K_m$ is sealed using the Server Escrow Public Key ($PK_{escrow}$) via ephemeral Diffie-Hellman:
  - Generates an ephemeral X25519 keypair ($SK_{eph}, PK_{eph}$).
  - Encrypts $K_m$ using `nacl.box(K_m, nonce, PK_{escrow}, SK_{eph})`.
  - Format: `<PK_eph>:<escrow_nonce>:<escrow_box>`
- **The corresponding Escrow Private Key ($SK_{escrow}$):**
  - **NEVER** exists in the client app bundle or repository.
  - Stored strictly as a Supabase Edge Function secret (`ESCROW_PRIVATE_KEY`).
  - Read **only** by the background Escalation Edge Function when Stage 3 triggers (after all check-in deadlines and grace periods have expired).
  - The Edge Function unseals Envelope B, recovers $K_m$, decrypts the message body, and formats the delivery email to the recipient.

---

## Wire Format

Stored in `messages.body`:

```
v2.<user_envelope>.<escrow_envelope>.<msg_nonce>.<msg_ciphertext>
```

- `user_envelope`   = `base64url(nonce):base64url(box)`
- `escrow_envelope` = `base64url(eph_pubkey):base64url(nonce):base64url(box)` (or `none` if escrow is unconfigured)
- `msg_nonce`       = `base64url(nonce)`
- `msg_ciphertext`  = `base64url(ciphertext)`

### Backward Compatibility (v1)
Legacy messages created before v2 (`<nonce>.<ciphertext>`) are automatically detected and decrypted by `decryptBody()` using the user's device key.

---

## What is NOT Encrypted (Operational Metadata)

- `recipient_name`, `recipient_email`, `recipient_phone` — required server-side for delivery dispatch.
- `timing_type`, `status`, `created_at`, `updated_at` — operational scheduling metadata.
Protected strictly by Row-Level Security (`auth.uid() = user_id`).
