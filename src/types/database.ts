/**
 * Database types — manually maintained in sync with Supabase migrations.
 *
 * Last updated: migration 20261016100000_caregiver_confirmations
 *
 * Sync command: `npx supabase gen types typescript --project-id <id> > src/types/database.ts`
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          check_in_frequency_days: number;
          reminder_time: string;
          grace_period_hours: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          check_in_frequency_days?: number;
          reminder_time?: string;
          grace_period_hours?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          check_in_frequency_days?: number;
          reminder_time?: string;
          grace_period_hours?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      caregivers: {
        Row: {
          id: string;
          user_id: string;              // the monitored person's auth.uid
          name: string;
          email: string;
          phone: string | null;
          relationship: string | null;
          status: 'pending' | 'accepted';
          invite_token: string;
          /** 72-hour expiration window for the invite token */
          invite_expires_at: string | null;
          /** Timestamp when an invite email was last dispatched (for rate limiting) */
          last_invite_sent_at: string | null;
          /** null until the caregiver signs up and redeems the invite */
          caregiver_user_id: string | null;
          /** null while status is 'pending' */
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email: string;
          phone?: string | null;
          relationship?: string | null;
          status?: 'pending' | 'accepted';
          invite_token?: string;
          invite_expires_at?: string | null;
          last_invite_sent_at?: string | null;
          caregiver_user_id?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          relationship?: string | null;
          status?: 'pending' | 'accepted';
          invite_token?: string;
          invite_expires_at?: string | null;
          last_invite_sent_at?: string | null;
          /** Set when a caregiver redeems their invite token */
          caregiver_user_id?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      check_ins: {
        Row: {
          id: string;
          user_id: string;
          checked_in_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          checked_in_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          checked_in_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          user_id: string;
          recipient_name: string;
          recipient_email: string;
          recipient_phone: string | null;
          body: string;
          timing_type: string;
          status: 'draft' | 'active' | 'sent';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipient_name: string;
          recipient_email: string;
          recipient_phone?: string | null;
          body: string;
          timing_type?: string;
          status?: 'draft' | 'active' | 'sent';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recipient_name?: string;
          recipient_email?: string;
          recipient_phone?: string | null;
          body?: string;
          timing_type?: string;
          status?: 'draft' | 'active' | 'sent';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      escalation_events: {
        Row: {
          id: string;
          user_id: string;
          stage: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stage: string;
          created_at?: string;
        };
        Update: Record<string, never>; // append-only — no updates allowed
        Relationships: [];
      };
      push_tokens: {
        Row: {
          id: string;
          /** The user whose device holds this token (monitored person OR caregiver) */
          user_id: string;
          token: string;
          platform: 'ios' | 'android';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: 'ios' | 'android';
          created_at?: string;
        };
        /** Tokens are replaced (delete + insert), never mutated in place */
        Update: Record<string, never>;
        Relationships: [];
      };
      caregiver_confirmations: {
        Row: {
          id: string;
          monitored_user_id: string;
          caregiver_user_id: string;
          escalation_event_id: string | null;
          /** 'pending' | 'person_okay' | 'person_not_okay' */
          status: 'pending' | 'person_okay' | 'person_not_okay';
          responded_at: string | null;
          /** ISO timestamp after which messages auto-deliver if still pending */
          deadline_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          monitored_user_id: string;
          caregiver_user_id: string;
          escalation_event_id?: string | null;
          status?: 'pending' | 'person_okay' | 'person_not_okay';
          responded_at?: string | null;
          deadline_at: string;
          created_at?: string;
        };
        Update: {
          status?: 'pending' | 'person_okay' | 'person_not_okay';
          responded_at?: string | null;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
