-- =====================================================================
-- FixBeforeFail: report lifecycle (phase 6)
-- Run ONCE in Supabase: SQL Editor > New query > paste > Run.
--
-- All status changes now go through one database function,
-- update_report_status(), which checks the rules below. Remarks and repair
-- evidence go through add_report_remark().
--
--   From          To            Who                  Reason required
--   reported      verified      authority            no
--   reported      closed        authority            yes (rejection)
--   verified      assigned      authority            no (worker required)
--   verified      closed        authority            yes
--   assigned      under_repair  authority, worker    no
--   assigned      closed        authority            yes
--   under_repair  resolved      authority, worker    yes (work done)
--   under_repair  closed        authority            yes
--   resolved      closed        authority            no (fix confirmed)
--   resolved      under_repair  authority            yes (rework needed)
-- =====================================================================


-- History entries can now be remarks (not only status changes) and carry a photo.
alter table public.report_events
  add column if not exists kind text not null default 'status' check (kind in ('status', 'remark')),
  add column if not exists photo_path text;


-- The rules table above, as a function both the database and documentation share.
create or replace function public.lifecycle_rule(p_from text, p_to text, out allowed_roles text[], out note_required boolean)
language sql
immutable
set search_path = ''
as $$
  select t.roles, t.note_required
  from (values
    ('reported',     'verified',     array['authority'],           false),
    ('reported',     'closed',       array['authority'],           true),
    ('verified',     'assigned',     array['authority'],           false),
    ('verified',     'closed',       array['authority'],           true),
    ('assigned',     'under_repair', array['authority', 'worker'], false),
    ('assigned',     'closed',       array['authority'],           true),
    ('under_repair', 'resolved',     array['authority', 'worker'], true),
    ('under_repair', 'closed',       array['authority'],           true),
    ('resolved',     'closed',       array['authority'],           false),
    ('resolved',     'under_repair', array['authority'],           true)
  ) as t (from_status, to_status, roles, note_required)
  where t.from_status = p_from and t.to_status = p_to
$$;


-- Replaces the earlier version. Adds: status changes only via update_report_status()
-- (or when merging a duplicate), stale notes are cleared, and resolved_at resets on reopen.
create or replace function public.guard_report_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  editable constant text[] := array['status', 'status_note', 'updated_at', 'resolved_at'];
begin
  if auth.uid() is not null then
    if public.app_role() = 'worker' then
      if (to_jsonb(new) - editable) <> (to_jsonb(old) - editable) then
        raise exception 'Workers can only update the status of a report';
      end if;
      if new.status is distinct from old.status and new.status not in ('under_repair', 'resolved') then
        raise exception 'Workers can only mark work as under repair or resolved';
      end if;
    end if;

    if pg_trigger_depth() = 1 and new.duplicate_count is distinct from old.duplicate_count then
      raise exception 'The duplicate count is calculated automatically';
    end if;

    if new.status is distinct from old.status
       and coalesce(current_setting('fbf.lifecycle_rpc', true), '') <> 'on'
       and not (new.duplicate_of is not null and old.duplicate_of is null and new.status = 'closed') then
      raise exception 'Status changes must be made through the report actions';
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


-- The single entry point for moving a report through its lifecycle.
create or replace function public.update_report_status(
  p_report   uuid,
  p_status   text,
  p_note     text default null,
  p_photo    text default null,
  p_assignee uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_role   text := public.app_role();
  v_report public.reports%rowtype;
  v_rule   record;
  v_note   text := nullif(btrim(p_note), '');
  v_worker text;
begin
  if v_uid is null then
    raise exception 'You must be signed in';
  end if;

  select * into v_report from public.reports where id = p_report for update;
  if not found then
    raise exception 'Report not found';
  end if;
  if v_role = 'worker' and v_report.assigned_to is distinct from v_uid then
    raise exception 'This report is not assigned to you';
  end if;
  if v_role not in ('authority', 'worker') then
    raise exception 'Only authorities and maintenance workers can update reports';
  end if;
  if v_report.duplicate_of is not null then
    raise exception 'This report was merged into another report';
  end if;

  select * into v_rule from public.lifecycle_rule(v_report.status, p_status);
  if v_rule.allowed_roles is null then
    raise exception 'A report cannot move from % to %', v_report.status, p_status;
  end if;
  if not (v_role = any (v_rule.allowed_roles)) then
    raise exception 'Your role cannot make this change';
  end if;
  if v_rule.note_required and v_note is null then
    raise exception 'Please add a note explaining this change';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'Notes can be at most 1000 characters';
  end if;
  if p_photo is not null and (storage.foldername(p_photo))[1] is distinct from v_uid::text then
    raise exception 'Evidence photos must be your own uploads';
  end if;

  if p_status = 'assigned' then
    select full_name into v_worker from public.profiles where id = p_assignee and role = 'worker';
    if not found then
      raise exception 'Choose a maintenance worker to assign';
    end if;
    v_note := coalesce(v_note, 'Assigned to ' || coalesce(nullif(v_worker, ''), 'maintenance crew') || '.');
  end if;

  perform set_config('fbf.lifecycle_rpc', 'on', true);
  update public.reports
  set status      = p_status,
      status_note = v_note,
      assigned_to = case when p_status = 'assigned' then p_assignee else assigned_to end
  where id = p_report;
  perform set_config('fbf.lifecycle_rpc', 'off', true);

  -- Attach the evidence photo to the history entry the trigger just wrote.
  if p_photo is not null then
    update public.report_events
    set photo_path = p_photo
    where id = (select max(id) from public.report_events where report_id = p_report);
  end if;
end;
$$;


-- Remarks and progress photos that do not change the status.
create or replace function public.add_report_remark(p_report uuid, p_note text, p_photo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_role   text := public.app_role();
  v_report public.reports%rowtype;
  v_note   text := nullif(btrim(p_note), '');
begin
  if v_uid is null then
    raise exception 'You must be signed in';
  end if;

  select * into v_report from public.reports where id = p_report;
  if not found then
    raise exception 'Report not found';
  end if;
  if not (v_role = 'authority' or (v_role = 'worker' and v_report.assigned_to = v_uid)) then
    raise exception 'Only authorities and the assigned worker can add remarks';
  end if;
  if v_note is null and p_photo is null then
    raise exception 'Write a remark or add a photo';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'Remarks can be at most 1000 characters';
  end if;
  if p_photo is not null and (storage.foldername(p_photo))[1] is distinct from v_uid::text then
    raise exception 'Photos must be your own uploads';
  end if;

  insert into public.report_events (report_id, status, note, actor_id, kind, photo_path)
  values (p_report, v_report.status, v_note, v_uid, 'remark', p_photo);
end;
$$;


-- Only signed-in users may call these; the functions check roles themselves.
revoke execute on function public.update_report_status(uuid, text, text, text, uuid) from public, anon;
grant execute on function public.update_report_status(uuid, text, text, text, uuid) to authenticated;
revoke execute on function public.add_report_remark(uuid, text, text) from public, anon;
grant execute on function public.add_report_remark(uuid, text, text) to authenticated;


-- Workers no longer edit reports directly; they use the functions above.
drop policy if exists "reports: workers update assigned" on public.reports;


-- Photos attached to history entries (repair evidence) are visible to anyone who can see the report.
drop policy if exists "report-images: view own or visible report photos" on storage.objects;
create policy "report-images: view own or visible report photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'report-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.reports r where r.photo_path = storage.objects.name)
      or exists (select 1 from public.report_events e where e.photo_path = storage.objects.name)
    )
  );
