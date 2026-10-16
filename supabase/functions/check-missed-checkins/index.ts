/**
 * Supabase Edge Function: check-missed-checkins
 *
 * Implements Gap 1–6 of the Escalation & Notification System.
 *
 * Responsibilities:
 *  1. Validate incoming request is from the pg_cron scheduler (service-role token).
 *  2. Query all users whose last check-in is overdue (Gap 1).
 *  3. For each overdue user, determine escalation stage using escalation_events (Gap 3).
 *  4. Stage 1 – Push reminder to monitored person (Gap 2).
 *  5. Stage 2 – Second push to monitored person (Gap 2).
 *  6. Stage 3 – Push all accepted caregivers (Gap 4) + create caregiver_confirmations rows.
 *               Messages are NOT delivered immediately — caregivers have 36 h to respond.
 *  7. processStage3Pending – On each subsequent cron tick:
 *       a. If any caregiver responded 'person_not_okay' → deliver messages now.
 *       b. If any caregiver responded 'person_okay' (and none said not_okay) → resolve, no delivery.
 *       c. If all rows still 'pending' and deadline_at has passed → auto-deliver messages.
 *  8. Return JSON summary { processed, escalated }.
 *
 * Security:
 *  - Uses SERVICE_ROLE_KEY (Supabase secret) — bypasses RLS for cross-user reads.
 *  - Never exposes the service role key in logs or responses.
 *  - Incoming request is authenticated by comparing the Authorization Bearer token
 *    against the SERVICE_ROLE_KEY secret (pg_cron is configured to send it).
 *
 * Deployment:
 *   supabase functions deploy check-missed-checkins --no-verify-jwt
 *
 * Secrets required:
 *   supabase secrets set SERVICE_ROLE_KEY=<your-service-role-key>
 *   supabase secrets set RESEND_API_KEY=<your-resend-api-key>
 *   (RESEND_FROM_EMAIL is optional; falls back to shared sender address)
 *
 * Key Gotchas (from knowledge base):
 *  - escalation_events is APPEND-ONLY — never UPDATE or DELETE rows.
 *  - grace_period_hours can be null — always null-check (defaulted to 24h here).
 *  - Message bodies are client-side encrypted (ciphertext). We send a link-to-app
 *    email rather than raw ciphertext (see Gap 5 note in knowledge base).
 *  - push_tokens RLS blocks anon key for other users — service role key is mandatory.
 */

// @ts-ignore: Deno npm specifier resolved by Supabase Edge Runtime
import { createClient } from 'npm:@supabase/supabase-js@2';
// @ts-ignore: Deno npm specifier resolved by Supabase Edge Runtime
import nacl from 'npm:tweetnacl@1';

// ── Ambient Deno types (for local editor TypeScript environments) ──────────────
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

// ── CORS headers (keep for manual curl invocations during testing) ─────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface OverdueUser {
  user_id: string;
  name: string | null;
  check_in_frequency_days: number;
  grace_period_hours: number | null;
  last_check_in: string | null;
}

interface EscalationEvent {
  id: string;
  user_id: string;
  /**
   * stage_3          = alerts sent to caregivers; waiting for confirmation
   * stage_3_resolved = a caregiver confirmed the person is okay; no messages sent
   * stage_3_delivered = messages were sent (either caregiver confirmed not-okay
   *                     or the 36-hour auto-timeout fired)
   */
  stage: 'stage_1' | 'stage_2' | 'stage_3' | 'stage_3_resolved' | 'stage_3_delivered';
  created_at: string;
}

interface CaregiverConfirmation {
  id: string;
  monitored_user_id: string;
  caregiver_user_id: string;
  escalation_event_id: string;
  status: 'pending' | 'person_okay' | 'person_not_okay';
  responded_at: string | null;
  deadline_at: string;
  created_at: string;
}

// ── Utility helpers ────────────────────────────────────────────────────────────

/** Returns the number of hours elapsed from `from` (ISO string) to `to`. */
function hoursDiff(from: string, to: Date): number {
  return (to.getTime() - new Date(from).getTime()) / (1000 * 60 * 60);
}

