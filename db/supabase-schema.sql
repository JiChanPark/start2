create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "public_read_app_state" on public.app_state;
drop policy if exists "public_write_app_state" on public.app_state;
drop policy if exists "public_update_app_state" on public.app_state;

create policy "public_read_app_state"
on public.app_state
for select
to anon
using (true);

create policy "public_write_app_state"
on public.app_state
for insert
to anon
with check (true);

create policy "public_update_app_state"
on public.app_state
for update
to anon
using (true)
with check (true);
