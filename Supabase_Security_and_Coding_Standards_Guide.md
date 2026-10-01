# Deadme

## Supabase Security & Coding Standards Guide

*Best practices, dos and don'ts, and server-side function handling*

Prepared for the Deadme React Native / Expo codebase
Repository: github.com/adee-tharud/dedmeapp
Version 1.0 · September 2026

---

## Contents

1. Why this document exists
2. Secrets and environment variables
3. Database design and Row Level Security
4. Authentication
5. Client-side coding style
6. Data-fetching patterns (React Query)
7. Validation with Zod
8. Edge Functions and server-side logic
9. The escalation engine — extra hardening
10. Push notifications
11. Logging, monitoring and error handling
12. Testing strategy
13. Dependency and repo hygiene
14. Pre-launch security checklist
15. Quick-reference Do / Don't table

---

## 1. Why this document exists

Deadme is not a typical app. It stores a person's private final messages, decides when to release them based on inactivity, and contacts real people (caregivers and recipients) on the user's behalf. A bug that leaks a message, releases it early, or never releases it at all is not a cosmetic bug — it is a broken promise to someone who may no longer be able to complain. This guide exists to keep that promise.

The current codebase (reviewed at commit `e2f05d3`) is a clean, well-organized UI skeleton: routing, theming and one Zustand store are done properly, but every write to Supabase is still a `// TODO` and no Row Level Security, validation, or server-side logic exists yet. This guide is written for exactly that starting point — it tells you how to build the missing 70% without weakening the 30% that's already solid.

> **How to use this document:** it is organized by concern, not by file. Read it once fully before writing the Supabase-facing code, then keep it open as a reference while you build each feature.

---

## 2. Secrets and environment variables

Almost every real-world Supabase incident traces back to a key ending up somewhere it shouldn't. Get this right first.

### Two keys, two trust levels

| Key | Where it lives | What it can do |
|---|---|---|
| `anon` / publishable key | Inside the mobile app bundle | Nothing on its own — every request it makes is still filtered by Row Level Security. Safe to ship. |
| `service_role` / secret key | Only inside Edge Functions / server code, set as a Supabase secret | Bypasses RLS completely. Full read/write to every row of every table. |

> **Do not ever** import, log, hardcode, or reference the `service_role` key from any file under `src/`. If it ends up in the Expo JS bundle, it ends up on every user's phone and can be extracted.

### Dos

- **Do** prefix client-exposed variables with `EXPO_PUBLIC_` (e.g. `EXPO_PUBLIC_SUPABASE_URL`) — this is Expo's explicit signal that a value is safe to bundle.
- **Do** store the `service_role` key only as a Supabase Edge Function secret (`supabase secrets set`), never in `.env`, never in `app.json`.
- **Do** commit a `.env.example` with empty placeholder values, so the required variables are documented without exposing real ones.
- **Do** add `.env`, `.env.local` to `.gitignore` (already partly there — verify `.env` itself, not just `.env*.local`, is covered).
- **Do** rotate keys immediately if one is ever accidentally committed, even if you delete the commit afterward — git history and forks can retain it.

### Don'ts

- **Don't** put API keys for email/SMS providers (Resend, Twilio) in client code. They belong in Edge Function secrets only.
- **Don't** reuse the same Supabase project for development and production. Use separate projects so a bug in dev can never touch real users' messages.
- **Don't** paste real keys into chat tools, tickets, or screenshots when asking for help.

---

## 3. Database design and Row Level Security

RLS is the single most important security control in this app, because the anon key alone grants no protection — policies are what stand between a user and everyone else's data.

### Non-negotiable rules

- **Do not** write a single line of app code against a table before RLS is enabled on it, with policies written and tested. An unprotected table for even one deploy cycle is enough for scraping.
- **Do** enable RLS on every table the moment it's created: `alter table x enable row level security;`
- **Do** default to deny. A table with RLS on and zero policies denies all access — that is the correct starting state, not a bug.
- **Do** scope every policy to `auth.uid()`, never to a value passed in from the client (e.g. never trust a `user_id` field the app sends in a request body for authorization decisions).
- **Do** give `escalation_events` a read-only policy for users (`for select` only). Only server-side code with the service key should ever insert into the audit log.
- **Don't** use `for all` policies where a narrower one fits. A user should never be able to delete their own `escalation_events`, for example — that log is what proves the system behaved correctly if something is ever disputed.