/** Escapes HTML special characters to prevent injection in email templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Base64URL helpers (mirrors messages.crypto.ts — no external dep needed) ────

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_MAP: Record<string, number> = {};
for (let i = 0; i < B64URL.length; i++) B64_MAP[B64URL[i]] = i;
B64_MAP['+'] = 62;
B64_MAP['/'] = 63;

function base64UrlToBytes(str: string): Uint8Array {
  const clean = str.replace(/=+$/, '');
  const len = clean.length;
  const out = new Uint8Array(Math.floor((len * 3) / 4));
  let outIdx = 0;
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < len; i++) {
    const val = B64_MAP[clean[i]];
    if (val === undefined) throw new Error(`Invalid base64 char: ${clean[i]}`);
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[outIdx++] = (buffer >> bits) & 0xff;
    }
  }
  return out.subarray(0, outIdx);
}

// ── Escrow decryption (server-side, Stage 3 only) ─────────────────────────────

/**
 * Attempts to decrypt a v2 dual-envelope message body using the Escrow Private Key.
 *
 * Wire format: v2.<user_env>.<escrow_env>.<msg_nonce>.<msg_ciphertext>
 *   user_env    = <base64url_nonce>:<base64url_box>  (skipped server-side)
 *   escrow_env  = <base64url_eph_pubkey>:<base64url_nonce>:<base64url_box>
 *   msg_nonce   = base64url
 *   msg_ciphertext = base64url
 *
 * Steps:
 *   1. Parse the escrow envelope to get the ephemeral public key, nonce, and sealed MDK.
 *   2. Unseal the MDK using nacl.box.open(escrowBox, escrowNonce, ephPublicKey, escrowSecretKey).
 *   3. Decrypt the message ciphertext using the recovered MDK via nacl.secretbox.open.
 *
 * Returns null if decryption fails rather than throwing — callers fall back to
 * the generic "link-to-app" email copy.
 *
 * Security note: The escrow private key is NEVER logged. The decrypted plaintext
 * is delivered once via Resend and never persisted by this function.
 */
function tryDecryptEscrow(ciphertext: string, escrowSecretKey: Uint8Array): string | null {
  try {
    const parts = ciphertext.split('.');
    if (parts[0] !== 'v2' || parts.length !== 5) {
      // v1 legacy format — no escrow envelope, cannot decrypt server-side
      return null;
    }

    const escrowEnvStr = parts[2];
    if (escrowEnvStr === 'none') {
      // Message was encrypted before EXPO_PUBLIC_ESCROW_PUBLIC_KEY was configured
      return null;
    }

    const escrowParts = escrowEnvStr.split(':');
    if (escrowParts.length !== 3) {
      console.error('[check-missed-checkins] Malformed escrow envelope — expected 3 colon-separated parts.');
      return null;
    }

    const ephPublicKey  = base64UrlToBytes(escrowParts[0]);
    const escrowNonce   = base64UrlToBytes(escrowParts[1]);
    const escrowBox     = base64UrlToBytes(escrowParts[2]);
    const msgNonce      = base64UrlToBytes(parts[3]);
    const msgBox        = base64UrlToBytes(parts[4]);

    // Step 1: Unseal the Message Data Key (MDK) from the escrow envelope
    const mdk = nacl.box.open(escrowBox, escrowNonce, ephPublicKey, escrowSecretKey);
    if (!mdk) {
      console.error('[check-missed-checkins] nacl.box.open failed — wrong escrow key or corrupted envelope.');
      return null;
    }

    // Step 2: Decrypt message body with recovered MDK
    const plainBytes = nacl.secretbox.open(msgBox, msgNonce, mdk);
    if (!plainBytes) {
      console.error('[check-missed-checkins] nacl.secretbox.open failed — corrupted message ciphertext.');
      return null;
    }

    return new TextDecoder().decode(plainBytes);
  } catch (err) {
    console.error('[check-missed-checkins] tryDecryptEscrow unexpected error:', err);
    return null;
  }
}

// ── Push notification helper (Gap 2) ─────────────────────────────────────────

/**
 * Sends a push notification via the Expo Push API.
 *
 * Lives entirely server-side — the client app only registers tokens;
 * all sending is server-initiated from this Edge Function.
 */
/**
 * Sends a push notification via the Expo Push API.
 *
 * Lives entirely server-side — the client app only registers tokens;
 * all sending is server-initiated from this Edge Function.
 *
 * @param data  Optional key-value data payload (delivered to app's notification handler).
 *              Use { url: 'peartap://welfare-check/<id>' } for deep-link notifications.
 */
async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default', data: data ?? {} }),
    });
    if (!response.ok) {
      const respData = await response.json().catch(() => ({}));
      console.error('[check-missed-checkins] Expo Push API error:', response.status, respData);
    }
  } catch (err) {
    console.error('[check-missed-checkins] sendExpoPush fetch failed:', err);
  }
}

/**
 * Gap 2 helper — fetches all push tokens for `userId`.
 *
 * Must use the service-role client: push_tokens RLS only allows users to read
 * their OWN tokens. The service role bypasses RLS so we can read any user's tokens
 * for cross-user notification dispatch. This is intentional and documented in the
 * knowledge base (Gotcha #3).
 */
