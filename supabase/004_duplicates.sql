-- =====================================================================
-- FixBeforeFail: duplicate reports (phase 5)
-- Run ONCE in Supabase: SQL Editor > New query > paste > Run.
--
-- Authorities can merge a report into an earlier report of the same issue.
-- The original keeps a count of merged reports, which the risk score uses.
-- =====================================================================

-- How many reports have been merged into this one. Maintained by a trigger, never by users.
alter table public.reports
  add column if not exists duplicate_count integer not null default 0 check (duplicate_count >= 0);


-- Keep duplicate_count correct whenever a report is merged or unmerged.
create or replace function public.refresh_duplicate_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.duplicate_of is not null then
    update public.reports
    set duplicate_count = (select count(*) from public.reports where duplicate_of = old.duplicate_of)
    where id = old.duplicate_of;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.duplicate_of is not null then
    update public.reports
    set duplicate_count = (select count(*) from public.reports where duplicate_of = new.duplicate_of)
    where id = new.duplicate_of;
  end if;

  return null;
end;
$$;

drop trigger if exists reports_refresh_duplicate_count on public.reports;
create trigger reports_refresh_duplicate_count
  after insert or update of duplicate_of or delete on public.reports
  for each row execute function public.refresh_duplicate_count();


-- Replaces the phase 3 version: same worker rules, plus merge rules.
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
    -- Workers may only change status (and its note) on their assigned reports.
    if public.app_role() = 'worker' then
      if (to_jsonb(new) - editable) <> (to_jsonb(old) - editable) then
        raise exception 'Workers can only update the status of a report';
      end if;
      if new.status not in ('under_repair', 'resolved') then
        raise exception 'Workers can only mark work as under repair or resolved';
      end if;
    end if;

    -- duplicate_count is only changed by the trigger above (which runs one level deeper).
    if pg_trigger_depth() = 1 and new.duplicate_count is distinct from old.duplicate_count then
      raise exception 'The duplicate count is calculated automatically';
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

  new.updated_at := now();
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at := now();
  end if;
  return new;
end;
$$;


-- New reports cannot claim merged reports.
drop policy if exists "reports: create as yourself" on public.reports;
create policy "reports: create as yourself"
  on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and status = 'reported'
    and assigned_to is null
    and duplicate_of is null
    and duplicate_count = 0
    and source = 'app'
  );


-- A citizen whose report was merged can still follow the original report.
-- (A function is used because a policy on reports cannot query reports directly.)
create or replace function public.is_merge_target_for_me(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reports d
    where d.duplicate_of = target and d.reporter_id = auth.uid()
  )
$$;

drop policy if exists "reports: read the report mine was merged into" on public.reports;
create policy "reports: read the report mine was merged into"
  on public.reports for select to authenticated
  using (public.is_merge_target_for_me(id));
