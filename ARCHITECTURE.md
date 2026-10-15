# Architecture & Knowledge Base

A living document capturing key design decisions, what's built, what's pending, and important findings about this codebase. Update this as the project evolves.

---

## Role System

### How roles work (no role column — roles are derived)

There is **no `role` field** anywhere in the database. Roles emerge naturally from which rows exist for a given `auth.uid()`:

| Condition | Role |
|---|---|
| Has a filled-out `profiles` row (with `check_in_frequency_days` set) | Monitored person |
| Has rows in `caregivers` where `caregiver_user_id = auth.uid()` and `status = 'accepted'` | Caregiver |

This logic is derived reactively in `src/app/(tabs)/_layout.tsx`:

```ts
const isCaregiver = hasWatched;          // watching ≥ 1 person
const isMember    = hasCaregivers || !hasWatched;  // has caregivers OR is not exclusively a caregiver
```

Tabs are shown/hidden based on these two booleans. **No routing logic needs to know about roles explicitly.**

### The `handle_new_user` trigger

Every new `auth.users` row gets a `profiles` row automatically via a `SECURITY DEFINER` trigger. This means **caregivers also get a `profiles` row** with null values for `check_in_frequency_days`, `reminder_time`, `grace_period_hours`. This is harmless — no check-in or notification logic runs without those values being set during onboarding.

---

## Dual-Role Decision (Shelved)

### The scenario
A caregiver wanting to also be a monitored person (or vice versa) was discussed and **intentionally shelved** to avoid UX complexity around notifications, check-in state, and settings.

### Why the schema already supports it (but the app doesn't expose it)
- The schema is role-agnostic. Nothing prevents one `auth.uid()` from having both a `profiles` row AND rows in `caregivers` as `caregiver_user_id`.
- The tabs layout would automatically show both tabs if both conditions were true.
- **The only missing piece** would be a UI entry point for a signed-in user to redeem a caregiver invite token (currently only accessible during onboarding).

### Decision
Do not implement this now. The codebase needs **zero cleanup** as a result of this decision — nothing is broken or contradictory.

---

## Caregiver Invite Flow

### Full token acceptance chain

1. Monitored person (Alice) adds Bob's email in **Contacts** screen → `saveCaregiver()` inserts a row in `caregivers` with `status = 'pending'`, generates a 72-hour `invite_token`, and calls the `send-caregiver-invite` Edge Function.
2. The `send-caregiver-invite` Edge Function validates Alice's JWT, verifies row ownership, checks rate limits (60s cooldown), and dispatches the invite email via Resend.
3. Bob receives the email with the token.
4. Bob signs up or signs in → navigates to **caregiver-join screen** → enters token → `acceptCaregiverInvite()` is called.
5. The `accept_caregiver_invite` **RPC (SECURITY DEFINER)** function verifies the token is valid, unexpired (< 72h), and still pending.
6. The row is updated: `caregiver_user_id = auth.uid()`, `status = 'accepted'`, `accepted_at = now()`.
7. On success, the **"Watching" tab** appears automatically (derived from `useCaregiverWatch`).

### Security layers on token redemption & invite dispatch
- **Authenticated Identity Check**: Edge Function validates caller's JWT; never trusts client-supplied user IDs.
- **Double-Bound Row Ownership**: Edge Function queries caregiver rows with both `caregiverId` AND verified `user_id`.
- **Token is unguessable**: UUID generated server-side (`uuid_generate_v4()` or `crypto.randomUUID()`), 2¹²² possible values.
- **72-Hour Expiration**: Inactive tokens expire after 72 hours (`invite_expires_at`).
- **Token Rotation on Resend**: Resending an invite generates a fresh token, immediately invalidating any prior tokens.
- **Rate-Limiting**: Minimum 60-second cooldown between email dispatches per caregiver (`last_invite_sent_at`).
- **Single-Use**: Once `status = 'accepted'`, the token is permanently invalidated.
- **RLS & RPC Safeguards**: RPC enforces `status = 'pending'` and expiration check atomically before updating.
- **No Token Logging**: Invite tokens are never logged in application logs or error reporting.

---

## Escalation & Notification System — Current Status

### ✅ What IS implemented

| Piece | Location |
|---|---|
| Monitored person taps check-in button | `src/app/(tabs)/index.tsx` → `recordCheckIn()` |
| Check-in saved to `check_ins` table (idempotent — one per day) | `src/features/checkin/checkin.service.ts` |
| UI countdown to next check-in due | `nextCheckInDue()` in checkin.service.ts |
| Push token registered and saved to `push_tokens` | `src/features/notifications/notifications.service.ts` |
| Caregiver sees last check-in timestamp on their dashboard | `src/app/(tabs)/caregiver-home.tsx` |
| `escalation_events` table exists | `DB.md` |
| `messages` table exists | `DB.md` |

### ❌ What is NOT implemented (must be built)

| Missing piece | Notes |
|---|---|
| **Server-side cron / background job** to detect missed check-ins | Needs a Supabase Edge Function + `pg_cron`. The app cannot do this — it only runs when open. |
| **Reminder push to monitored person** | "You haven't checked in yet" — Stage 1 of escalation |
| **Escalation logic** (Stage 1 → 2 → 3) | `escalation_events` table exists but nothing writes to it |
| **Caregiver alert push notification** | Nothing sends to `push_tokens` of the caregiver |
| **Message delivery** to caregivers/contacts | `messages` table exists, no send logic triggers |
| **Supabase Edge Function for escalation** | Not yet built (`supabase/functions/send-caregiver-invite` exists for invites) |

