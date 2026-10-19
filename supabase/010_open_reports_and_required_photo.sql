-- =====================================================================
-- FixBeforeFail: everyone can see all reports; photos are required
-- Run ONCE in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.
-- =====================================================================


-- 1. Every signed-in user can see every report (and, through the existing
--    rules, its history, photos and rating). Reporters' names stay private:
--    citizens can still only read their own profile and staff profiles.
drop policy if exists "reports: signed-in users read all" on public.reports;
create policy "reports: signed-in users read all"
  on public.reports for select to authenticated
  using (true);


-- 2. New reports must include a photo, uploaded into the reporter's own folder.
--    Replaces the version from 004.
drop policy if exists "reports: create as yourself" on public.reports;
create policy "reports: create as yourself"
  on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and status = 'reported'
    and assigned_to is null
    and duplicate_of is null
    and duplicate_count = 0
    and support_count = 0
    and source = 'app'
    and photo_path is not null
    and photo_path like auth.uid()::text || '/%'
  );


-- 3. Users can see which reports they confirmed with "I see this too".
grant select on public.report_supports to authenticated;
drop policy if exists "report_supports: read own" on public.report_supports;
create policy "report_supports: read own"
  on public.report_supports for select to authenticated
  using (user_id = auth.uid());
