-- profiles: one row per user, extends auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  check_in_frequency_days int not null default 1,
  reminder_time time not null default '20:00',
  grace_period_hours int not null default 24,
  created_at timestamptz not null default now()
);

-- caregivers: the people who get asked "is X okay?"
create table caregivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  relationship text,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  invite_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- check_ins: one row per tap of the button
create table check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now()
);

-- messages: the secret messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  recipient_name text not null,
  recipient_email text not null,
  recipient_phone text,
  body text not null,
  timing_type text not null default 'full_plan',
  status text not null default 'draft' check (status in ('draft', 'active', 'sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- escalation_events: append-only audit log, never update or delete rows
create table escalation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  stage text not null,
  created_at timestamptz not null default now()
);