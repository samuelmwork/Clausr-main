-- ============================================================
-- CLAUSR — Full Database Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable pg_cron extension (for alert scheduling)
create extension if not exists pg_cron;
create extension if not exists "uuid-ossp";

-- ── ORGANISATIONS ────────────────────────────────────────────
create table public.organisations (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  plan         text not null default 'free' check (plan in ('free','starter','pro','team')),
  contract_limit integer not null default 5,
  razorpay_subscription_id text,
  razorpay_customer_id text,
  subscription_status text default 'inactive',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── MEMBERS ──────────────────────────────────────────────────
create table public.members (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references public.organisations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'viewer' check (role in ('admin','editor','viewer')),
  invited_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(org_id, user_id)
);

-- ── PROFILES ─────────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  avatar_url text,
  email      text,
  email_verified boolean not null default false,
  created_at timestamptz default now()
);

-- ── CONTRACTS ────────────────────────────────────────────────
create table public.contracts (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references public.organisations(id) on delete cascade,
  vendor_name     text not null,
  contract_type   text not null default 'saas' check (
    contract_type in ('saas','services','lease','nda','employment','other')
  ),
  value_annual    numeric(14,2) default 0,
  currency        text not null default 'INR',
  start_date      date,
  end_date        date not null,
  auto_renews     boolean not null default false,
  notice_days     integer default 30,
  owner_id        uuid references auth.users(id),
  status          text not null default 'active' check (
    status in ('active','expiring','expired','cancelled','renewed')
  ),
  file_url        text,
  file_name       text,
  notes           text,
  vendor_score    integer check (vendor_score between 1 and 5),
  tags            text[],
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── ALERTS ───────────────────────────────────────────────────
create table public.alerts (
  id          uuid primary key default uuid_generate_v4(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  days_before integer not null,
  scheduled_for date not null,
  sent        boolean not null default false,
  sent_at     timestamptz,
  created_at  timestamptz default now()
);

-- ── ACTIVITY LOG ─────────────────────────────────────────────
create table public.activity_log (
  id          uuid primary key default uuid_generate_v4(),
  contract_id uuid references public.contracts(id) on delete cascade,
  org_id      uuid references public.organisations(id) on delete cascade,
  user_id     uuid references auth.users(id),
  action      text not null,
  details     jsonb,
  created_at  timestamptz default now()
);

-- ── INVITATIONS ──────────────────────────────────────────────
create table public.invitations (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references public.organisations(id) on delete cascade,
  email      text not null,
  role       text not null default 'editor',
  token      text not null unique default uuid_generate_v4()::text,
  invited_by uuid references auth.users(id),
  accepted   boolean default false,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.organisations  enable row level security;
alter table public.members         enable row level security;
alter table public.profiles        enable row level security;
alter table public.contracts       enable row level security;
alter table public.alerts          enable row level security;
alter table public.activity_log    enable row level security;
alter table public.invitations     enable row level security;

-- Helper: is user a member of org?
create or replace function public.is_member(org uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.members
    where org_id = org and user_id = auth.uid()
  );
$$;

-- Helper: get user's role in org
create or replace function public.member_role(org uuid)
returns text language sql security definer as $$
  select role from public.members
  where org_id = org and user_id = auth.uid()
  limit 1;
$$;

-- ── POLICIES: profiles ────────────────────────────────────────
create policy "Users can view own or org member profiles"
  on public.profiles for select
  using (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.members AS m_self
      JOIN public.members AS m_target
        ON m_self.org_id = m_target.org_id
      WHERE m_self.user_id = auth.uid()
        AND m_target.user_id = id
    )
  );
create policy "Users can update own profile"
  on public.profiles for update using (id = auth.uid());
create policy "Users can insert own profile"
  on public.profiles for insert with check (id = auth.uid());

-- ── POLICIES: organisations ───────────────────────────────────
create policy "Members can view their org"
  on public.organisations for select
  using (public.is_member(id));
create policy "Admins can update org"
  on public.organisations for update
  using (public.member_role(id) = 'admin');

-- ── POLICIES: members ─────────────────────────────────────────
create policy "Members can view org members"
  on public.members for select
  using (public.is_member(org_id));
create policy "Admins can insert members"
  on public.members for insert
  with check (public.member_role(org_id) = 'admin');
create policy "Admins can delete members"
  on public.members for delete
  using (public.member_role(org_id) = 'admin');

-- ── POLICIES: contracts ───────────────────────────────────────
create policy "Members can view contracts"
  on public.contracts for select
  using (public.is_member(org_id));
create policy "Editors and admins can insert contracts"
  on public.contracts for insert
  with check (public.member_role(org_id) in ('admin','editor'));
create policy "Editors and admins can update contracts"
  on public.contracts for update
  using (public.member_role(org_id) in ('admin','editor'));
create policy "Admins can delete contracts"
  on public.contracts for delete
  using (public.member_role(org_id) = 'admin');

-- ── POLICIES: alerts ──────────────────────────────────────────
create policy "Members can view alerts"
  on public.alerts for select
  using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id and public.is_member(c.org_id)
    )
  );

