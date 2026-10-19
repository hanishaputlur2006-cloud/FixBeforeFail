-- =====================================================================
-- FixBeforeFail: require repair evidence (phase 6 follow-up)
-- Run ONCE in Supabase: SQL Editor > New query > paste > Run.
--
-- Marking a report "resolved" now requires a photo of the finished repair.
-- This replaces update_report_status() from 005 with the extra check.
-- =====================================================================

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
  -- New in 006: a resolved report must include a photo of the finished repair.
  if p_status = 'resolved' and p_photo is null then
    raise exception 'Add a photo of the finished repair before marking it resolved';
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