// deno-lint-ignore no-explicit-any
async function getPushTokensForUser(supabase: any, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId);

  if (error) {
    console.error(
      `[check-missed-checkins] getPushTokensForUser(${userId}) error:`,
      error.message,
    );
    return [];
  }
  return (data ?? []).map((r: { token: string }) => r.token);
}

// ── Escalation stage handlers ─────────────────────────────────────────────────

/**
 * Gap 2 / Gap 3: Stage 1 — First reminder push to the monitored person.
 * Fires when a user is overdue and no escalation event exists yet.
 *
 * After sending, inserts a row into escalation_events (append-only audit log).
 */
// deno-lint-ignore no-explicit-any
async function fireStage1(supabase: any, user: OverdueUser): Promise<void> {
  console.log(`[check-missed-checkins] Firing Stage 1 for user ${user.user_id}`);

  const tokens = await getPushTokensForUser(supabase, user.user_id);
  for (const token of tokens) {
    await sendExpoPush(
      token,
      'Are you okay?',
      "You haven't checked in yet. Tap to check in.",
    );
  }

  // escalation_events is append-only — always INSERT, never UPDATE/DELETE
  await supabase.from('escalation_events').insert({
    user_id: user.user_id,
    stage: 'stage_1',
  });

  console.log(`[check-missed-checkins] Stage 1 fired + logged for user ${user.user_id}`);
}

/**
 * Gap 2 / Gap 3: Stage 2 — Second, more urgent push to the monitored person.
 * Fires after grace_period_hours has elapsed since Stage 1.
 */
// deno-lint-ignore no-explicit-any
async function fireStage2(supabase: any, user: OverdueUser): Promise<void> {
  console.log(`[check-missed-checkins] Firing Stage 2 for user ${user.user_id}`);

  const tokens = await getPushTokensForUser(supabase, user.user_id);
  for (const token of tokens) {
    await sendExpoPush(
      token,
      '⚠️ Still waiting for your check-in',
      "We still haven't heard from you. Tap here urgently to check in and let your circle know you're safe.",
    );
  }

  await supabase.from('escalation_events').insert({
    user_id: user.user_id,
    stage: 'stage_2',
  });

  console.log(`[check-missed-checkins] Stage 2 fired + logged for user ${user.user_id}`);
}

/**
 * Stage 3 — Alert caregivers + open welfare-check confirmation gate.
 *
 * This stage NO LONGER delivers messages immediately. Instead it:
 *   1. Pushes a welfare-check notification to every accepted caregiver
 *      with a deep link (data.url = 'peartap://welfare-check/<user_id>').
 *   2. Inserts one caregiver_confirmations row per caregiver
 *      (status = 'pending', deadline_at = now + 36 h).
 *   3. Inserts the escalation_events 'stage_3' row (the completion marker).
 *
 * The actual message delivery is handled on the NEXT cron tick(s) by
 * processStage3Pending(), which reads the confirmation rows and decides:
 *   - any 'person_not_okay' → deliver now
 *   - any 'person_okay' (none not_okay) → resolve, no delivery
 *   - all pending + deadline passed → auto-deliver
 *
 * Security note on push_tokens: service-role key bypasses RLS — required
 * for reading caregivers' tokens (knowledge base Gotcha #3).
 */
