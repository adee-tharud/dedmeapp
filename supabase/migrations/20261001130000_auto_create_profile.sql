-- Trigger: auto-create a profiles row when a new auth.users row is inserted.
--
-- This is server-side and runs inside Supabase's transaction, so it can never
-- be bypassed by client code. Every new signup automatically gets a profile row,
-- which means the caregivers FK constraint will always be satisfiable.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- runs with the function owner's privileges, not the caller's
set search_path = public  -- prevents search_path injection attacks
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;  -- idempotent: safe if called twice
  return new;
end;
$$;

-- Fire after every new row in auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