### Example: correct policy shape

```sql
alter table messages enable row level security;

create policy "select own messages"
  on messages for select
  using (auth.uid() = user_id);

create policy "insert own messages"
  on messages for insert
  with check (auth.uid() = user_id);

create policy "update own messages"
  on messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Deliberately no delete policy for 'sent' messages:
create policy "delete only drafts"
  on messages for delete
  using (auth.uid() = user_id and status = 'draft');
```

Note the last policy: it prevents a user (or a bug) from deleting a message after it has become `active`, closing a real gap — someone shouldn't be able to accidentally erase a message meant for a loved one.

### Schema-level dos and don'ts

- **Do** use `check` constraints for status/enum-like columns (`status in ('draft','active','sent')`) so bad data can't be written even if application code has a bug.
- **Do** make `escalation_events` append-only in practice: no update policy, no delete policy, ever.
- **Do** use `on delete cascade` from child tables to `profiles`, so account deletion (required by Apple) actually removes dependent rows.
- **Don't** store the message body in plaintext without at least considering encryption at rest with a server-held key for the MVP, and a documented plan to move toward recipient-side encryption later.

---

## 4. Authentication

- **Do** use Supabase Auth's built-in `signUp` / `signInWithPassword` rather than a hand-rolled table of emails and passwords.
- **Do** handle and surface real errors from `supabase.auth.signUp()` (weak password, email already registered) instead of always navigating forward on success, which is what the current `(auth)/index.tsx` and `sign-in.tsx` do.
- **Do** add a session listener once, in the root layout, using `supabase.auth.onAuthStateChange`, and let every screen read auth state from one place rather than re-checking it individually.
- **Do** gate every tab and onboarding route behind a session check, so a signed-out user can never reach `(tabs)` by deep link.
- **Don't** leave social sign-in buttons with no `onPress` in a production build — either wire them or remove them before release.
- **Don't** store the session yourself in plain AsyncStorage if you can avoid it long-term; AsyncStorage is fine to start, but before launch consider Expo SecureStore (device Keychain/Keystore) for the encryption key, since messages are sensitive.

---

## 5. Client-side coding style

The existing structure (`src/app`, `src/features`, `src/components/ui`, `src/theme`) is good. Keep extending it with these rules:

- **Do** keep files under `src/app/` as thin route wrappers. All real logic (queries, mutations, business rules) belongs in `src/features/<feature>/`, following the pattern already set by `features/messages/useDraftStore.ts`.
- **Do** use the `@/*` path alias already defined in `tsconfig.json` consistently. Currently the codebase uses relative imports (`../../theme/tokens`) everywhere instead — pick one and apply it project-wide.
- **Do** keep `strict: true` in `tsconfig.json` (already set) and never add `// @ts-ignore` to silence a Supabase type error — fix the query or regenerate types instead.
- **Do** regenerate `src/types/database.ts` with `supabase gen types typescript` after every migration, and commit it.
- **Do** name booleans as predicates (`isLoading`, `hasCaregiver`) and event handlers as `handleX`, matching the existing `handleCreate` / `handleSignIn` convention.
- **Don't** put a `supabase.from(...)` call directly inside a component's JSX-adjacent code. Wrap it in a named function inside `features/<x>/api.ts` so it's testable and reusable.
- **Don't** leave dead files like the old root `App.js` pattern around (already correctly removed in the latest commit — keep it that way).

---

## 6. Data-fetching patterns (React Query)

`@tanstack/react-query` is already a dependency but unused. Once wired, follow these conventions:

```ts
// src/features/checkin/api.ts
export const checkInKeys = {
  all: ['checkins'] as const,
  latest: (userId: string) => [...checkInKeys.all, userId, 'latest'] as const,
};

export async function fetchLatestCheckIn(userId: string) {
  const { data, error } = await supabase
    .from('check_ins')
    .select('checked_in_at')
    .eq('user_id', userId)
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
```