// deno-lint-ignore no-explicit-any
async function fireStage3(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  user: OverdueUser,
): Promise<void> {
  console.log(`[check-missed-checkins] Firing Stage 3 (welfare-check gate) for user ${user.user_id}`);

  const displayName = user.name?.trim() || 'Someone in your circle';

  // ── 1. Fetch all accepted caregivers ──────────────────────────────────────
  const { data: caregivers, error: cgError } = await supabase
    .from('caregivers')
    .select('caregiver_user_id, name')
    .eq('user_id', user.user_id)
    .eq('status', 'accepted')
    .not('caregiver_user_id', 'is', null);

  if (cgError) {
    console.error(
      `[check-missed-checkins] Failed to fetch caregivers for ${user.user_id}:`,
      cgError.message,
    );
  }

  // ── 2. Insert stage_3 escalation_events row FIRST so we get its ID ────────
  const { data: evtRow, error: evtError } = await supabase
    .from('escalation_events')
    .insert({ user_id: user.user_id, stage: 'stage_3' })
    .select('id')
    .single();

  if (evtError || !evtRow) {
    console.error(
      `[check-missed-checkins] Failed to insert stage_3 event for ${user.user_id}:`,
      evtError?.message,
    );
    // Still attempt push notifications even if DB write failed
  }

  const escalationEventId: string | null = evtRow?.id ?? null;
  const deadlineAt = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();

  // ── 3. Push each caregiver + insert confirmation row ─────────────────────
  for (const cg of caregivers ?? []) {
    // Insert confirmation row (service-role bypasses RLS).
    // The UNIQUE constraint on (monitored_user_id, caregiver_user_id, escalation_event_id)
    // silently rejects duplicate inserts, making this safe to retry on cron re-runs.
    if (escalationEventId) {
      const { error: confirmError } = await supabase
        .from('caregiver_confirmations')
        .insert({
          monitored_user_id:   user.user_id,
          caregiver_user_id:   cg.caregiver_user_id,
          escalation_event_id: escalationEventId,
          status:              'pending',
          deadline_at:         deadlineAt,
        });

      if (confirmError) {
        // code 23505 = unique_violation; expected on cron retry — safe to ignore
        if (confirmError.code !== '23505') {
          console.warn(
            `[check-missed-checkins] Could not insert confirmation row for caregiver ` +
            `${cg.caregiver_user_id}:`,
            confirmError.message,
          );
        }
      }
    }

    // Push notification with deep-link data payload
    const caregiverTokens = await getPushTokensForUser(supabase, cg.caregiver_user_id);
    for (const token of caregiverTokens) {
      await sendExpoPush(
        token,
        '⚠️ Welfare Check Required',
        `${displayName} has not checked in. Please check on them and confirm their status.`,
        // data payload — app reads this to open the welfare-check screen
        { url: `peartap://welfare-check/${user.user_id}` },
      );
    }
  }

  const cgCount = (caregivers ?? []).length;
  if (cgCount === 0) {
    // No caregivers at all — deliver messages immediately, no one to confirm
    console.warn(
      `[check-missed-checkins] User ${user.user_id} has no accepted caregivers at Stage 3 — ` +
      'messages will be treated as auto-delivered on next tick (no confirmation rows inserted).',
    );
  }

  console.log(
    `[check-missed-checkins] Stage 3 fired for user ${user.user_id}. ` +
    `Caregivers notified: ${cgCount}. Deadline: ${deadlineAt}.`,
  );
}

/**
 * processStage3Pending — called each cron tick for users whose latest
 * escalation_events row is 'stage_3' (confirmation gate open).
 *
 * Decision logic (checked in priority order):
 *   1. Any 'person_not_okay' response? → deliver messages + insert stage_3_delivered
 *   2. Any 'person_okay' + none 'person_not_okay'? → resolve + insert stage_3_resolved
 *   3. All pending + now >= deadline_at? → auto-deliver + insert stage_3_delivered
 *   4. Otherwise → still waiting; do nothing this tick.
 *
 * Returns true if a terminal action was taken (delivery or resolution).
 */
// deno-lint-ignore no-explicit-any
async function processStage3Pending(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  user: OverdueUser,
  stage3Event: EscalationEvent,
  resendApiKey: string,
  fromEmail: string,
  escrowSecretKey: Uint8Array | null,
): Promise<boolean> {
  // Fetch all confirmation rows for this stage_3 event
  const { data: confirmations, error: confError } = await supabase
    .from('caregiver_confirmations')
    .select('id, status, deadline_at, caregiver_user_id')
    .eq('monitored_user_id', user.user_id)
    .eq('escalation_event_id', stage3Event.id);

  if (confError) {
    console.error(
      `[check-missed-checkins] Failed to fetch confirmations for ${user.user_id}:`,
      confError.message,
    );
    return false;
  }

  const rows = (confirmations ?? []) as CaregiverConfirmation[];
  const now  = new Date();

  // Edge case: no caregiver_confirmations rows (no accepted caregivers at Stage 3 time)
  // → auto-deliver now (no one to confirm)
  if (rows.length === 0) {
    console.log(
      `[check-missed-checkins] No confirmation rows for ${user.user_id} — auto-delivering (no caregivers).`,
    );
    await deliverMessages(supabase, user, resendApiKey, fromEmail, escrowSecretKey);
    await supabase.from('escalation_events').insert({
      user_id: user.user_id,
      stage: 'stage_3_delivered',
    });
    return true;
  }

  const hasNotOkay = rows.some(r => r.status === 'person_not_okay');
  const hasOkay    = rows.some(r => r.status === 'person_okay');
  const allPending  = rows.every(r => r.status === 'pending');
  // Deadline: use the minimum deadline_at across all rows
  const deadline   = new Date(Math.min(...rows.map(r => new Date(r.deadline_at).getTime())));

  // ── Priority 1: Any caregiver said NOT okay → deliver immediately ──────────
  if (hasNotOkay) {
    const responder = rows.find(r => r.status === 'person_not_okay')!;
    console.log(
      `[check-missed-checkins] Caregiver ${responder.caregiver_user_id} confirmed NOT okay ` +
      `for ${user.user_id} — delivering messages now.`,
    );
    await deliverMessages(supabase, user, resendApiKey, fromEmail, escrowSecretKey);
    await supabase.from('escalation_events').insert({
      user_id: user.user_id,
      stage: 'stage_3_delivered',
    });
    return true;
  }

  // ── Priority 2: At least one 'okay' and none 'not_okay' → resolve ─────────
  if (hasOkay && !hasNotOkay) {
    const responder = rows.find(r => r.status === 'person_okay')!;
    console.log(
      `[check-missed-checkins] Caregiver ${responder.caregiver_user_id} confirmed OKAY ` +
      `for ${user.user_id} — escalation resolved, no messages sent.`,
    );
    await supabase.from('escalation_events').insert({
      user_id: user.user_id,
      stage: 'stage_3_resolved',
    });
    return true;
  }

  // ── Priority 3: All still pending + deadline passed → auto-deliver ─────────
  if (allPending && now >= deadline) {
    console.log(
      `[check-missed-checkins] 36-hour caregiver timeout reached for ${user.user_id} ` +
      '— auto-delivering messages.',
    );
    await deliverMessages(supabase, user, resendApiKey, fromEmail, escrowSecretKey);
    await supabase.from('escalation_events').insert({
      user_id: user.user_id,
      stage: 'stage_3_delivered',
    });
    return true;
  }

  // Still waiting — log remaining time
  const hoursLeft = Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
  console.log(
    `[check-missed-checkins] Stage 3 pending for ${user.user_id}. ` +
    `Awaiting caregiver response. Auto-deliver in ${hoursLeft.toFixed(1)}h.`,
  );
  return false;
}

