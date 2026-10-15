# Phase 2 — Functional Wiring Knowledge Base

> **Purpose:** Reference document for implementing all functional wiring for the Caregiver Role system.  
> All UI is done. Phase 2 is purely about Service → Hook → Screen.

---

## 1. What Exists Today (Baseline)

### Feature Layer — What Already Works

| Feature | Service file | Hooks file | What it does |
|---|---|---|---|
| `auth` | `auth.service.ts` | `auth.hooks.ts` | signUp, signIn, signOut, useProfile, useSignOut |
| `checkin` | `checkin.service.ts` | `checkin.hooks.ts` | recordCheckIn, fetchLatestCheckIn, useLatestCheckIn, useRecordCheckIn |
| `contacts` | `caregivers.service.ts` | `caregivers.hooks.ts` | saveCaregiver, getCaregivers, useCaregivers, useSaveCaregiver |
| `messages` | `messages.service.ts` | `messages.hooks.ts` | createMessage (encrypted), useMessages, useCreateMessage |
| `settings` | `settings.service.ts` | `settings.hooks.ts` | profile update helpers |

### Database — What Already Exists
```
profiles        → id, name, check_in_frequency_days, reminder_time, grace_period_hours
caregivers      → id, user_id, name, email, phone, relationship, status,
                  invite_token, caregiver_user_id (NEW), accepted_at (NEW)
check_ins       → id, user_id, checked_in_at
messages        → id, user_id, recipient_name, recipient_email, body (encrypted), ...
push_tokens     → id, user_id, token, platform (NEW TABLE)
```

### Query Key Namespaces (MUST keep consistent)
```ts
checkInKeys.latest(userId)          // checkin feature
profileKeys.byUser(userId)          // auth feature
caregiverKeys.byUser(userId)        // contacts feature — monitored person's caregivers
messageKeys.byUser(userId)          // messages feature
```

---

## 2. What Phase 2 Needs to Add

### 2A. New service functions in `caregivers.service.ts`

#### `acceptCaregiverInvite(token, userId)`
Links a caregiver's account to a caregiver row using the invite_token.

```ts
// What it does:
// 1. Find the caregivers row WHERE invite_token = token AND status = 'pending'
// 2. UPDATE that row: caregiver_user_id = userId, accepted_at = now(), status = 'accepted'
// 3. Return the updated row

// RLS note: the caregiver_user_id column is being SET to the caller's uid.
// The "caregiver accepts invite" RLS policy allows UPDATE WHERE caregiver_user_id = auth.uid()
// BUT: the row starts with caregiver_user_id = NULL, so the policy won't match yet!
// SOLUTION: Add a new RLS policy "accept invite by token":
//   USING (status = 'pending') WITH CHECK (auth.uid() = caregiver_user_id)
// This allows the UPDATE when the row is still pending, but enforces that
// the caller is setting caregiver_user_id to their own uid.
```

> ⚠️ **CRITICAL:** The existing RLS policy `"caregiver accepts invite"` checks `auth.uid() = caregiver_user_id`. But when a new caregiver redeems a token, `caregiver_user_id` is still NULL — so the policy won't match. We need **one additional RLS policy** added before this will work.

#### `getCaregiverWatch(userId)`
Gets all people this user is watching over (where user is the caregiver).

```ts
// SELECT * FROM caregivers
// WHERE caregiver_user_id = userId AND status = 'accepted'
// ORDER BY accepted_at ASC
//
// Then for each row, fetch the latest check-in for each user_id (the monitored person).
// Two round-trips but simple and correctly typed.
```

#### `registerPushToken(userId, token, platform)`
Upserts a push token for the user's device.

```ts
// INSERT INTO push_tokens (user_id, token, platform)
// ON CONFLICT (user_id, token) DO NOTHING
// (idempotent — safe to call every time the app launches)
```

#### `unregisterPushToken(userId, token)`
Removes a push token on sign-out.

```ts
// DELETE FROM push_tokens WHERE user_id = $1 AND token = $2
```

---

### 2B. New hooks in `caregivers.hooks.ts`

#### New query keys (add to `caregiverKeys`)
```ts
export const caregiverKeys = {
  all:    ['caregivers'] as const,
  byUser: (userId: string) => [...caregiverKeys.all, userId] as const,
  watch:  (userId: string) => [...caregiverKeys.all, 'watch', userId] as const,
  // ↑ NEW: for the caregiver dashboard (rows WHERE caregiver_user_id = me)
};
```

#### `useCaregiverWatch(userId)`
```ts
// queryKey: caregiverKeys.watch(userId)
// queryFn:  getCaregiverWatch(userId)
// enabled:  !!userId
// staleTime: 2 * 60 * 1000  (2 min — check-in status changes frequently)
```

#### `useAcceptCaregiverInvite(userId)`
```ts
// mutationFn: (token: string) => acceptCaregiverInvite(token, userId)
// onSuccess:  invalidate caregiverKeys.watch(userId)
```

---

### 2C. New `notifications` feature

**New folder:** `src/features/notifications/`

