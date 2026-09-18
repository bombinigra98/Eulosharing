create table public.alarm_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, day)
);
grant select on public.alarm_sends to authenticated;
grant all on public.alarm_sends to service_role;
alter table public.alarm_sends enable row level security;
create policy "read own alarm sends" on public.alarm_sends for select to authenticated using (auth.uid() = user_id);

alter table public.assignments add column if not exists alarm_at timestamptz;