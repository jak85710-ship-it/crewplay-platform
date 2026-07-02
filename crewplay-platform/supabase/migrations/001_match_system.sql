-- CrewPlay 1VS1 盲盒匹配、實名認證、試點場館（萬拓乒乓）
-- 請於 Supabase SQL Editor 執行

create type verification_status as enum ('none', 'pending', 'approved', 'rejected');

create type match_status as enum (
  'WAITING',
  'MATCHED',
  'CHECKED_IN',
  'COMPLETED',
  'CANCELLED'
);

create type match_ping_type as enum (
  'DEPARTED',
  'ARRIVED_COUNTER',
  'LATE_5MIN',
  'NEED_HELP'
);

create table if not exists member_profiles (
  member_key text primary key,
  credit_score integer not null default 100 check (credit_score between 0 and 100),
  no_show_count integer not null default 0 check (no_show_count >= 0),
  match_locked_until timestamptz,
  verification_status verification_status not null default 'none',
  verification_image_id text,
  verified_at timestamptz,
  verified_by_admin text,
  rejection_reason text,
  display_name text,
  email text,
  phone text,
  line_uid text,
  apple_uid text,
  updated_at timestamptz not null default now()
);

create table if not exists match_venues (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id),
  name text not null,
  address text not null,
  region text not null,
  sport_type text not null default '桌球',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 試營運：萬拓乒乓
insert into match_venues (team_id, name, address, region, sport_type, is_active)
select
  '27882505-cb9f-4dd2-8001-2f6f2fbc107b'::uuid,
  '萬拓乒乓',
  '高雄市鼓山區文忠路86號3-4F',
  '高雄市',
  '桌球',
  true
where not exists (
  select 1 from match_venues where team_id = '27882505-cb9f-4dd2-8001-2f6f2fbc107b'::uuid
);

create table if not exists match_sessions (
  id uuid primary key default gen_random_uuid(),
  sport_type text not null,
  skill_level text not null,
  venue_id uuid not null references match_venues(id),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  host_member_key text not null references member_profiles(member_key),
  guest_member_key text references member_profiles(member_key),
  status match_status not null default 'WAITING',
  matched_at timestamptz,
  checked_in_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  checkin_token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_guest_diff_host check (
    guest_member_key is null or guest_member_key <> host_member_key
  )
);

create index if not exists idx_match_waiting on match_sessions (status, sport_type, skill_level, venue_id)
  where status = 'WAITING';

create table if not exists match_pings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references match_sessions(id) on delete cascade,
  sender_member_key text not null,
  ping_type match_ping_type not null,
  created_at timestamptz not null default now()
);

create table if not exists match_reviews (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references match_sessions(id) on delete cascade,
  reviewer_member_key text not null,
  reviewee_member_key text not null,
  skill_match boolean,
  is_harassment boolean not null default false,
  is_no_show boolean not null default false,
  admin_verified boolean not null default false,
  admin_verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (match_id, reviewer_member_key)
);

create or replace function set_match_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists match_sessions_updated on match_sessions;
create trigger match_sessions_updated before update on match_sessions
  for each row execute function set_match_updated_at();
