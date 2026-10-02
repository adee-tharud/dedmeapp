/**
 * Messages API — CRUD for the `messages` table.
 *
 * Security Guide §5: all Supabase calls isolated here, never inline in components.
 * Security Guide §6: namespaced React Query keys.
 *
 * CRITICAL: message body is encrypted/decrypted in this module using the
 * client-side crypto layer (crypto.ts). The Supabase database NEVER receives
 * the plaintext body. See features/messages/SECURITY.md for the full design.
 */
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { encryptBody, decryptBody, isEncrypted } from './crypto';

type MessageRow    = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

// ── Query key namespace ────────────────────────────────────────────────────────
export const messageKeys = {
  all:    ['messages'] as const,
  byUser: (userId: string) => [...messageKeys.all, userId] as const,
  detail: (id: string)     => [...messageKeys.all, 'detail', id] as const,
};

// ── Types ─────────────────────────────────────────────────────────────────────

/** A decrypted message row — body is plaintext here. */
export type DecryptedMessage = Omit<MessageRow, 'body'> & { body: string };

export interface CreateMessageInput {
  userId:          string;
  recipientName:   string;
  recipientEmail:  string;
  recipientPhone?: string;
  body:            string;       // plaintext — encrypted before hitting the network
  timingType?:     string;
}

export interface UpdateMessageInput {
  recipientName?:  string;
  recipientEmail?: string;
  recipientPhone?: string;
  body?:           string;       // plaintext — encrypted before hitting the network
  timingType?:     string;
  status?:         'draft' | 'active' | 'sent';
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch all messages for the authenticated user, decrypted.
 *
 * Security:
 * - RLS ensures only the owner's rows are returned.
 * - Body is decrypted client-side; server never sees plaintext.
 * - If decryption of a single message fails (wrong key, corrupted data),
 *   that message is returned with body='[encrypted]' rather than throwing,
 *   so one bad row doesn't break the whole list.
 */
export async function fetchMessages(userId: string): Promise<DecryptedMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  // Decrypt each body. Run sequentially to avoid hammering SecureStore.
  const decrypted: DecryptedMessage[] = [];
  for (const rawRow of data) {
    const row = rawRow as MessageRow;
    let body = row.body;
    if (isEncrypted(row.body)) {
      try {
        body = await decryptBody(row.body, userId);
      } catch {
        body = '[Message could not be decrypted]';
      }
    }
    decrypted.push({ ...row, body });
  }
  return decrypted;
}

/**
 * Fetch a single message by ID, decrypted.
 */
export async function fetchMessage(id: string, userId: string): Promise<DecryptedMessage> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)   // belt-and-suspenders alongside RLS
    .single();

  if (error) throw error;

  const row = data as MessageRow;
  let body = row.body;
  if (isEncrypted(row.body)) {
    body = await decryptBody(row.body, userId);
  }
  return { ...row, body };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Create a new message. The body is encrypted before the INSERT.
 * Status defaults to 'draft'.
 */
export async function createMessage(input: CreateMessageInput): Promise<DecryptedMessage> {
  // Encrypt BEFORE the network call — plaintext never leaves the device
  const encryptedBody = await encryptBody(input.body, input.userId);

  const row: MessageInsert = {
    user_id:         input.userId,
    recipient_name:  input.recipientName.trim(),
    recipient_email: input.recipientEmail.trim().toLowerCase(),
    recipient_phone: input.recipientPhone?.trim() || null,
    body:            encryptedBody,       // ← only ciphertext hits Supabase
    timing_type:     input.timingType ?? 'full_plan',
    status:          'draft',
  };

  const { data, error } = await supabase
    .from('messages')
    .insert(row as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select()
    .single();

  if (error) throw error;
  // Return with decrypted body so callers don't have to decrypt again
  return { ...(data as MessageRow), body: input.body };
}

/**
 * Update an existing message.
 * If `body` is provided, it is re-encrypted before the UPDATE.
 * Only the owning user can update (enforced by RLS).
 */
export async function updateMessage(
  id: string,
  userId: string,
  updates: UpdateMessageInput,
): Promise<DecryptedMessage> {
  let dbUpdates: Record<string, unknown> = {
    recipient_name:  updates.recipientName?.trim(),
    recipient_email: updates.recipientEmail?.trim().toLowerCase(),
    recipient_phone: updates.recipientPhone?.trim() ?? null,
    timing_type:     updates.timingType,
    status:          updates.status,
    updated_at:      new Date().toISOString(),
  };

  // Remove undefined keys so we don't send null for fields not being updated
  dbUpdates = Object.fromEntries(
    Object.entries(dbUpdates).filter(([, v]) => v !== undefined),
  );

  if (updates.body !== undefined) {
    dbUpdates.body = await encryptBody(updates.body, userId);
  }

  const { data, error } = await supabase
    .from('messages')
    .update(dbUpdates as unknown as never)
    .eq('id', id)
    .eq('user_id', userId)   // belt-and-suspenders
    .select()
    .single();

  if (error) throw error;
  const row = data as MessageRow;

  // Return with decrypted body
  const plainBody = updates.body ?? await decryptBody(row.body, userId);
  return { ...row, body: plainBody };
}

/**
 * Soft-delete a draft message (only drafts can be deleted per the Security Guide §3).
 * Active messages cannot be deleted — they become part of the escalation record.
 */
export async function deleteMessage(id: string, userId: string): Promise<void> {
  // First verify it's still a draft
  const { data: msg, error: fetchErr } = await supabase
    .from('messages')
    .select('status')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchErr) throw fetchErr;
  const msgRow = msg as unknown as { status: string };
  if (msgRow.status !== 'draft') {
    throw new Error('Only draft messages can be deleted.');
  }

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Activate a draft message (transitions draft → active).
 * Once active it enters the escalation system.
 */
export async function activateMessage(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ status: 'active', updated_at: new Date().toISOString() } as unknown as never)
    .eq('id', id)
    .eq('user_id', userId)
    .eq('status', 'draft');   // only transition from draft

  if (error) throw error;
}
