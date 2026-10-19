-- =====================================================================
-- FixBeforeFail: initial database schema (phase 3)
--
-- Run ONCE in Supabase: Dashboard > SQL Editor > New query > paste > Run.
--
-- What it does:
--   1. Removes the earlier test tables (public.users, public.reports).
--   2. Creates profiles, reports and report_events.
--   3. Turns on Row Level Security so each role only sees what it should.
--   4. Adds triggers that create profiles, log status history and stop
--      workers from editing anything except a report's status.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Remove earlier test tables
--    public.users stored password hashes and was readable with the public
--    key. Supabase Auth replaces it, so passwords are never stored by us.
-- ---------------------------------------------------------------------
drop table if exists public.reports cascade;
drop table if exists public.users cascade;


-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------

-- One profile per signed-up user (auth.users holds email and password).
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'citizen'
              check (role in ('citizen', 'authority', 'worker')),
  created_at  timestamptz not null default now()
);

create table public.reports (
  id             uuid primary key default gen_random_uuid(),
  -- Human-friendly number shown in the app as FBF-1001, FBF-1002, ...
  ref_no         bigint generated always as identity (start with 1001) unique,
  reporter_id    uuid references public.profiles (id) on delete set null default auth.uid(),

  title          text not null check (char_length(title) between 5 and 120),
  description    text not null default '' check (char_length(description) <= 2000),
  category       text not null
                 check (category in ('streetlights', 'roads', 'water', 'pathways', 'facilities', 'equipment')),
  severity       text check (severity in ('minor', 'moderate', 'major', 'critical')),
  safety_risk    text check (safety_risk in ('none', 'possible', 'immediate')),

  location_text  text not null check (char_length(location_text) between 3 and 200),
  location_type  text check (location_type in
                 ('school', 'hospital', 'main_road', 'transit', 'market', 'residential', 'park', 'other')),
  latitude       double precision check (latitude between -90 and 90),
  longitude      double precision check (longitude between -180 and 180),
  photo_path     text,

  status         text not null default 'reported'
                 check (status in ('reported', 'verified', 'assigned', 'under_repair', 'resolved', 'closed')),
  -- Optional note saved with the latest status change (copied into report_events).
  status_note    text check (char_length(status_note) <= 1000),
  assigned_to    uuid references public.profiles (id) on delete set null,
  duplicate_of   uuid references public.reports (id) on delete set null,
  -- 'app' for reports made in FixBeforeFail, 'open_data' for imported public datasets.
  source         text not null default 'app' check (source in ('app', 'open_data')),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  resolved_at    timestamptz
);

create index reports_reporter_idx on public.reports (reporter_id);
create index reports_assigned_idx on public.reports (assigned_to);
create index reports_status_idx on public.reports (status);

-- Audit trail: one row per status change, never edited or deleted by users.
create table public.report_events (
  id          bigint generated always as identity primary key,
  report_id   uuid not null references public.reports (id) on delete cascade,
  status      text not null,
  note        text,
  actor_id    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index report_events_report_idx on public.report_events (report_id);


-- ---------------------------------------------------------------------
-- 3. Helper: the signed-in user's role
--    "security definer" lets it read profiles without triggering the
--    profiles security rules again (which would loop forever).
-- ---------------------------------------------------------------------
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;


-- ---------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------

-- Create a citizen profile automatically when someone signs up.
-- The role is ALWAYS citizen here; sign-up data cannot choose a role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their own name, but never their own role.
-- (Changes made in the SQL Editor have no signed-in user, so admins can still set roles.)
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'Roles can only be changed by an administrator';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Keep timestamps correct and limit what workers can change.
create or replace function public.guard_report_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  editable constant text[] := array['status', 'status_note', 'updated_at', 'resolved_at'];
begin
  if auth.uid() is not null and public.app_role() = 'worker' then
    if (to_jsonb(new) - editable) <> (to_jsonb(old) - editable) then
      raise exception 'Workers can only update the status of a report';
    end if;
    if new.status not in ('under_repair', 'resolved') then
      raise exception 'Workers can only mark work as under repair or resolved';
    end if;
  end if;

  new.updated_at := now();
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at := now();
  end if;
  return new;
end;
$$;

create trigger reports_guard_update
  before update on public.reports
  for each row execute function public.guard_report_update();

-- Record every new report and every status change in report_events.
create or replace function public.log_report_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.report_events (report_id, status, note, actor_id)
    values (new.id, new.status, new.status_note, auth.uid());
  end if;
  return new;
end;
$$;

create trigger reports_log_event
  after insert or update on public.reports
  for each row execute function public.log_report_event();


-- ---------------------------------------------------------------------
-- 5. Row Level Security
--    With RLS on, a table returns NOTHING unless a policy below allows it.
--    Logged-out visitors (the "anon" role) get no access at all.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.report_events enable row level security;

revoke all on public.profiles, public.reports, public.report_events from anon;

-- Profiles: you see yourself and staff; authorities see everyone.
create policy "profiles: read own, staff, or all if authority"
  on public.profiles for select to authenticated
  using (id = auth.uid() or role in ('authority', 'worker') or public.app_role() = 'authority');

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Reports: citizens see their own, workers see assigned jobs, authorities see all.
create policy "reports: read own, assigned, or all if authority"
  on public.reports for select to authenticated
  using (
    reporter_id = auth.uid()
    or public.app_role() = 'authority'
    or (public.app_role() = 'worker' and assigned_to = auth.uid())
  );

-- Anyone signed in can submit a report, but only as a fresh, unassigned report.
create policy "reports: create as yourself"
  on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and status = 'reported'
    and assigned_to is null
    and duplicate_of is null
    and source = 'app'
  );

create policy "reports: authorities update any"
  on public.reports for update to authenticated
  using (public.app_role() = 'authority')
  with check (public.app_role() = 'authority');

create policy "reports: workers update assigned"
  on public.reports for update to authenticated
  using (public.app_role() = 'worker' and assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

-- History is visible to anyone who can see the report it belongs to.
create policy "report_events: read if report visible"
  on public.report_events for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id));

-- No delete policies: reports and history are never deleted from the app.
