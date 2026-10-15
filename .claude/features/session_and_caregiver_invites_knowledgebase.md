# Session Persistence & Caregiver Invite Email Knowledge Base

> **Date:** October 15, 2026  
> **Topic:** 30-Day Session Management, Auto-Login Routing, Caregiver Invitation Delivery via Supabase Edge Functions & Resend.

---

## 1. 30-Day Session Persistence & Auto-Login System

### Problem
Previously, returning users were required to re-enter their credentials every time they reopened the app.
- Expo Router defaulted to `src/app/index.tsx` (the Welcome screen) upon cold launch.
- `src/app/_layout.tsx` only redirected signed-out users trying to reach `(tabs)`, but never redirected authenticated users from `index.tsx` or `(auth)` to `(tabs)`.
- No session age tracking existed to enforce the product requirement of a 30-day (1-month) maximum session lifecycle.

### Architecture & Implementation

#### A. Session Lifecycle Service (`src/features/auth/session.service.ts`)
- **Storage:** Uses `expo-secure-store` (iOS Keychain / Android Keystore) to store `deadme_session_created_at`.
- **Policy:** 30 days (`30 * 24 * 60 * 60 * 1000` ms = 2,592,000,000 ms).
- **Core Functions:**
  - `recordSessionStart(timestamp)`: Writes the current timestamp when a user signs in with password or completes OTP verification.
  - `getSessionStartTime()`: Reads the stored timestamp from SecureStore.
  - `isSessionExpired(maxDurationMs)`: Compares elapsed time against 30 days. If a legacy session exists without a timestamp, it initializes it rather than logging the user out.
  - `clearSessionMetadata()`: Deletes the timestamp upon logout or session expiry.

#### B. Auth Lifecycle Integration (`src/features/auth/auth.service.ts` & `AuthContext.tsx`)
- **Stamping:** `signIn()` and `verifyOtp()` call `await recordSessionStart()` upon establishing a session.
- **Cleanup:** `signOut()` calls `await clearSessionMetadata()` before `supabase.auth.signOut()`.
- **Hydration Check:** On app mount, `AuthContext` hydrates the session from SecureStore and checks `isSessionExpired()`. If expired, it triggers `signOut()` automatically.
- **Foreground Resumption (`AppState`):** An `AppState` event listener checks `isSessionExpired()` whenever the app returns to the foreground (`active`), terminating sessions that expired while suspended in the background.
- **Token Refresh Guard:** In `onAuthStateChange`, `TOKEN_REFRESHED` events verify that the overall session has not exceeded the 30-day window.

#### C. Flicker-Free Native Splash Routing (`src/app/_layout.tsx`)
- `SplashScreen.preventAutoHideAsync()` prevents the native splash screen from hiding while `isLoading` is true.
- When session validation finishes:
  - If a valid session exists (< 30 days) and the current route is Welcome (`index`) or in `(auth)`: automatically calls `router.replace('/(tabs)')`.
  - If signed out or expired and in protected routes: calls `router.replace('/(auth)/')`.
- Calls `SplashScreen.hideAsync()` once the routing decision is applied, preventing any visual flashing of the Welcome screen for returning users.

---

## 2. Caregiver Invite Email System (Edge Function & Resend)

### Problem
Monitored persons add caregivers via `(tabs)/contacts.tsx` or onboarding `caregiver.tsx`. While the database generated an `invite_token` (UUID), no email was sent to the caregiver. Supabase Auth built-in SMTP only sends Auth OTPs, not custom table notifications.

### Architecture

```
Mobile App (caregivers.service.ts)
   │
   ├─ 1. Inserts row into `caregivers` table (status: 'pending')
   │
   └─ 2. Calls Supabase Edge Function `send-caregiver-invite`
           │
           ├─ Validates caller JWT via auth.getUser() (never trusts request body userId)
           ├─ Queries row with double-bound check: id = caregiverId AND user_id = verifiedUserId
           ├─ Checks eligibility: status === 'pending'
           ├─ Checks rate limit: 60s cooldown via last_invite_sent_at
           ├─ Rotates invite_token (crypto.randomUUID()) & sets 72h expiry (invite_expires_at)
           ├─ HTML-escapes all user input (XSS prevention)
           ├─ Calls Resend API (https://api.resend.com/emails)
           │
           ▼
Caregiver Inbox (PearTap <norely@qrmint.online>)
```

### Security & Reliability Safeguards

1. **Never Trust `caregiverId` Alone:**
   - Always derive the user identity from the verified JWT: `const { data: { user } } = await userClient.auth.getUser()`.
   - Double-bind the query: `.eq('id', caregiverId).eq('user_id', verifiedUserId)`.
