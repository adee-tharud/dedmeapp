# Escalation & Notification System — Knowledge Base

> **Purpose:** Reference for all escalation, notification, welfare-check, and message delivery logic.  
> Status: ✅ All 6 gaps implemented + Stage 3 Caregiver Welfare Check Confirmation Gate active (October 2026).

---

## Architecture & Implementation Status

| Piece | Location | Status | Notes |
|---|---|---|---|
| Monitored person taps check-in button | `src/app/(tabs)/index.tsx` → `recordCheckIn()` | ✅ Active | Check-in saved to `check_ins` (idempotent, 1/day) |
| Server-side cron job (`pg_cron`) | `supabase/migrations/20261016000000_add_pg_cron_job.sql` | ✅ Active | Runs every 15 min; calls Edge Function with service-role token |
| Missed check-in detector & state machine | `supabase/functions/check-missed-checkins/index.ts` | ✅ Active | Evaluates overdue users, checks grace periods, advances stages |
| Stage 1 & 2 pushes to monitored person | `supabase/functions/check-missed-checkins/index.ts` | ✅ Active | Expo Push API dispatch to registered push tokens |
| Stage 3 Caregiver Welfare Check Gate | `supabase/migrations/20261016100000_caregiver_confirmations.sql` | ✅ Active | Pushes caregivers, creates confirmation rows with 36h auto-timeout |
| Welfare Check screen & actions | `src/app/welfare-check/[userId].tsx` | ✅ Active | Caregiver decides "They're okay" (blocks delivery) or "They need help" (delivers immediately) |
| Escrow Decryption & Message Delivery | `check-missed-checkins` + Resend API | ✅ Active | Unseals Envelope B via `ESCROW_PRIVATE_KEY` to recover MDK & send decrypted email |

---

## ❌ Gap 1 — Server-side Cron Job (Missed Check-in Detection)

### Why it can't live in the app
The app only runs when open. A missed check-in must be detected server-side.

### What to build
- **Supabase Edge Function:** `supabase/functions/check-missed-checkins/index.ts`
  - Invoked by `pg_cron` on a schedule (e.g. every 15 minutes)
  - Uses **service role key** (set as Supabase secret) — bypasses RLS to read all users
  - Query pattern:
    ```sql
    SELECT p.id AS user_id, p.check_in_frequency_days, p.grace_period_hours,
           p.reminder_time, c.checked_in_at AS last_check_in
    FROM profiles p
    LEFT JOIN LATERAL (
      SELECT checked_in_at FROM check_ins
      WHERE user_id = p.id
      ORDER BY checked_in_at DESC LIMIT 1
    ) c ON true
    WHERE p.check_in_frequency_days IS NOT NULL
      AND (c.checked_in_at IS NULL
           OR c.checked_in_at < now() - (p.check_in_frequency_days || ' days')::interval)
    ```
  - For each overdue user, determine escalation stage and call sub-routines.

- **pg_cron job** (add to a new migration):
  ```sql
  select cron.schedule(
    'check-missed-checkins',
    '*/15 * * * *',        -- every 15 minutes
    $$
      select net.http_post(
        url     := 'https://<project-ref>.supabase.co/functions/v1/check-missed-checkins',
        headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
      );
    $$
  );
  ```
  > ⚠️ Store the service role key as a Supabase secret (`supabase secrets set`), never hardcode.

### Key fields used
- `profiles.check_in_frequency_days` — how often the user must check in
- `profiles.grace_period_hours` — grace window before escalation advances
- `profiles.reminder_time` — preferred time-of-day for reminders (optional, for Stage 1 timing)

---

## ❌ Gap 2 — Reminder Push to Monitored Person (Stage 1)

### What it is
"You haven't checked in yet — tap to check in."  
Sent to the **monitored person** after they miss their check-in deadline.

### How to build
The cron Edge Function (Gap 1) determines Stage 1 is due → calls a `sendPushNotification` helper:

```ts
// Inside the Edge Function
async function sendExpoPush(token: string, title: string, body: string) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body, sound: 'default' }),
  });
}

// Stage 1 call
const tokens = await getPushTokensForUser(supabase, userId);
for (const token of tokens) {
  await sendExpoPush(token, 'Are you okay?', 'You haven\'t checked in yet. Tap to check in.');
}
```

