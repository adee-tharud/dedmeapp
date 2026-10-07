/**
 * Messages hooks — React Query wrappers over messages.service.ts.
 *
 * Screens import these hooks; they never call service functions directly.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMessages,
  fetchMessage,
  createMessage,
  updateMessage,
  deleteMessage,
  activateMessage,
  messageKeys,
} from './messages.service';
import type { CreateMessageInput, UpdateMessageInput } from './messages.service';

export { messageKeys };

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetches all messages for the current user, decrypted client-side.
 */
export function useMessages(userId: string) {
  return useQuery({
    queryKey: messageKeys.byUser(userId),
    queryFn: () => fetchMessages(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetches a single message by ID, decrypted.
 */
export function useMessage(id: string, userId: string) {
  return useQuery({
    queryKey: messageKeys.detail(id),
    queryFn: () => fetchMessage(id, userId),
    enabled: !!id && !!userId,
    staleTime: 60 * 1000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateMessage(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMessageInput) => createMessage(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageKeys.byUser(userId) });
    },
  });
}

export function useUpdateMessage(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateMessageInput }) =>
      updateMessage(id, userId, updates),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: messageKeys.byUser(userId) });
      qc.invalidateQueries({ queryKey: messageKeys.detail(data.id) });
    },
  });
}

export function useDeleteMessage(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMessage(id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageKeys.byUser(userId) });
    },
  });
}

export function useActivateMessage(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateMessage(id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageKeys.byUser(userId) });
    },
  });
}