-- ── POLICIES: activity_log ────────────────────────────────────
create policy "Members can view activity"
  on public.activity_log for select
  using (public.is_member(org_id));

-- ── POLICIES: invitations ─────────────────────────────────────
create policy "Admins can manage invitations"
  on public.invitations for all
  using (public.member_role(org_id) = 'admin');
create policy "Anyone can view invitation by token"
  on public.invitations for select
  using (true);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, email_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    new.email_confirmed_at is not null
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email_verified in sync with auth.users email confirmation.
create or replace function public.handle_auth_user_confirmed()
returns trigger language plpgsql security definer as $$
begin
  if new.email_confirmed_at is not null then
    update public.profiles
    set email_verified = true,
        email = coalesce(new.email, email)
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_auth_user_confirmed();

-- Backfill for any already-confirmed users.
update public.profiles p
set email_verified = true
from auth.users u
where p.id = u.id
  and u.email_confirmed_at is not null;

-- Auto-update contract status based on end_date
create or replace function public.update_contract_status()
returns trigger language plpgsql as $$
begin
  if new.status in ('cancelled','renewed') then
    new.updated_at = now();
    return new;
  elsif new.end_date < current_date then
    new.status = 'expired';
  elsif new.end_date <= current_date + interval '30 days' then
    new.status = 'expiring';
  else
    new.status = 'active';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create trigger contract_status_update
  before insert or update on public.contracts
  for each row execute function public.update_contract_status();

-- Auto-create alerts when contract is added
create or replace function public.create_contract_alerts()
returns trigger language plpgsql security definer as $$
declare
  alert_days int[];
  org_plan text;
  d int;
  alert_date date;
begin
  -- Fetch the plan of the organization
  select plan into org_plan from public.organisations where id = new.org_id;

  -- Set alert days based on plan
  if org_plan = 'free' then
    alert_days := array[1];
  else
    alert_days := array[90, 60, 30, 14, 7, 1];
  end if;

  -- Delete existing unsent alerts for this contract
  delete from public.alerts
  where contract_id = new.id and sent = false;

  -- Create new alerts
  if new.status not in ('cancelled', 'renewed') then
    foreach d in array alert_days loop
      alert_date := new.end_date - (d || ' days')::interval;
      if alert_date > current_date then
        insert into public.alerts (contract_id, days_before, scheduled_for)
        values (new.id, d, alert_date);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

create trigger after_contract_upsert
  after insert or update of end_date, status on public.contracts
  for each row execute function public.create_contract_alerts();

-- Check contract limit before insert
create or replace function public.check_contract_limit()
returns trigger language plpgsql as $$
declare
  current_count int;
  org_limit int;
begin
  select count(*) into current_count
  from public.contracts
  where org_id = new.org_id and status != 'cancelled';

  select contract_limit into org_limit
  from public.organisations
  where id = new.org_id;

  if current_count >= org_limit then
    raise exception 'Contract limit reached. Please upgrade your plan.';
  end if;
  return new;
end;
$$;

create trigger enforce_contract_limit
  before insert on public.contracts
  for each row execute function public.check_contract_limit();

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict do nothing;

create policy "Members can upload contract files"
  on storage.objects for insert
  with check (
    bucket_id = 'contracts'
    and auth.uid() is not null
  );

create policy "Members can view contract files"
  on storage.objects for select
  using (
    bucket_id = 'contracts'
    and auth.uid() is not null
  );

create policy "Members can delete their files"
  on storage.objects for delete
  using (
    bucket_id = 'contracts'
    and auth.uid() is not null
  );

-- ============================================================
-- CRON JOB — Daily alert checker (runs every day at 8am IST = 2:30 UTC)
-- ============================================================
select cron.schedule(
  'clausr-daily-alerts',
  '30 2 * * *',
  $$
    select net.http_post(
      url := current_setting('app.api_url') || '/api/alerts/send',
      headers := '{"Content-Type": "application/json", "x-cron-secret": "' || current_setting('app.cron_secret') || '"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index idx_contracts_org_id on public.contracts(org_id);
create index idx_contracts_end_date on public.contracts(end_date);
create index idx_contracts_status on public.contracts(status);
create index idx_members_user_id on public.members(user_id);
create index idx_members_org_id on public.members(org_id);
create unique index if not exists idx_organisations_name_unique on public.organisations(lower(name));
create unique index if not exists idx_profiles_email_unique on public.profiles(lower(email)) where email is not null;
create index idx_alerts_scheduled on public.alerts(scheduled_for) where sent = false;
create index idx_activity_org_id on public.activity_log(org_id);

-- ============================================================
-- REALTIME — Enable Realtime on organisations table
-- This allows teammates to see org name changes instantly
-- Run in Supabase SQL Editor if not already done:
-- ============================================================
alter publication supabase_realtime add table public.organisations;

