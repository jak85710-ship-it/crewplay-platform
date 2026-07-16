-- CrewPlay Host Freemium (FREE / PRO)
-- 請於 Supabase SQL Editor 執行

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_plan') then
    create type subscription_plan as enum ('FREE', 'PRO');
  end if;
end
$$;

alter table if exists member_profiles
  add column if not exists subscription_plan subscription_plan not null default 'FREE',
  add column if not exists monthly_leads_used integer not null default 0 check (monthly_leads_used >= 0),
  add column if not exists quota_reset_date timestamptz not null default (date_trunc('month', now()) + interval '1 month');

alter table if exists teams
  add column if not exists is_featured boolean not null default false;

create table if not exists host_leads (
  id uuid primary key default gen_random_uuid(),
  host_id text not null references member_profiles(member_key),
  team_id uuid references teams(id) on delete set null,
  player_info jsonb not null,
  is_unlocked boolean not null default false,
  unlocked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_host_leads_host_created on host_leads(host_id, created_at desc);
create index if not exists idx_host_leads_host_unlocked on host_leads(host_id, is_unlocked, created_at desc);

create table if not exists host_urgent_push_logs (
  id uuid primary key default gen_random_uuid(),
  host_id text not null references member_profiles(member_key),
  team_id uuid references teams(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_host_urgent_push_host_team_created
  on host_urgent_push_logs(host_id, team_id, created_at desc);
