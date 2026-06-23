-- CrewPlay platform schema (run in Supabase SQL editor)

create extension if not exists "pgcrypto";

create type team_status as enum ('published', 'hidden', 'full');
create type booking_status as enum ('pending_payment', 'paid', 'cancelled', 'refunded');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  sheet_row integer unique not null,
  sport text not null default '',
  arena_name text not null default '',
  introduce text not null default '',
  photo text not null default '',
  assign_url text not null default '',
  region text not null default '',
  location text not null default '',
  fee_amount integer,
  fee_label text not null default '',
  status team_status not null default 'published',
  published_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_teams_sport on teams(sport);
create index if not exists idx_teams_region on teams(region);
create index if not exists idx_teams_status on teams(status);
create index if not exists idx_teams_arena_name on teams using gin (to_tsvector('simple', arena_name));

create table if not exists team_contacts (
  team_id uuid primary key references teams(id) on delete cascade,
  contact text not null default '',
  extra_notes text not null default '',
  raw_text text not null default '',
  updated_at timestamptz default now()
);

create table if not exists users_profile (
  id uuid primary key,
  line_user_id text unique,
  display_name text not null default '',
  email text not null default '',
  phone text not null default '',
  created_at timestamptz default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete restrict,
  user_id uuid references users_profile(id) on delete set null,
  guest_name text not null default '',
  guest_phone text not null default '',
  guest_email text not null default '',
  slots integer not null default 1 check (slots > 0 and slots <= 20),
  amount integer not null default 0,
  status booking_status not null default 'pending_payment',
  payment_provider text not null default '',
  merchant_trade_no text unique,
  note text not null default '',
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_bookings_team on bookings(team_id);
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_bookings_trade_no on bookings(merchant_trade_no);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  provider text not null default 'ecpay',
  merchant_trade_no text not null,
  trade_no text not null default '',
  amount integer not null default 0,
  status payment_status not null default 'pending',
  raw_payload jsonb not null default '{}',
  paid_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_payments_booking on payments(booking_id);

-- Public read for published teams
alter table teams enable row level security;
create policy "teams_public_read" on teams for select using (status = 'published');

alter table team_contacts enable row level security;
-- no public policy on team_contacts (service role only)

alter table bookings enable row level security;
create policy "bookings_own_read" on bookings for select using (true);

-- updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger teams_updated before update on teams
  for each row execute function set_updated_at();

create trigger bookings_updated before update on bookings
  for each row execute function set_updated_at();
