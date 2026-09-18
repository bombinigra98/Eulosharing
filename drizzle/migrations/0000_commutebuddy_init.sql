-- ROLES
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admins read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ADMIN BOOTSTRAP EMAILS
create table public.admin_emails (email text primary key);
grant select on public.admin_emails to authenticated;
grant all on public.admin_emails to service_role;
alter table public.admin_emails enable row level security;
create policy "admins read admin emails" on public.admin_emails for select to authenticated using (public.has_role(auth.uid(),'admin'));
insert into public.admin_emails (email) values ('administrator@commutebuddy.app');

-- PROFILES
create table public.profiles (
  id uuid primary key,
  full_name text not null default '',
  email text not null default '',
  city text not null default '',
  province text not null default '',
  fuel_type text not null default 'benzina',
  car_model text not null default '',
  consumption_kml numeric not null default 15,
  seats integer not null default 4,
  prep_minutes integer not null default 30,
  alarm_lead_minutes integer not null default 15,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "colleagues read profiles" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "admins update profiles" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email,''), coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;

  if exists (select 1 from public.admin_emails a where lower(a.email) = lower(coalesce(new.email,''))) then
    insert into public.user_roles (user_id, role) values (new.id,'admin') on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id,'user') on conflict do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- APP SETTINGS (single row)
create table public.app_settings (
  id boolean primary key default true check (id),
  destination_name text not null default 'Sede di lavoro',
  destination_address text not null default '',
  destination_lat numeric,
  destination_lng numeric,
  default_departure_name text not null default '',
  default_departure_address text not null default '',
  default_departure_lat numeric,
  default_departure_lng numeric,
  arrival_time time not null default '09:00',
  one_way_km numeric not null default 40,
  updated_at timestamptz not null default now()
);
grant select on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "all read settings" on public.app_settings for select to authenticated using (true);
create policy "admins write settings" on public.app_settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.app_settings (id) values (true);

-- AVAILABILITY
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day date not null,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
grant select, insert, delete on public.availability to authenticated;
grant all on public.availability to service_role;
alter table public.availability enable row level security;
create policy "read availability" on public.availability for select to authenticated using (true);
create policy "insert own availability" on public.availability for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own availability" on public.availability for delete to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- SOS
create table public.sos_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day date not null,
  reason text not null default '',
  status text not null default 'aperta',
  handled_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.sos_requests to authenticated;
grant all on public.sos_requests to service_role;
alter table public.sos_requests enable row level security;
create policy "read sos" on public.sos_requests for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "insert own sos" on public.sos_requests for insert to authenticated with check (auth.uid() = user_id);
create policy "admins update sos" on public.sos_requests for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ASSIGNMENTS
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  day date not null unique,
  driver_id uuid not null,
  departure_name text not null default '',
  departure_address text not null default '',
  departure_lat numeric,
  departure_lng numeric,
  travel_minutes integer,
  departure_at timestamptz,
  arrival_at timestamptz,
  distance_km numeric,
  fuel_price numeric,
  fuel_type text,
  trip_cost numeric,
  candidates integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.assignments to authenticated;
grant all on public.assignments to service_role;
alter table public.assignments enable row level security;
create policy "all read assignments" on public.assignments for select to authenticated using (true);
create policy "admins write assignments" on public.assignments for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- PUSH SUBSCRIPTIONS
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
alter table public.push_subscriptions enable row level security;
create policy "manage own push subs" on public.push_subscriptions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- FUEL PRICE CACHE
create table public.fuel_prices (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  fuel_type text not null,
  price numeric not null,
  sample_size integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (province, fuel_type)
);
grant select on public.fuel_prices to authenticated;
grant all on public.fuel_prices to service_role;
alter table public.fuel_prices enable row level security;
create policy "all read fuel prices" on public.fuel_prices for select to authenticated using (true);

-- NOTIFICATIONS LOG
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text not null default '',
  kind text not null default 'info',
  day date,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "read own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "update own notifications" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index on public.availability (day);
create index on public.assignments (day desc);
create index on public.notifications (user_id, created_at desc);