// ── Message delivery (Gap 5) ──────────────────────────────────────────────────

/**
 * Delivers all `status = 'active'` messages for the given user via Resend email.
 *
 * Decryption strategy (see messages/SECURITY.md for full architecture):
 *   - Messages use a dual-envelope v2 format.
 *   - The Escrow Private Key (ESCROW_PRIVATE_KEY secret) unseals Envelope B to
 *     recover the Message Data Key (MDK), which is then used to decrypt the body.
 *   - If ESCROW_PRIVATE_KEY is absent OR decryption fails (v1 legacy / no escrow
 *     envelope), falls back to a generic "open PearTap" email so delivery never
 *     silently drops — the recipient always gets notified.
 *
 * Retry safety: messages are only marked `sent` after a successful Resend response.
 * If Resend fails, the message stays `active` so the next cron run can retry.
 */
// deno-lint-ignore no-explicit-any
async function deliverMessages(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  user: OverdueUser,
  resendApiKey: string,
  fromEmail: string,
  escrowSecretKey: Uint8Array | null,
): Promise<void> {
  // Fetch active messages including the encrypted body
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, recipient_name, recipient_email, body')
    .eq('user_id', user.user_id)
    .eq('status', 'active');

  if (msgError) {
    console.error(
      `[check-missed-checkins] Failed to fetch messages for ${user.user_id}:`,
      msgError.message,
    );
    return;
  }

  const displayName = user.name?.trim() || 'Someone important to you';

  for (const msg of messages ?? []) {
    if (!msg.recipient_email) {
      console.warn(`[check-missed-checkins] Message ${msg.id} has no recipient_email — skipping.`);
      continue;
    }

    // ── Attempt escrow decryption ──────────────────────────────────────────────
    let decryptedBody: string | null = null;
    if (escrowSecretKey && msg.body) {
      decryptedBody = tryDecryptEscrow(msg.body, escrowSecretKey);
      if (decryptedBody) {
        console.log(`[check-missed-checkins] Successfully decrypted message ${msg.id} via escrow.`);
      } else {
        console.warn(
          `[check-missed-checkins] Escrow decryption returned null for message ${msg.id} — ` +
          'sending link-to-app fallback.',
        );
      }
    } else if (!escrowSecretKey) {
      console.warn(
        `[check-missed-checkins] ESCROW_PRIVATE_KEY not set — sending link-to-app fallback for message ${msg.id}.`,
      );
    }

    const safeRecipientName = escapeHtml(msg.recipient_name?.trim() || 'Friend');
    const safeSenderName = escapeHtml(displayName);
    const emailSubject = `An important message from ${displayName}`;

    // ── Build HTML email ───────────────────────────────────────────────────────
    // Two variants:
    //   A) Decrypted: shows the actual plaintext message body
    //   B) Fallback: generic "open PearTap" prompt (no body available)
    let messageSection: string;
    let textFallback: string;

    if (decryptedBody) {
      const safeBody = escapeHtml(decryptedBody).replace(/\n/g, '<br>');
      messageSection = `
    <p class="text">
      Hello ${safeRecipientName},<br><br>
      <strong>${safeSenderName}</strong> has left you a personal message through PearTap.
      This message was scheduled to reach you if they missed their regular check-in —
      which has now occurred. Please read their words carefully.
    </p>
    <div class="message-card">
      <div class="message-label">✉️ Message from ${safeSenderName}</div>
      <div class="message-body">${safeBody}</div>
    </div>
    <p class="text">
      If you are concerned about their wellbeing, please try to reach them directly
      or contact emergency services if necessary.
    </p>`;

      textFallback = `Hello ${msg.recipient_name?.trim() || 'Friend'},

${displayName} has left you an important message:

"${decryptedBody}"

If you are concerned about their wellbeing, please try to reach them directly or contact emergency services if necessary.

— PearTap (sent automatically because ${displayName} missed their scheduled check-in)`.trim();
    } else {
      // Fallback: escrow decryption not available (v1 message or key missing)
      messageSection = `
    <p class="text">
      Hello ${safeRecipientName},<br><br>
      <strong>${safeSenderName}</strong> has left you an important message through PearTap,
      their personal check-in safety app. This message was scheduled to reach you if they
      missed their regular check-in — which has now occurred.
    </p>
    <div class="notice">
      <div class="notice-label">🔒 Encrypted Message</div>
      <div class="notice-text">
        This message is end-to-end encrypted and must be read inside the PearTap app.
        Please download PearTap and sign in using the email address
        <strong>${safeSenderName}</strong> may have shared with you.
      </div>
    </div>
    <p class="text">
      If you are concerned about their wellbeing, please try to reach them directly
      or contact emergency services if necessary.
    </p>`;

      textFallback = `Hello ${msg.recipient_name?.trim() || 'Friend'},

${displayName} has left you an important message through PearTap, their personal check-in safety app.

This message is encrypted and can only be read inside the PearTap app. Please download PearTap and sign in to read it.

If you are concerned about their wellbeing, please try to reach them directly or contact emergency services if necessary.

— PearTap (sent automatically because ${displayName} missed their scheduled check-in)`.trim();
    }

    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${emailSubject}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#F8FAFC;margin:0;padding:24px;color:#0F172A}
    .card{background:#fff;border-radius:16px;border:1px solid #E2E8F0;max-width:520px;margin:0 auto;padding:36px 32px;box-shadow:0 4px 6px -1px rgba(0,0,0,.05)}
    .brand{font-size:20px;font-weight:800;color:#1E293B;margin-bottom:24px;letter-spacing:-.5px}
    .title{font-size:22px;font-weight:700;color:#0F172A;margin:0 0 16px}
    .text{font-size:15px;line-height:1.6;color:#475569;margin:0 0 20px}
    .message-card{background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:12px;padding:20px 22px;margin:24px 0}
    .message-label{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#16A34A;margin-bottom:12px}
    .message-body{font-size:15px;color:#14532D;line-height:1.75;white-space:pre-wrap;word-break:break-word}
    .notice{background:#FFF7ED;border:1.5px solid #F97316;border-radius:12px;padding:18px 20px;margin:28px 0}
    .notice-label{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#EA580C;margin-bottom:8px}
    .notice-text{font-size:14px;color:#7C2D12;line-height:1.6}
    .footer{font-size:12px;color:#94A3B8;margin-top:28px;line-height:1.5;border-top:1px solid #F1F5F9;padding-top:20px}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">PearTap</div>
    <h1 class="title">A message has been released to you</h1>
    ${messageSection}
    <div class="footer">
      This email was sent automatically by PearTap because ${safeSenderName} missed
      their scheduled check-in. If you have questions, please contact support.
    </div>
  </div>
</body>
</html>`;

    // ── Send via Resend ────────────────────────────────────────────────────────
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [msg.recipient_email],
          subject: emailSubject,
          html: htmlBody,
          text: textFallback,
        }),
      });

      const resendData = await resendResponse.json().catch(() => ({}));

      if (!resendResponse.ok) {
        console.error(
          `[check-missed-checkins] Resend failed for message ${msg.id}:`,
          resendResponse.status,
          resendData?.message,
        );
        continue; // leave status = 'active' so next cron run retries
      }

      const decryptMode = decryptedBody ? 'decrypted' : 'link-to-app fallback';
      console.log(
        `[check-missed-checkins] Message ${msg.id} delivered via Resend ` +
        `(${decryptMode}, resendId: ${resendData?.id})`,
      );
    } catch (err) {
      console.error(
        `[check-missed-checkins] Resend network error for message ${msg.id}:`,
        err,
      );
      continue;
    }

    // Mark as sent only after confirmed delivery
    const { error: updateError } = await supabase
      .from('messages')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', msg.id);

    if (updateError) {
      console.error(
        `[check-missed-checkins] Failed to mark message ${msg.id} as sent:`,
        updateError.message,
      );
    }
  }
}

// ── Escalation state machine (Gap 3) ─────────────────────────────────────────

/**
 * Determines the next escalation stage for a given overdue user and fires it.
 *
 * State machine rules:
 *   No event              → fire Stage 1
 *   stage_1 + elapsed >= grace_period_hours → fire Stage 2
 *   stage_2 + elapsed >= grace_period_hours → fire Stage 3 (alerts + open confirmation gate)
 *   stage_3               → check caregiver_confirmations via processStage3Pending()
 *   stage_3_resolved      → terminal (person okay; no further action)
 *   stage_3_delivered     → terminal (messages sent; no further action)
 *
 * grace_period_hours null-check (knowledge base Gotcha #8):
 *   If the user hasn't completed onboarding, grace_period_hours may be null.
 *   We default to 24 hours rather than proceeding immediately.
 *
 * Returns true if an action was taken this tick.
 */
// deno-lint-ignore no-explicit-any
async function processOverdueUser(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  user: OverdueUser,
  resendApiKey: string,
  fromEmail: string,
  escrowSecretKey: Uint8Array | null,
): Promise<boolean> {
  const { data: events, error: evtError } = await supabase
    .from('escalation_events')
    .select('id, user_id, stage, created_at')
    .eq('user_id', user.user_id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (evtError) {
    console.error(
      `[check-missed-checkins] Failed to fetch escalation_events for ${user.user_id}:`,
      evtError.message,
    );
    return false;
  }

  const latestEvent: EscalationEvent | null = events?.[0] ?? null;

  // Null-check grace_period_hours — default 24h if profile incomplete (Gotcha #8)
  const gracePeriod = user.grace_period_hours ?? 24;
  const now = new Date();

  if (!latestEvent) {
    await fireStage1(supabase, user);
    return true;
  }

  if (latestEvent.stage === 'stage_1') {
    const elapsed = hoursDiff(latestEvent.created_at, now);
    if (elapsed >= gracePeriod) {
      await fireStage2(supabase, user);
      return true;
    }
    // Still within grace period — wait for next cron tick
    return false;
  }

  if (latestEvent.stage === 'stage_2') {
    const elapsed = hoursDiff(latestEvent.created_at, now);
    if (elapsed >= gracePeriod) {
      // Stage 3: send alerts + open confirmation gate (no message delivery yet)
      await fireStage3(supabase, user);
      return true;
    }
    return false;
  }

  // stage_3 = confirmation gate open — delegate to processStage3Pending each tick
  if (latestEvent.stage === 'stage_3') {
    return await processStage3Pending(
      supabase,
      user,
      latestEvent,
      resendApiKey,
      fromEmail,
      escrowSecretKey,
    );
  }

  // Terminal stages — nothing more to do
  if (latestEvent.stage === 'stage_3_resolved' || latestEvent.stage === 'stage_3_delivered') {
    return false;
  }

  console.warn(
    `[check-missed-checkins] Unknown stage "${latestEvent.stage}" for user ${user.user_id} — skipping.`,
  );
  return false;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight (for manual testing convenience)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[check-missed-checkins] Invoked at', new Date().toISOString());

  try {
    // ── 1. Validate required secrets ──────────────────────────────────────────
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      console.error('[check-missed-checkins] SERVICE_ROLE_KEY secret is not configured.');
      return new Response(
        JSON.stringify({ error: 'SERVICE_ROLE_KEY secret is not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('[check-missed-checkins] RESEND_API_KEY secret is not configured.');
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY secret is not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'PearTap <noreply@qrmint.online>';

    // ── Load Escrow Private Key (optional — falls back gracefully if absent) ──
    // The key is a base64url-encoded 32-byte X25519 private key stored as a
    // Supabase secret. It MUST NOT be logged or included in any response.
    let escrowSecretKey: Uint8Array | null = null;
    const escrowKeyStr = Deno.env.get('ESCROW_PRIVATE_KEY');
    if (escrowKeyStr) {
      try {
        const keyBytes = base64UrlToBytes(escrowKeyStr);
        if (keyBytes.length !== nacl.box.secretKeyLength) {
          console.error(
            `[check-missed-checkins] ESCROW_PRIVATE_KEY has wrong length: ` +
            `expected ${nacl.box.secretKeyLength} bytes, got ${keyBytes.length}. ` +
            'Will fall back to link-to-app email.',
          );
        } else {
          escrowSecretKey = keyBytes;
          console.log('[check-missed-checkins] Escrow private key loaded — real message bodies will be decrypted.');
        }
      } catch (err) {
        console.error('[check-missed-checkins] Failed to decode ESCROW_PRIVATE_KEY:', err, '— will fall back to link-to-app email.');
      }
    } else {
      console.warn('[check-missed-checkins] ESCROW_PRIVATE_KEY not configured — messages will be sent as link-to-app fallback.');
    }

    // ── 2. Authenticate the incoming request ──────────────────────────────────
    // pg_cron is configured to pass the service-role key as a Bearer token
    // (see: supabase/migrations/*_add_pg_cron_job.sql).
    // We validate it here so arbitrary external callers can't trigger escalations.
    const authHeader = req.headers.get('Authorization') || '';
    const incomingToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!incomingToken || incomingToken !== serviceRoleKey) {
      console.warn('[check-missed-checkins] Unauthorized invocation — token mismatch.');
      return new Response(
        JSON.stringify({ error: 'Unauthorized.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 3. Initialize service-role Supabase client ────────────────────────────
    // The service role bypasses ALL RLS policies — required for:
    //   - Reading check_ins and profiles for all users
    //   - Reading push_tokens for any user (RLS blocks anon key here)
    //   - Writing to escalation_events without RLS restriction
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── 4. Gap 1: Fetch all profiles that have check_in_frequency_days set ────
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, check_in_frequency_days, grace_period_hours')
      .not('check_in_frequency_days', 'is', null);

    if (profilesError) {
      console.error('[check-missed-checkins] Failed to fetch profiles:', profilesError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!profiles || profiles.length === 0) {
      console.log('[check-missed-checkins] No profiles with check_in_frequency_days — nothing to do.');
      return new Response(
        JSON.stringify({ processed: 0, escalated: 0, durationMs: Date.now() - startTime }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 5. Gap 1: Fetch last check-in per user (single batch query) ───────────
    // Fetching all check-ins in one query and building a Map is more efficient
    // than N per-user queries, especially as the user base grows.
    const userIds = profiles.map((p: { id: string }) => p.id);

    const { data: lastCheckIns, error: checkInError } = await supabase
      .from('check_ins')
      .select('user_id, checked_in_at')
      .in('user_id', userIds)
      .order('checked_in_at', { ascending: false });

    if (checkInError) {
      console.error(
        '[check-missed-checkins] Failed to fetch check_ins:',
        checkInError.message,
      );
      return new Response(
        JSON.stringify({ error: 'Failed to fetch check-in records.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Build user_id → latest checked_in_at map (results are DESC, first hit = latest)
    const lastCheckInMap = new Map<string, string>();
    for (const ci of lastCheckIns ?? []) {
      if (!lastCheckInMap.has(ci.user_id)) {
        lastCheckInMap.set(ci.user_id, ci.checked_in_at);
      }
    }

    // ── 6. Gap 1: Determine overdue users ─────────────────────────────────────
    const now = new Date();
    const overdueUsers: OverdueUser[] = [];

    for (const profile of profiles) {
      const lastCheckIn = lastCheckInMap.get(profile.id) ?? null;

      if (!lastCheckIn) {
        // Never checked in → always overdue
        overdueUsers.push({
          user_id: profile.id,
          name: profile.name,
          check_in_frequency_days: profile.check_in_frequency_days,
          grace_period_hours: profile.grace_period_hours,
          last_check_in: null,
        });
        continue;
      }

      const dueAt = new Date(
        new Date(lastCheckIn).getTime() +
          profile.check_in_frequency_days * 24 * 60 * 60 * 1000,
      );

      if (now >= dueAt) {
        overdueUsers.push({
          user_id: profile.id,
          name: profile.name,
          check_in_frequency_days: profile.check_in_frequency_days,
          grace_period_hours: profile.grace_period_hours,
          last_check_in: lastCheckIn,
        });
      }
    }

    console.log(
      `[check-missed-checkins] Profiles: ${profiles.length}, Overdue: ${overdueUsers.length}`,
    );

    // ── 7. Process each overdue user through the escalation state machine ─────
    let escalatedCount = 0;

    for (const user of overdueUsers) {
      try {
        const escalated = await processOverdueUser(supabase, user, resendApiKey, fromEmail, escrowSecretKey);
        if (escalated) escalatedCount++;
      } catch (err) {
        // Per-user isolation: one bad user should NOT crash the whole batch
        console.error(
          `[check-missed-checkins] Unhandled error for user ${user.user_id}:`,
          err,
        );
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(
      `[check-missed-checkins] Complete. Processed=${overdueUsers.length}, Escalated=${escalatedCount}, Duration=${durationMs}ms`,
    );

    // ── 8. Return summary ─────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({ processed: overdueUsers.length, escalated: escalatedCount, durationMs }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[check-missed-checkins] Top-level error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