- **Do** namespace query keys per feature (as above) so invalidation is precise.
- **Do** invalidate the relevant query after every mutation (e.g. after inserting a check-in, invalidate `checkInKeys.latest(userId)`) rather than manually patching local state.
- **Do** throw on error from every Supabase call inside your fetch functions, so React Query's error state actually triggers instead of silently returning `undefined`.
- **Don't** call `supabase.auth.getUser()` repeatedly inside every query function. Read the user id once from your auth context/store and pass it in.

---

## 7. Validation with Zod

`zod` is installed but currently unused anywhere in `src` — every form (sign-up, caregiver details, message recipient) only checks for non-empty strings. Validate both client and server side, because client validation is a UX convenience, not a security boundary.

```ts
// src/features/messages/schema.ts
import { z } from 'zod';

export const recipientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().optional(),
});

export type Recipient = z.infer<typeof recipientSchema>;
```

- **Do** validate the same shape again inside the Edge Function that writes the row, using the same Zod schema shared from a common module, because a malicious or buggy client can call your API directly, bypassing your UI entirely.
- **Don't** rely on `.length > 0` checks for emails — the current sign-up and recipient forms do this and would accept `"a"` as a valid email.

---

## 8. Edge Functions and server-side logic

This is where the highest-stakes code will live: the function that decides someone has gone silent and releases their message.

### Dos

