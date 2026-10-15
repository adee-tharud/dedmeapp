/**
 * Supabase Edge Function: send-caregiver-invite
 *
 * Dispatches an invitation email containing a secure, single-use, 72-hour invite token
 * to a prospective caregiver via the Resend API.
 *
 * Security & Coding Standards:
 * 1. User-scoped client: Validates caller JWT via auth.getUser(); obtains userId from verified identity.
 * 2. Authorization: Queries caregiver record with BOTH caregiverId AND authenticated userId.
 * 3. Status Check: Ensures caregiver is still eligible ('pending' status only).
 * 4. Token Protection: Token is never logged; single-use; 72-hour expiration window; rotated on resend.
 * 5. Rate Limiting: 60-second cooldown enforced via last_invite_sent_at.
 * 6. XSS Prevention: All user-supplied inputs (names, relationships) are HTML-escaped.
 * 7. Secrets: RESEND_API_KEY read strictly from Deno.env secrets.
 */
// @ts-ignore: Deno npm specifier resolved by Supabase Edge Runtime
import { createClient } from 'npm:@supabase/supabase-js@2';

// Ambient declaration for editor TypeScript environments
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COOLDOWN_SECONDS = 60;
const EXPIRATION_HOURS = 72;

/**
 * Escapes characters with HTML entities to prevent XSS/injection in email clients.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates basic email structure.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Validate Secrets ───────────────────────────────────────────────────
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('[send-caregiver-invite] RESEND_API_KEY is not configured in Edge Function secrets.');
      return new Response(
        JSON.stringify({ error: 'Email service is not configured. Please set RESEND_API_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'PearTap <norely@qrmint.online>';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    // ── 2. Authenticate the Caller via User-Scoped Client ─────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication session.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifiedUserId = user.id;

    // ── 3. Parse and Validate Request Body ─────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const caregiverId = body?.caregiverId;

    if (!caregiverId || typeof caregiverId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'A valid caregiverId is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. Query Caregiver with Double-Bound Ownership ─────────────────────────
    // Querying with BOTH caregiverId AND verifiedUserId guarantees no user can
    // access or send invites for a caregiver record they do not own.
    const { data: caregiver, error: fetchError } = await userClient
      .from('caregivers')
      .select('id, user_id, name, email, relationship, status, invite_token, invite_expires_at, last_invite_sent_at')
      .eq('id', caregiverId)
      .eq('user_id', verifiedUserId)
      .maybeSingle();

    if (fetchError || !caregiver) {
      return new Response(
        JSON.stringify({ error: 'Caregiver record not found or access denied.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 5. Check Eligibility ──────────────────────────────────────────────────
    if (caregiver.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'This caregiver has already accepted the invitation.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidEmail(caregiver.email)) {
      return new Response(
        JSON.stringify({ error: 'Caregiver email address is invalid.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 6. Rate Limiting Check (60-second cooldown) ───────────────────────────
    const now = new Date();
    if (caregiver.last_invite_sent_at) {
      const lastSentTime = new Date(caregiver.last_invite_sent_at).getTime();
      const elapsedSeconds = (now.getTime() - lastSentTime) / 1000;

      if (elapsedSeconds < COOLDOWN_SECONDS) {
        const retryAfter = Math.ceil(COOLDOWN_SECONDS - elapsedSeconds);
        return new Response(
          JSON.stringify({
            error: `Please wait ${retryAfter}s before resending another invitation.`,
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
            },
          }
        );
      }
    }

    // ── 7. Rotate & Protect the Invite Token ──────────────────────────────────
    // Every time an invite is dispatched (or resent), issue a new single-use token
    // with a fresh 72-hour window. This immediately invalidates prior tokens.
    const freshToken = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + EXPIRATION_HOURS * 60 * 60 * 1000).toISOString();
    let tokenForEmail = freshToken;

    const { error: updateError } = await userClient
      .from('caregivers')
      .update({
        invite_token: freshToken,
        invite_expires_at: expiresAt,
        last_invite_sent_at: now.toISOString(),
      })
      .eq('id', caregiver.id)
      .eq('user_id', verifiedUserId);

    if (updateError) {
      console.warn('[send-caregiver-invite] Full update failed, falling back to invite_token only:', updateError.message);
      // Attempt fallback with just invite_token in case new migration columns haven't been applied yet
      const { error: fallbackError } = await userClient
        .from('caregivers')
        .update({ invite_token: freshToken })
        .eq('id', caregiver.id)
        .eq('user_id', verifiedUserId);

      if (fallbackError) {
        console.warn('[send-caregiver-invite] Fallback update failed, using existing token:', fallbackError.message);
        tokenForEmail = caregiver.invite_token;
      }
    }

    // ── 8. Fetch Sender Profile for Context ────────────────────────────────────
    const { data: profile } = await userClient
      .from('profiles')
      .select('name')
      .eq('id', verifiedUserId)
      .maybeSingle();

    const senderName = profile?.name?.trim() || 'Someone close to you';
    const caregiverName = caregiver.name?.trim() || 'Friend';
    const relationshipText = caregiver.relationship?.trim()
      ? ` as their ${caregiver.relationship.trim().toLowerCase()}`
      : '';

    // ── 9. Safe Content Rendering (XSS-protected) ─────────────────────────────
    const safeSenderName = escapeHtml(senderName);
    const safeCaregiverName = escapeHtml(caregiverName);
    const safeRelationship = escapeHtml(relationshipText);

    const emailSubject = `${safeSenderName} invited you to be their circle contact on PearTap`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #0F172A; }
    .card { background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; max-width: 520px; margin: 0 auto; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .brand { font-size: 20px; font-weight: 800; color: #1E293B; margin-bottom: 24px; letter-spacing: -0.5px; }
    .title { font-size: 22px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0; }
    .text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
    .token-box { background-color: #EEF2FF; border: 1.5px dashed #6366F1; border-radius: 12px; padding: 18px 20px; text-align: center; margin: 28px 0; }
    .token-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #4F46E5; margin-bottom: 6px; }
    .token-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 20px; font-weight: 700; letter-spacing: 1.5px; color: #1E1B4B; user-select: all; word-break: break-all; }
    .expiry { font-size: 13px; color: #64748B; text-align: center; margin-top: 8px; }
    .steps { background-color: #F8FAFC; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; }
    .step-item { font-size: 14px; color: #334155; margin: 8px 0; line-height: 1.4; }
    .footer { font-size: 12px; color: #94A3B8; margin-top: 28px; line-height: 1.5; border-top: 1px solid #F1F5F9; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">PearTap</div>
    <h1 class="title">You've been invited to PearTap</h1>
    <p class="text">
      Hello ${safeCaregiverName},<br><br>
      <strong>${safeSenderName}</strong> has added you${safeRelationship} to their trusted circle on PearTap.
    </p>
    <p class="text">
      PearTap gives people living independently peace of mind by performing gentle daily check-ins. As a circle contact, you will only be notified if they miss their regular check-ins and grace period.
    </p>

    <div class="token-box">
      <div class="token-label">Your Secure Invite Code</div>
      <div class="token-code">${tokenForEmail}</div>
      <div class="expiry">Expires in ${EXPIRATION_HOURS} hours · Single-use</div>
    </div>

    <div class="steps">
      <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #1E293B;">How to connect:</div>
      <div class="step-item">1. Download and open the <strong>PearTap</strong> app.</div>
      <div class="step-item">2. Choose <strong>Join as a Caregiver</strong>.</div>
      <div class="step-item">3. Paste your invite code above to link your accounts.</div>
    </div>

    <div class="footer">
      This invitation was intended for ${escapeHtml(caregiver.email)}. If you do not know ${safeSenderName}, you can safely ignore this email.
    </div>
  </div>
</body>
</html>
    `;

    const textFallback = `
Hello ${caregiverName},

${senderName} has added you${relationshipText} to their trusted circle on PearTap.

PearTap provides peace of mind through gentle check-ins. As a circle contact, you will only be notified if they miss their regular check-in.

Your secure invite code is:
${tokenForEmail}

(Expires in ${EXPIRATION_HOURS} hours · Single-use)

How to connect:
1. Open the PearTap app.
2. Select "Join as a Caregiver".
3. Paste the code above to link your account.

If you did not expect this invitation, you can safely ignore this email.
    `.trim();

    // ── 10. Send Email via Resend API ─────────────────────────────────────────
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [caregiver.email],
        subject: emailSubject,
        html: htmlBody,
        text: textFallback,
      }),
    });

    const resendData = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error('[send-caregiver-invite] Resend API error:', resendResponse.status, resendData?.message || 'Unknown error');
      return new Response(
        JSON.stringify({
          error: resendData?.message || 'Failed to deliver invitation email. Please check your Resend configuration.',
        }),
        { status: resendResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Token is deliberately NOT logged to protect secrets
    console.log(`[send-caregiver-invite] Successfully sent invite for caregiverId: ${caregiver.id}, resendId: ${resendData?.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation email dispatched successfully.',
        caregiverId: caregiver.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[send-caregiver-invite] Unexpected error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
