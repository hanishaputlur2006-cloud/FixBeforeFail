-- =====================================================================
-- FixBeforeFail: notifications and security hardening (phase 7)
-- Run ONCE in Supabase: SQL Editor > New query > paste > Run.
--
-- 1. In-app notifications, created automatically from report history.
-- 2. Authorities can no longer edit report fields directly; everything except
--    merging duplicates goes through the lifecycle functions.
-- 3. Length limit on profile names.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Notifications
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  report_id   uuid references public.reports (id) on delete cascade,
  message     text not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon;

-- Users only see their own notifications, and may only change read_at.
drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications: mark own as read" on public.notifications;
create policy "notifications: mark own as read"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke insert, update, delete on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;


-- Turns each new history entry into notifications for the people involved.
-- The person who made the change is never notified about their own action.
create or replace function public.notify_on_report_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r     public.reports%rowtype;
  ref   text;
  label text;
begin
  select * into r from public.reports where id = new.report_id;
  if not found then
    return null;
  end if;

  ref := 'FBF-' || r.ref_no;
  label := case new.status
    when 'reported' then 'reported'
    when 'verified' then 'verified'
    when 'assigned' then 'assigned to a maintenance crew'
    when 'under_repair' then 'under repair'
    when 'resolved' then 'resolved'
    when 'closed' then 'closed'
    else new.status
  end;

  if new.kind = 'remark' then
    insert into public.notifications (user_id, report_id, message)
    select distinct u, r.id, 'New update on ' || ref || ': ' || r.title
    from unnest(array[r.reporter_id, r.assigned_to]) as u
    where u is not null and u is distinct from new.actor_id;
    return null;
  end if;

  -- New report: tell every authority.
  if new.status = 'reported' then
    insert into public.notifications (user_id, report_id, message)
    select p.id, r.id, 'New report ' || ref || ': ' || r.title
    from public.profiles p
    where p.role = 'authority' and p.id is distinct from new.actor_id;
    return null;
  end if;

  -- The reporter hears about every change to their report.
  if r.reporter_id is not null and r.reporter_id is distinct from new.actor_id then
    insert into public.notifications (user_id, report_id, message)
    values (
      r.reporter_id,
      r.id,
      case
        when new.status = 'closed' and r.duplicate_of is not null
          then 'Your report ' || ref || ' was merged into an earlier report of the same problem'
        else 'Your report ' || ref || ' is now ' || label
      end
    );
  end if;

  -- The worker hears about new assignments and changes made by others.
  if r.assigned_to is not null and r.assigned_to is distinct from new.actor_id then
    if new.status = 'assigned' then
      insert into public.notifications (user_id, report_id, message)
      values (r.assigned_to, r.id, 'You have been assigned ' || ref || ': ' || r.title);
    elsif new.status in ('under_repair', 'closed') then
      insert into public.notifications (user_id, report_id, message)
      values (r.assigned_to, r.id, ref || ' is now ' || label);
    end if;
  end if;

  -- Authorities check every resolved repair.
  if new.status = 'resolved' then
    insert into public.notifications (user_id, report_id, message)
    select p.id, r.id, ref || ' was marked resolved and is waiting for your check'
    from public.profiles p
    where p.role = 'authority' and p.id is distinct from new.actor_id;
  end if;

  return null;
end;
$$;

drop trigger if exists report_events_notify on public.report_events;
create trigger report_events_notify
  after insert on public.report_events
  for each row execute function public.notify_on_report_event();

-- Live updates: the app is told instantly when a notification arrives.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- 2. Hardening: replaces guard_report_update() from 005.
--    New: outside the lifecycle functions, authorities may only merge duplicates.
-- ---------------------------------------------------------------------
create or replace function public.guard_report_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker_editable constant text[] := array['status', 'status_note', 'updated_at', 'resolved_at'];
  merge_editable  constant text[] := array['duplicate_of', 'status', 'status_note', 'updated_at', 'resolved_at'];
  via_rpc boolean := coalesce(current_setting('fbf.lifecycle_rpc', true), '') = 'on';
begin
  if auth.uid() is not null then
    if public.app_role() = 'worker' then
      if (to_jsonb(new) - worker_editable) <> (to_jsonb(old) - worker_editable) then
        raise exception 'Workers can only update the status of a report';
      end if;
      if new.status is distinct from old.status and new.status not in ('under_repair', 'resolved') then
        raise exception 'Workers can only mark work as under repair or resolved';
      end if;
    end if;

    if pg_trigger_depth() = 1 and not via_rpc then
      -- Direct edits (not through the lifecycle functions) may only merge a duplicate.
      if (to_jsonb(new) - merge_editable) <> (to_jsonb(old) - merge_editable) then
        raise exception 'Reports can only be changed through the report actions';
      end if;
      if new.status is distinct from old.status
         and not (new.duplicate_of is not null and old.duplicate_of is null and new.status = 'closed') then
        raise exception 'Status changes must be made through the report actions';
      end if;
    end if;
  end if;

  -- Merge rules: no self-merges, no chains of duplicates.
  if new.duplicate_of is not null and new.duplicate_of is distinct from old.duplicate_of then
    if new.duplicate_of = new.id then
      raise exception 'A report cannot be merged into itself';
    end if;
    if exists (select 1 from public.reports t where t.id = new.duplicate_of and t.duplicate_of is not null) then
      raise exception 'That report is itself a duplicate. Merge into the original report instead.';
    end if;
    if exists (select 1 from public.reports c where c.duplicate_of = new.id) then
      raise exception 'Other reports are merged into this one, so it cannot be merged elsewhere';
    end if;
  end if;

  -- A status change without a new note must not reuse the previous note.
  if new.status is distinct from old.status and new.status_note is not distinct from old.status_note then
    new.status_note := null;
  end if;

  new.updated_at := now();
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at := now();
  elsif new.status not in ('resolved', 'closed') then
    new.resolved_at := null;
  end if;
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 3. Profile names: keep them a sensible length.
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_full_name_length;
alter table public.profiles add constraint profiles_full_name_length check (char_length(full_name) <= 100);
