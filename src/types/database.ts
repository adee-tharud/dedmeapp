/**
 * Database types — generated from the Supabase schema.
 *
 * Run `npx supabase gen types typescript --project-id <id> > src/types/database.ts`
 * after every migration to keep this in sync.
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
      };
      caregivers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string;
          phone: string | null;
          relationship: string | null;
          status: 'pending' | 'accepted';
          invite_token: string;
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
          created_at?: string;
        };
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
        Update: never; // append-only — no updates allowed
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