### Helper — `getPushTokensForUser`
```ts
async function getPushTokensForUser(supabase, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId);
  return (data ?? []).map(r => r.token);
}
```

> ⚠️ `notifications.service.ts` only handles **registering** tokens. No send logic exists yet.  
> Push sending lives entirely in the server-side Edge Function — never in the client app.

---

## ❌ Gap 3 — Escalation Logic (Stage 1 → 2 → 3)

### Intended flow (from ARCHITECTURE.md)
```
Missed check-in deadline
  │
  ├─ Stage 1: Push → monitored person ("Are you okay? Tap to check in")
  │    └─ Wait: grace_period_hours from profiles
  │
  ├─ Stage 2: Second push → monitored person + optional SMS
  │
  └─ Stage 3: Alert → caregivers (push + email) + deliver messages
               Log to escalation_events
```

### State tracking in `escalation_events`
The table already exists with columns: `id`, `user_id`, `stage`, `created_at`.

The cron function should:
1. For each overdue user, query the **latest** `escalation_events` row.
2. Determine which stage has already fired.
3. Fire the next stage if enough time has passed (`grace_period_hours`).
4. Insert a new row into `escalation_events` after each stage fires.

```ts
// INSERT to log a stage firing (service role — bypasses RLS)
await supabase.from('escalation_events').insert({
  user_id: userId,
  stage:   'stage_1',   // 'stage_1' | 'stage_2' | 'stage_3'
});
```

### Stage determination logic
```ts
const latestEvent = await getLatestEscalationEvent(supabase, userId);

if (!latestEvent) {
  // No escalation yet → fire Stage 1
  await fireStage1(userId);
} else if (latestEvent.stage === 'stage_1') {
  const hoursSince = hoursDiff(latestEvent.created_at, new Date());
  if (hoursSince >= profile.grace_period_hours) {
    await fireStage2(userId);
  }
} else if (latestEvent.stage === 'stage_2') {
  const hoursSince = hoursDiff(latestEvent.created_at, new Date());
  if (hoursSince >= profile.grace_period_hours) {
    await fireStage3(userId);
  }
}
// stage_3 is terminal — no further escalation
```

### RLS Note
The cron Edge Function uses the **service role key** and can write to `escalation_events` without RLS restrictions. The `"own escalation log"` policy (SELECT only for the authenticated user) does not affect server-side inserts.

---

## ❌ Gap 4 — Caregiver Alert Push Notification (Stage 3)

## ✅ Gap 4 — Caregiver Welfare Check Confirmation Gate (Stage 3)

### What it is
When Stage 3 fires:
1. Pushes all accepted caregivers with a deep-link: `peartap://welfare-check/<userId>`.
2. Creates rows in `caregiver_confirmations` (`status: 'pending'`, `deadline_at: now + 36h`).
3. Messages are **NOT** sent immediately. Caregivers have a 36-hour confirmation gate to reach the monitored person.

### Caregiver Decision Logic (`processStage3Pending`)
Each subsequent cron tick checks `caregiver_confirmations` for the overdue user:
- **"They're okay" (`person_okay`)**: Caregiver verified the person is safe.
  - Escalation event marked `stage_3_resolved`.
  - **No emergency messages are delivered.**
- **"They need help" (`person_not_okay`)**: Caregiver verified the person needs urgent help.
  - Emergency messages delivered immediately via Resend.
  - Escalation event marked `stage_3_delivered`.
- **36-hour timeout**: If all caregivers remain `pending` and `now >= deadline_at`:
  - System automatically delivers emergency messages.
  - Escalation event marked `stage_3_delivered`.

### In-App Entry Point
In addition to the push notification deep-link, caregivers can tap any overdue card on `CaregiverHomeScreen` (`src/app/(tabs)/caregiver-home.tsx`) to open the welfare-check screen at `/welfare-check/[userId]`.

---

## ✅ Gap 5 — Dual-Envelope Escrow Message Decryption & Delivery (Stage 3)