2. **Token Protection & 72-Hour Expiration:**
   - Stored in `invite_expires_at` (default `now() + interval '72 hours'`).
   - Single-use: `accept_caregiver_invite` RPC atomically requires `status = 'pending'` and `invite_expires_at > now()`, then sets `status = 'accepted'`.
   - Token rotation on resend: Every resend generates a new `crypto.randomUUID()`, immediately invalidating any prior tokens.
   - Tokens are **never** logged to logs, analytics, or error outputs.
3. **Rate Limiting:**
   - Minimum 60-second cooldown enforced between email dispatches per caregiver (`last_invite_sent_at`).
   - Returns HTTP 429 with `Retry-After` header if called during cooldown.
4. **XSS Prevention in Emails:**
   - All user-supplied strings (`senderName`, `caregiverName`, `relationship`) pass through `escapeHtml()` before insertion into HTML templates.
5. **Resend Domain Configuration:**
   - **Critical Finding:** Resend's free testing sender (`onboarding@resend.dev`) strictly blocks sending to any email except the Resend account owner's email (returns HTTP 403).
   - **Fix:** Configured verified domain email `PearTap <norely@qrmint.online>` via `RESEND_FROM_EMAIL`.

---

## 3. Database Schema Updates

### Migration: `20261015100000_caregiver_invite_expiry_and_rate_limit.sql`
```sql
ALTER TABLE public.caregivers
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz DEFAULT (now() + interval '72 hours'),
  ADD COLUMN IF NOT EXISTS last_invite_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.accept_caregiver_invite(token_input text, caregiver_id uuid)
RETURNS public.caregivers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated public.caregivers;
  v_uid uuid := coalesce(auth.uid(), caregiver_id);
  v_existing public.caregivers;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  SELECT * INTO v_existing
  FROM public.caregivers
  WHERE invite_token = token_input::uuid;

  IF v_existing.id IS NULL THEN
    RAISE EXCEPTION 'Invite code not found.';
  END IF;

  IF v_existing.status = 'accepted' THEN
    RAISE EXCEPTION 'This invitation has already been accepted.';
  END IF;

  IF v_existing.invite_expires_at IS NOT NULL AND v_existing.invite_expires_at <= now() THEN
    RAISE EXCEPTION 'This invitation has expired. Please ask the person who invited you to resend the invite.';
  END IF;

  UPDATE public.caregivers
  SET
    caregiver_user_id = v_uid,
    accepted_at       = now(),
    status            = 'accepted'
  WHERE invite_token = token_input::uuid
    AND status       = 'pending'
    AND (invite_expires_at IS NULL OR invite_expires_at > now())
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;
```

---

## 4. Key Files Reference

| File | Purpose |
|---|---|
| `src/features/auth/session.service.ts` | 30-day session tracking in SecureStore (`recordSessionStart`, `isSessionExpired`, `clearSessionMetadata`) |
| `src/features/auth/auth.service.ts` | Stamps session start on sign-in/OTP and clears metadata on sign-out |
| `src/features/auth/AuthContext.tsx` | Hydration age validation, background resume checks via `AppState`, token refresh guards |
| `src/app/_layout.tsx` | Splash screen lock and auto-redirect from Welcome to `(tabs)` for authenticated users |
| `supabase/functions/send-caregiver-invite/index.ts` | Edge Function dispatching invite emails via Resend with rate limiting & JWT verification |
| `supabase/functions/deno.json` | Deno configuration and import maps for Edge Runtime |
| `src/features/contacts/caregivers.service.ts` | `saveCaregiver()` triggers email; `sendCaregiverInvite()` unwraps `error.context.json()` |
| `src/features/contacts/caregivers.hooks.ts` | `useResendCaregiverInvite()` mutation hook |
| `src/app/(tabs)/contacts.tsx` | Wired **"Resend invite"** button with loading spinner, cooldown alerts, and status feedback |
| `supabase/migrations/20261015100000_caregiver_invite_expiry_and_rate_limit.sql` | 72h expiry, rate-limit timestamp, and RPC validation |

---

## 5. Supabase Secrets Reference

Check secrets anytime via:
```bash
npx supabase secrets list
```

Required active secrets:
- `RESEND_API_KEY`: API key from Resend (`re_...`)
- `RESEND_FROM_EMAIL`: `PearTap <hello@noreply.qrmint.online>` (must use verified domain `qrmint.online`)

To redeploy the Edge Function anytime:
```bash
npx supabase functions deploy send-caregiver-invite
```
