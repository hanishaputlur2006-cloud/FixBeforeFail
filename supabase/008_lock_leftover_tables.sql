-- =====================================================================
-- FixBeforeFail: lock leftover tables from earlier test setups
-- Run ONCE in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.
--
-- These tables are not used by FixBeforeFail but were readable by anyone
-- with the public key. Turning on Row Level Security with no policies makes
-- them invisible to the app's users. No data is deleted.
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array['assignments', 'categories', 'images'] loop
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = t) then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end;
$$;
