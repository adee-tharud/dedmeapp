import { create } from 'zustand';

export type SendTiming = 'full_plan' | 'longer_wait';

export interface MessageDraft {
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  body: string;
  timing: SendTiming;
  confirmed: boolean;
}

interface DraftStore extends MessageDraft {
  setRecipient: (name: string, email: string, phone: string) => void;
  setBody: (body: string) => void;
  setTiming: (timing: SendTiming) => void;
  setConfirmed: (confirmed: boolean) => void;
  reset: () => void;
}

const INITIAL: MessageDraft = {
  recipientName: '',
  recipientEmail: '',
  recipientPhone: '',
  body: '',
  timing: 'full_plan',
  confirmed: false,
};

export const useDraftStore = create<DraftStore>(set => ({
  ...INITIAL,
  setRecipient: (recipientName, recipientEmail, recipientPhone) =>
    set({ recipientName, recipientEmail, recipientPhone }),
  setBody: body => set({ body }),
  setTiming: timing => set({ timing }),
  setConfirmed: confirmed => set({ confirmed }),
  reset: () => set(INITIAL),
}));