### Intended escalation flow (to be built)
```
Missed check-in deadline
  │
  ├─ Stage 1: Push notification → monitored person ("Are you okay? Tap to check in")
  │    └─ Grace period (grace_period_hours from profiles)
  │
  ├─ Stage 2: Second push → monitored person + optional SMS
  │
  └─ Stage 3: Alert → caregivers (push + email) + deliver messages
               Log to escalation_events
```

---

## Authentication, 30-Day Sessions & OTP Verification Flow

### 30-Day Session Persistence & Auto-Login
- Sessions are persisted via `expo-secure-store` using `deadme_session_created_at`.
- Max session lifetime is 30 days (`30 * 24 * 60 * 60 * 1000` ms).
- On app launch, `src/app/_layout.tsx` locks the native splash screen with `expo-splash-screen` while hydrating auth.
- If a valid session exists (< 30 days old), returning users are auto-redirected to `/(tabs)` without re-entering credentials.
- `AppState` listener re-evaluates session age when resuming from background; expired sessions (> 30 days) automatically sign out.
- Explicit sign-out clears the SecureStore timestamp, Supabase session, and React Query cache.

### New User Sign-Up
1. User enters name, email, and password on `src/app/(auth)/index.tsx`.
2. `signUp()` creates user in Supabase without deep-link redirects; Supabase dispatches a 6-digit OTP code to the email.
3. User is navigated to `src/app/(auth)/verify-otp.tsx`.
4. User enters 6-digit OTP (or pastes it).
5. `verifyOtp({ email, token, type: 'signup' })` verifies code with Supabase and establishes an active authenticated session.
6. User enters onboarding `/(onboarding)/role-select` with an active session.

### Existing User Sign-In
- Standard password sign-in via `signInWithPassword()` on `src/app/(auth)/sign-in.tsx` returns a session directly. No OTP step is required.

---

## Key Files Reference

| File | Purpose |
|---|---|
| `src/app/(auth)/verify-otp.tsx` | 6-digit OTP entry screen with auto-advance, paste, resend countdown, and shake animation |
| `src/app/(auth)/index.tsx` | Sign-up screen (name, email, password) |
| `src/app/(auth)/sign-in.tsx` | Sign-in screen (email, password) |
| `src/features/auth/auth.service.ts` | All Supabase Auth operations (`signUp`, `signIn`, `verifyOtp`, `resendOtp`) |
| `src/features/auth/session.service.ts` | 30-day session tracking in SecureStore (`recordSessionStart`, `isSessionExpired`, `clearSessionMetadata`) |
| `src/features/auth/AuthContext.tsx` | Single auth listener, session hydration, and `AppState` background resume expiry checks |
| `src/app/(tabs)/_layout.tsx` | Role derivation + tab visibility logic |
| `src/app/(tabs)/index.tsx` | Monitored person home / check-in button |
| `src/app/(tabs)/caregiver-home.tsx` | Caregiver dashboard (watched persons) |
| `src/app/(tabs)/contacts.tsx` | Monitored person's caregiver list + "Resend invite" button |
| `src/app/(onboarding)/role-select.tsx` | Post-verification role selection |
| `src/app/(onboarding)/caregiver-join.tsx` | Token redemption screen |
| `src/features/contacts/caregivers.service.ts` | All `caregivers` table queries, invite acceptance, and `sendCaregiverInvite()` |
| `src/features/contacts/caregivers.hooks.ts` | Caregiver queries, mutations, and `useResendCaregiverInvite()` |
| `src/features/checkin/checkin.service.ts` | Check-in insert + helpers |
| `src/features/notifications/notifications.service.ts` | Push token register/unregister |
| `supabase/functions/send-caregiver-invite/index.ts` | Edge Function dispatching invite emails via Resend with rate limiting & JWT verification |
| `supabase/migrations/20261013143000_accept_invite_rpc.sql` | SECURITY DEFINER RPC for token acceptance |
| `supabase/migrations/20261015100000_caregiver_invite_expiry_and_rate_limit.sql` | 72h invite token expiration, rate-limit timestamp, and RPC checks |
| `supabase/migrations/20261015110000_fix_caregiver_invite_security.sql` | Drops dangerous table-level UPDATE policy and hardens RPC auth checks |
| `DB.md` | Living schema reference (tables + RLS policies) |
| `Supabase_Security_and_Coding_Standards_Guide.md` | Project security standards |

---

## Important Patterns & Rules

### Data fetching
- **Never** call Supabase directly in JSX or component bodies.
- All Supabase calls live in `*.service.ts` files under `src/features/`.
- React Query hooks in `*.hooks.ts` files wrap the service calls.
- `user.id` is read **once** from `useAuth()` and passed as a parameter — never re-read inside queries.

### Security
- RLS is the last line of defence — always enforce at DB level, not just app level.
- `userId` passed into service functions must always come from the authenticated session, not from untrusted client state.
- Check-in is idempotent: one per day max, enforced in `recordCheckIn()`.

### Navigation
- Uses **Expo Router** (`src/app/` directory = file-based routes).
- Non-route code (components, hooks, services) lives in `src/` outside `src/app/`.
- Caregiver-only users are redirected from Home → `/(tabs)/caregiver-home` automatically.