### How it works
1. Messages are encrypted using a dual-envelope scheme:
   - **Envelope A:** Sealed to the user's primary key (client-side access).
   - **Envelope B:** Sealed to the server's Escrow Public Key using `tweetnacl` box (`crypto_box_seal`).
2. When delivery is triggered (caregiver confirms "need help" or 36h timeout expires):
   - The Edge Function unseals Envelope B using `ESCROW_PRIVATE_KEY` (Supabase secret).
   - Recovers the ephemeral Message Data Key (MDK).
   - Decrypts the message body with `secretbox_open` into plaintext.
   - Dispatches a beautifully formatted email via Resend containing the sender's actual words.
3. If `ESCROW_PRIVATE_KEY` is absent or the message is an older v1 envelope:
   - Gracefully falls back to a secure "open PearTap" notification email so delivery is never dropped.

---

## ❌ Gap 6 — Escalation Edge Function (the main entry point)

### File to create
`supabase/functions/check-missed-checkins/index.ts`

### Responsibilities (orchestrates Gaps 1–5)
```
1. Authenticate the incoming request (service role token check)
2. Query all overdue users (profiles + last check_in)
3. For each overdue user:
   a. Load latest escalation_events row
   b. Determine next stage based on grace_period_hours
   c. Fire stage-appropriate action:
      - Stage 1: push → monitored person (Gap 2)
      - Stage 2: push → monitored person (again) + optional SMS
      - Stage 3: push → all caregivers (Gap 4) + deliver messages (Gap 5)
   d. Insert row into escalation_events (Gap 3)
4. Return JSON summary { processed: N, escalated: M }
```

### Reset on successful check-in
When a user checks in after escalation, the next escalation cycle should start fresh.  
The cron query (Gap 1) already handles this — if `last_check_in` is recent enough, the user is skipped.  
No need to delete `escalation_events` rows — the query just checks `check_ins`.

### Existing Edge Function to reference
`supabase/functions/send-caregiver-invite/index.ts` — use this as the structural template:
- How to read Supabase secrets (`Deno.env.get`)
- How to initialize Supabase client with service role key
- How to validate the incoming request
- How to call Resend for email

---

## Implementation Order

| Step | Task | File |
|---|---|---|
| 1 | Add `pg_cron` migration | `supabase/migrations/<timestamp>_add_pg_cron_job.sql` |
| 2 | Create escalation Edge Function skeleton | `supabase/functions/check-missed-checkins/index.ts` |
| 3 | Implement overdue-user query | Inside Edge Function |
| 4 | Implement Stage 1 push (monitored person) | Inside Edge Function |
| 5 | Implement escalation state machine (Stage 1 → 2 → 3) using `escalation_events` | Inside Edge Function |
| 6 | Implement Stage 3 caregiver push | Inside Edge Function |
| 7 | Implement Stage 3 message delivery via Resend | Inside Edge Function |
| 8 | Deploy Edge Function (`supabase functions deploy check-missed-checkins`) | CLI |
| 9 | Set secrets (`supabase secrets set SERVICE_ROLE_KEY=... RESEND_API_KEY=...`) | CLI |

---

## Key Gotchas

1. **App can't do this.** The app is dead when the screen is off. Everything in this system must live server-side.

2. **Service role key is required.** The cron Edge Function must use the service role key to read all users' data (bypassing RLS). Never expose this key client-side.

3. **Push tokens RLS blocks the Edge Function if using anon key.** Always use service role key in server-side functions that read `push_tokens` for other users.

4. **`escalation_events` is append-only.** Never UPDATE or DELETE rows — it is an audit log. Always INSERT a new row for each stage event.

5. **Message body is encrypted.** The Edge Function receives ciphertext from the `messages` table. Decide on the delivery strategy (link to app vs. key escrow) before implementing Step 7.

6. **Check-in resets escalation implicitly.** The overdue query in the cron function naturally excludes users who have recently checked in. No explicit reset logic is needed.

7. **Resend API key already exists** as a Supabase secret (used by `send-caregiver-invite`). Reuse it — don't create a new one.

8. **`grace_period_hours` can be null** if onboarding wasn't completed. Always null-check before using it in stage progression timing.
