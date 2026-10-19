-- =====================================================================
-- FixBeforeFail: confirmations, nearby check, feedback, escalation and
-- public statistics
-- Run ONCE in Supabase: SQL Editor > New query > paste > Run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- A. "I see this too": citizens confirm an existing report instead of
--    filing a duplicate. Confirmations count toward Repeat reports.
-- ---------------------------------------------------------------------
create table if not exists public.report_supports (
  report_id   uuid not null references public.reports (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (report_id, user_id)
);

alter table public.report_supports enable row level security;
revoke all on public.report_supports from anon, authenticated;

alter table public.reports
  add column if not exists support_count integer not null default 0 check (support_count >= 0);

-- Is the signed-in user following this report through a confirmation?
create or replace function public.i_support(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.report_supports s where s.report_id = target and s.user_id = auth.uid())
$$;

-- People who confirmed a report can follow it.
drop policy if exists "reports: read reports I confirmed" on public.reports;
create policy "reports: read reports I confirmed"
  on public.reports for select to authenticated
  using (public.i_support(id));


-- Open reports of the same category within 200 m. Returns only what a citizen
-- needs to recognise the problem; no names, photos or descriptions.
create or replace function public.nearby_reports(p_lat double precision, p_lng double precision, p_category text)
returns table (id uuid, ref_no bigint, title text, status text, distance_m integer, confirmations integer)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.ref_no, r.title, r.status, d.meters::integer, (1 + r.duplicate_count + r.support_count)
  from public.reports r
  cross join lateral (
    select 2 * 6371000 * asin(sqrt(
      power(sin(radians(r.latitude - p_lat) / 2), 2)
      + cos(radians(p_lat)) * cos(radians(r.latitude)) * power(sin(radians(r.longitude - p_lng) / 2), 2)
    )) as meters
  ) d
  where auth.uid() is not null
    and r.category = p_category
    and r.duplicate_of is null
    and r.status not in ('resolved', 'closed')
    and r.latitude is not null
    and r.longitude is not null
    and d.meters <= 200
  order by d.meters
  limit 5
$$;

create or replace function public.support_report(p_report uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_report public.reports%rowtype;
begin
  if v_uid is null then
    raise exception 'You must be signed in';
  end if;
  if public.app_role() <> 'citizen' then
    raise exception 'Only citizens can confirm a report';
  end if;
  select * into v_report from public.reports where id = p_report for update;
  if not found or v_report.duplicate_of is not null or v_report.status in ('resolved', 'closed') then
    raise exception 'This report is no longer open';
  end if;
  if v_report.reporter_id = v_uid then
    raise exception 'You reported this problem yourself';
  end if;

  insert into public.report_supports (report_id, user_id) values (p_report, v_uid)
  on conflict do nothing;

  perform set_config('fbf.lifecycle_rpc', 'on', true);
  update public.reports
  set support_count = (select count(*) from public.report_supports where report_id = p_report)
  where id = p_report;
  perform set_config('fbf.lifecycle_rpc', 'off', true);
end;
$$;


-- ---------------------------------------------------------------------
-- B. Citizen feedback after a repair
-- ---------------------------------------------------------------------
create table if not exists public.report_feedback (
  report_id   uuid primary key references public.reports (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text check (char_length(comment) <= 1000),
  created_at  timestamptz not null default now()
);

alter table public.report_feedback enable row level security;
revoke all on public.report_feedback from anon, authenticated;
grant select on public.report_feedback to authenticated;

drop policy if exists "report_feedback: read if report visible" on public.report_feedback;
create policy "report_feedback: read if report visible"
  on public.report_feedback for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id));

-- The reporter rates a repaired, closed report once. A rating of 1 or 2 alerts authorities.
create or replace function public.submit_feedback(p_report uuid, p_rating integer, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_report public.reports%rowtype;
  v_comment text := nullif(btrim(p_comment), '');
begin
  select * into v_report from public.reports where id = p_report;
  if not found or v_report.reporter_id is distinct from v_uid then
    raise exception 'Only the person who reported this problem can rate the repair';
  end if;
  if v_report.status <> 'closed' or v_report.resolved_at is null then
    raise exception 'You can rate the repair once the report is closed after repair';
  end if;
  if p_rating not between 1 and 5 then
    raise exception 'Choose a rating from 1 to 5';
  end if;
  if p_rating <= 2 and v_comment is null then
    raise exception 'Please tell us what is still wrong';
  end if;
  if exists (select 1 from public.report_feedback where report_id = p_report) then
    raise exception 'You have already rated this repair';
  end if;

  insert into public.report_feedback (report_id, user_id, rating, comment)
  values (p_report, v_uid, p_rating, v_comment);

  insert into public.report_events (report_id, status, note, actor_id, kind)
  values (
    p_report, v_report.status,
    'Citizen rated the repair ' || p_rating || ' out of 5' || coalesce(': ' || v_comment, '.'),
    v_uid, 'remark'
  );

  if p_rating <= 2 then
    insert into public.notifications (user_id, report_id, message)
    select p.id, p_report, 'Citizen disputes the repair of FBF-' || v_report.ref_no || ' (rated ' || p_rating || '/5)'
    from public.profiles p where p.role = 'authority';
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- C. Lifecycle: authorities may reopen a closed report that was repaired
--    (for example after a disputed repair). Replaces lifecycle_rule().
-- ---------------------------------------------------------------------
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
    ('resolved',     'under_repair', array['authority'],           true),
    ('closed',       'under_repair', array['authority'],           true)
  ) as t (from_status, to_status, roles, note_required)
  where t.from_status = p_from and t.to_status = p_to
$$;


-- ---------------------------------------------------------------------
-- D. Escalation: alert authorities about reports that are stuck.
--    Rules (checked every hour):
--      - immediate danger not verified within 24 hours
--      - any open report with no status change for 7 days
--    Each report is escalated at most once per 7 days.
-- ---------------------------------------------------------------------
alter table public.reports add column if not exists escalated_at timestamptz;

create or replace function public.escalate_stale_reports()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select rep.id, rep.ref_no, rep.title,
           case
             when rep.safety_risk = 'immediate' and rep.status = 'reported' and rep.created_at < now() - interval '24 hours'
               then 'Immediate danger not verified within 24 hours'
             else 'No progress for 7 days'
           end as reason
    from public.reports rep
    where rep.duplicate_of is null
      and rep.status not in ('resolved', 'closed')
      and (rep.escalated_at is null or rep.escalated_at < now() - interval '7 days')
      and (
        (rep.safety_risk = 'immediate' and rep.status = 'reported' and rep.created_at < now() - interval '24 hours')
        or coalesce((select max(e.created_at) from public.report_events e where e.report_id = rep.id and e.kind = 'status'),
                    rep.created_at) < now() - interval '7 days'
      )
  loop
    insert into public.notifications (user_id, report_id, message)
    select p.id, r.id, 'Escalation: FBF-' || r.ref_no || ' (' || r.title || '). ' || r.reason
    from public.profiles p where p.role = 'authority';

    perform set_config('fbf.lifecycle_rpc', 'on', true);
    update public.reports set escalated_at = now() where id = r.id;
    perform set_config('fbf.lifecycle_rpc', 'off', true);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Schedule it hourly with pg_cron (Supabase's built-in job scheduler).
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'fbf-escalate-stale-reports';
select cron.schedule('fbf-escalate-stale-reports', '0 * * * *', $$select public.escalate_stale_reports()$$);


-- ---------------------------------------------------------------------
-- E. Public statistics for the landing page. Totals only: no names,
--    titles, locations or anything that identifies a person or report.
-- ---------------------------------------------------------------------
create or replace function public.public_stats()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'reports',      (select count(*) from public.reports),
    'repaired',     (select count(*) from public.reports where duplicate_of is null and resolved_at is not null),
    'open',         (select count(*) from public.reports where duplicate_of is null and status not in ('resolved', 'closed')),
    'avg_repair_days', (
      select round(avg(extract(epoch from (resolved_at - created_at)) / 86400)::numeric, 1)
      from public.reports where duplicate_of is null and resolved_at is not null
    ),
    'avg_rating',   (select round(avg(rating)::numeric, 1) from public.report_feedback),
    'citizens',     (select count(*) from public.profiles where role = 'citizen')
  )
$$;


-- ---------------------------------------------------------------------
-- F. Notifications: also tell people who confirmed a report. Replaces 007's version.
-- ---------------------------------------------------------------------
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

  if new.status = 'reported' then
    insert into public.notifications (user_id, report_id, message)
    select p.id, r.id, 'New report ' || ref || ': ' || r.title
    from public.profiles p
    where p.role = 'authority' and p.id is distinct from new.actor_id;
    return null;
  end if;

  if r.reporter_id is not null and r.reporter_id is distinct from new.actor_id then
    insert into public.notifications (user_id, report_id, message)
    values (
      r.reporter_id, r.id,
      case
        when new.status = 'closed' and r.duplicate_of is not null
          then 'Your report ' || ref || ' was merged into an earlier report of the same problem'
        when new.status = 'closed' and r.resolved_at is not null
          then 'Your report ' || ref || ' is closed. Please rate the repair.'
        else 'Your report ' || ref || ' is now ' || label
      end
    );
  end if;

  -- People who confirmed the problem with "I see this too".
  insert into public.notifications (user_id, report_id, message)
  select s.user_id, r.id, 'A problem you confirmed, ' || ref || ', is now ' || label
  from public.report_supports s
  where s.report_id = r.id and s.user_id is distinct from new.actor_id and s.user_id is distinct from r.reporter_id;

  if r.assigned_to is not null and r.assigned_to is distinct from new.actor_id then
    if new.status = 'assigned' then
      insert into public.notifications (user_id, report_id, message)
      values (r.assigned_to, r.id, 'You have been assigned ' || ref || ': ' || r.title);
    elsif new.status in ('under_repair', 'closed') then
      insert into public.notifications (user_id, report_id, message)
      values (r.assigned_to, r.id, ref || ' is now ' || label);
    end if;
  end if;

  if new.status = 'resolved' then
    insert into public.notifications (user_id, report_id, message)
    select p.id, r.id, ref || ' was marked resolved and is waiting for your check'
    from public.profiles p
    where p.role = 'authority' and p.id is distinct from new.actor_id;
  end if;

  return null;
end;
$$;


-- ---------------------------------------------------------------------
-- Function permissions: signed-in users only, except public_stats (anyone).
-- ---------------------------------------------------------------------
revoke execute on function public.nearby_reports(double precision, double precision, text) from public, anon;
grant execute on function public.nearby_reports(double precision, double precision, text) to authenticated;
revoke execute on function public.support_report(uuid) from public, anon;
grant execute on function public.support_report(uuid) to authenticated;
revoke execute on function public.submit_feedback(uuid, integer, text) from public, anon;
grant execute on function public.submit_feedback(uuid, integer, text) to authenticated;
revoke execute on function public.escalate_stale_reports() from public, anon, authenticated;
grant execute on function public.public_stats() to anon, authenticated;