Files:
- `notifications.service.ts` — `getOrRegisterPushToken`, `unregisterPushToken`
- `notifications.hooks.ts` — `useRegisterPushToken`
- `index.ts` — barrel export

> ⚠️ Push token retrieval does NOT work in Expo Go — only in a development build.  
> Wrap in `try/catch` and log a warning. Never crash the app.

> **Expo projectId:** Required for `getExpoPushTokenAsync`. Check `app.json` before writing this code.

---

### 2D. Screen wiring tasks

#### `(onboarding)/caregiver-join.tsx`
- Import `useLocalSearchParams` and read `userId` from params
- Import `useAcceptCaregiverInvite` hook
- Replace the `// TODO` with real mutation call
- Show loading state on "Link My Account" button
- On success: navigate to `/(tabs)/caregiver-home`

#### `(tabs)/caregiver-home.tsx`
- Replace `MOCK_WATCHED` with `useCaregiverWatch(userId)`
- Map DB rows to `WatchedPerson` shape (fetch latest check-in per person)
- Wire `AddInviteSheet` submit to `useAcceptCaregiverInvite`
- Show loading on "Link account" button

#### `(tabs)/_layout.tsx`
- Add `useCaregiverWatch(userId)` to derive `isCaregiver`
- Add `useCaregivers(userId)` to derive `isMember` (already exists as a hook)
- Hide tabs using `tabBarItemStyle: { display: 'none' }`:
  - Hide `index` (Home) if `!isMember`
  - Hide `caregiver-home` if `!isCaregiver`
  - Hide `messages` if `!isMember`

#### `src/app/_layout.tsx`
- After session confirmed, call `useRegisterPushToken`
- Wrap in `useEffect` on `session` change

---

## 3. New Migration Needed First

Before writing any code, create and apply this migration:

**File:** `supabase/migrations/20261013000000_accept_invite_policy.sql`

```sql
-- Allows a caregiver to accept an invite when caregiver_user_id is still NULL.
-- Without this, the UPDATE fails (existing policy checks caregiver_user_id = auth.uid()
-- but the value is NULL until the acceptance completes — chicken-and-egg problem).
CREATE POLICY "accept invite by token"
  ON caregivers FOR UPDATE
  USING  (status = 'pending')
  WITH CHECK (auth.uid() = caregiver_user_id);
```

---

## 4. Implementation Order

| Step | Task | Files |
|---|---|---|
| 1 | Write + apply new migration | `supabase/migrations/...` |
| 2 | Add `acceptCaregiverInvite` service fn | `caregivers.service.ts` |
| 3 | Add `getCaregiverWatch` service fn | `caregivers.service.ts` |
| 4 | Add `useAcceptCaregiverInvite` hook | `caregivers.hooks.ts` |
| 5 | Add `useCaregiverWatch` hook + new key | `caregivers.hooks.ts` |
| 6 | Update barrel exports | `contacts/index.ts` |
| 7 | Create `notifications` feature (3 files) | `features/notifications/` |
| 8 | Wire `caregiver-join.tsx` | `(onboarding)/caregiver-join.tsx` |
| 9 | Wire `caregiver-home.tsx` | `(tabs)/caregiver-home.tsx` |
| 10 | Conditional tabs | `(tabs)/_layout.tsx` |
| 11 | Push token registration in root | `_layout.tsx` |

---

## 5. RLS Behaviour Map

| Operation | Caller | Policy that allows it |
|---|---|---|
| `getCaregivers(userId)` | Monitored person | `"own caregivers"` → `user_id = auth.uid()` |
| `getCaregiverWatch(userId)` | Caregiver | `"caregiver reads own link"` → `caregiver_user_id = auth.uid()` |
| `acceptCaregiverInvite(token)` | Caregiver | `"accept invite by token"` → `status = 'pending'` (**NEW**) |
| `registerPushToken` | Any signed-in user | `"own push tokens insert"` → `user_id = auth.uid()` |
| Read push_tokens for dispatch | Edge Function | Service role key — bypasses RLS |

---

## 6. Key Gotchas

1. **`caregiver_user_id` is NULL until accepted.** Always null-check before using it.

2. **The RLS policy gap.** Without the new migration (Step 1), `acceptCaregiverInvite` will fail with a 403. Apply migration **before** writing service code.

3. **Tab bar — don't block render.** Render the default 4 tabs immediately and update reactively when role queries resolve. Never await these queries before showing tabs.

4. **Push tokens in Expo Go.** `expo-notifications` push token retrieval does NOT work in Expo Go. Wrap in `try/catch`. Don't crash the app.

5. **`caregiverKeys.watch` vs `caregiverKeys.byUser`.** Two completely different query keys — cache collision will cause bugs:
   - `byUser(userId)` → caregivers the monitored person added
   - `watch(userId)` → people the caregiver is watching

6. **Invite token is single-use.** After acceptance, `status = 'accepted'` — the `"accept invite by token"` policy (USING `status = 'pending'`) will block any re-use of the same token. This is intentional security behaviour.
