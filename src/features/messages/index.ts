// Messages feature — barrel export
// Consumers: import { useMessages, useCreateMessage, useDraftStore } from '@/features/messages'

// Service (for callers outside React components)
export {
  fetchMessages,
  fetchMessage,
  createMessage,
  updateMessage,
  deleteMessage,
  activateMessage,
  messageKeys,
} from './messages.service';
export type {
  DecryptedMessage,
  CreateMessageInput,
  UpdateMessageInput,
} from './messages.service';

// Hooks (preferred for React components)
export {
  useMessages,
  useMessage,
  useCreateMessage,
  useUpdateMessage,
  useDeleteMessage,
  useActivateMessage,
} from './messages.hooks';

// Draft store
export { useDraftStore } from './messages.draft.store';
export type { MessageDraft, SendTiming } from './messages.draft.store';

// Crypto utilities (exported selectively — handle with care)
export { isEncrypted, deleteKey } from './messages.crypto';