- **Do** write the stage-transition rule as a pure function first (e.g. `nextStage(hoursSinceLastCheckIn, graceHours)`) with no I/O, so it can be unit-tested exhaustively before it ever touches a real database.
- **Do** make every Edge Function idempotent. A cron job can retry or double-fire; running it twice on the same user in the same minute must never send two emails or skip a stage.
- **Do** advance the state machine one stage at a time, and log every transition to `escalation_events` *before* taking the corresponding action (send email, etc.), so a crash mid-run leaves an accurate trail.
- **Do** require the caregiver to actively confirm ("Yes, she's fine") before a message can be blocked from release — silence from the caregiver should not count as "confirmed safe."
- **Do** protect the public web pages (caregiver accept, "is X okay?", invite links) with a signed, single-use, expiring token — never a guessable or sequential ID.
- **Do** verify webhook signatures for anything triggered from outside Supabase (e.g. an email provider's delivery webhook), using the provider's documented signing secret.
- **Do** add a manual "send test alert" path that exercises the real function code, not a separate mock, so testing actually proves the real logic works.

### Don'ts

- **Don't** let a missed push notification alone trigger message release. Expo's own documentation states delivery is not always guaranteed, so the escalation ladder must include an email fallback and a caregiver-confirmation step before anything irreversible happens.
- **Don't** trust a `user_id` or `stage` value sent from the client to an Edge Function for anything security-relevant. Derive the user from their verified auth token; derive the stage from the database, not the request body.
- **Don't** hardcode timing values (grace period, escalation delays) — keep them as columns on `profiles` so they're auditable and adjustable without a redeploy.
- **Don't** catch and swallow errors inside the cron-invoked function. An unhandled failure should be visible (logged, alerted), not silently skipped — a silent failure here means messages never get sent.

### Example: idempotent, logged stage advance

```ts
// supabase/functions/run-escalation/index.ts (excerpt)
const { data: lastEvent } = await supabase
  .from('escalation_events')
  .select('stage, created_at')
  .eq('user_id', profile.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const targetStage = nextStage(hoursSinceCheckIn, profile.grace_period_hours);

// Idempotency guard: only act if the stage actually changed
if (lastEvent?.stage === targetStage) continue;

await supabase.from('escalation_events').insert({
  user_id: profile.id,
  stage: targetStage,
});

if (targetStage === 'reminded') await sendReminderEmail(profile);
if (targetStage === 'contact_asked') await sendCaregiverCheckEmail(profile);
if (targetStage === 'released') await releaseMessages(profile.id);
```

---

## 9. The escalation engine — extra hardening

This is the core of the product. Treat changes to this logic the way you would treat changes to a payment system.

- **Do** write unit tests covering every stage boundary (exactly at the grace period, one second before, one second after).
- **Do** add a "pause / travel mode" that sets a future resume date on `profiles`, checked before any stage advances — this prevents false alarms during planned absences.
- **Do** require double opt-in from caregivers (they must click Accept) before they can ever be contacted about a user, both for consent and to catch typos in the caregiver's email.
- **Do** keep the audit log (`escalation_events`) forever, even after an account is otherwise deleted for a period required by your privacy policy, since it is the only record of what the system actually did.
- **Don't** allow a single missed cron run to cause skipped stages. Always compute the target stage from *elapsed time*, not from "how many cron ticks have passed."

---

## 10. Push notifications

- **Do** use push only for reminders and non-critical nudges, never as the sole trigger for anything irreversible.
- **Do** test on a development build (`expo-dev-client`), since push notifications are unreliable or unavailable in Expo Go on recent SDKs.
- **Do** store push tokens per-device and remove stale ones when a token registration fails.
- **Don't** assume a delivered push means the user saw it — always pair it with the email fallback already described in Section 8.

---

## 11. Logging, monitoring and error handling

- **Do** add error monitoring (e.g. Sentry) to both the Expo app and the Edge Functions before launch, so failures in the escalation logic are visible rather than silent.
- **Do** log enough context to debug a missed or wrongly-sent message (user id, stage, timestamp) without logging the message body itself in plaintext logs.
- **Don't** log the `service_role` key, full Supabase URLs with embedded credentials, or message contents to any third-party logging service.

---

## 12. Testing strategy

- **Do** unit-test the pure escalation state machine first — it's the highest-value test in the whole app and needs no database.
- **Do** write at least one RLS test per table: attempt to read/write another user's row using a different authenticated client and confirm it's denied.
- **Do** run a real multi-week dry run with a friend as a test caregiver before trusting the system with a real user.
- **Don't** test the escalation function only by manually shortening the grace period in production — use a separate staging Supabase project.

---

## 13. Dependency and repo hygiene

- **Do** add a README covering setup, environment variables required, and how to run migrations.
- **Do** add ESLint and Prettier configs now, before the codebase grows further.
- **Do** add a GitHub Actions workflow that at minimum runs `tsc --noEmit` and lint on every push.
- **Do** keep dependencies used or removed — `zod` and `@tanstack/react-query` are currently installed but unused; wire them up per Sections 6–7 rather than letting unused packages sit in `package.json`.
- **Don't** commit generated native folders (`/ios`, `/android`) — already correctly excluded in `.gitignore`.

---

## 14. Pre-launch security checklist

| Item | Status needed before release |
|---|---|
| RLS enabled and tested on every table | Required |
| `service_role` key never referenced in `src/` | Required |
| Real auth wired (sign up, sign in, sign out, errors surfaced) | Required |
| Zod validation on client and server for all user input | Required |
| Escalation state machine unit-tested at every boundary | Required |
| Caregiver double opt-in implemented | Required |
| Account deletion cancels queued messages (Apple requirement) | Required |
| Privacy policy and terms published, linked in-app | Required |
| Sentry or equivalent wired for app + Edge Functions | Strongly recommended |
| Separate dev/staging/production Supabase projects | Strongly recommended |
| Multi-week real dry run with a test caregiver completed | Strongly recommended |

---

## 15. Quick-reference Do / Don't table

| Topic | Do | Don't |
|---|---|---|
| Keys | Keep `service_role` only in Edge Function secrets | Never put it in `.env`, client code, or logs |
| RLS | Enable on every table before writing app code | Never ship a table without tested policies |
| Validation | Validate with Zod on client and server | Never trust client-only checks |
| Escalation logic | Pure function, idempotent, fully logged | Never trigger release from push alone |
| Auth | Surface real Supabase errors to the user | Never fake success on failure |
| Audit log | Append-only, no update/delete policy | Never allow users to alter their own log |
| Testing | Unit-test state machine, test RLS directly | Never test escalation only in production |

---

*This guide reflects the codebase as of commit `e2f05d3` and current Supabase/Expo documentation as of September 2026. Re-check official docs periodically, since key formats (anon/service_role vs. publishable/secret) and SDK APIs continue to evolve.*
