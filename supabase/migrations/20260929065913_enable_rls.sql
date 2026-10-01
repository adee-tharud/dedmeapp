alter table profiles enable row level security;
alter table caregivers enable row level security;
alter table check_ins enable row level security;
alter table messages enable row level security;
alter table escalation_events enable row level security;

create policy "own profile" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "own caregivers" on caregivers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own check-ins" on check_ins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own messages" on messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own escalation log" on escalation_events for select
  using (auth.uid() = user_id);