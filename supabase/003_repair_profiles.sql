-- =====================================================================
-- FixBeforeFail: repair accounts that have no profile
-- Safe to run any time; it only adds what is missing.
--
-- Creates a citizen profile for every login account (auth.users) that has none,
-- then lists all accounts so you can check names and roles.
-- =====================================================================

insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

select u.email, p.full_name, p.role, u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;
