-- =====================================================================
-- FixBeforeFail: photo storage (phase 4)
-- Run ONCE in Supabase: SQL Editor > New query > paste > Run.
-- Safe to re-run: it updates the bucket and recreates the policies.
-- =====================================================================

-- Private bucket for report photos: max 5 MB, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-images', 'report-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Remove any earlier policies on this bucket's files so only the rules below apply.
drop policy if exists "report-images: upload to own folder" on storage.objects;
drop policy if exists "report-images: view own or visible report photos" on storage.objects;
drop policy if exists "report-images: delete own uploads" on storage.objects;

-- Files are stored as <user id>/<random name>.jpg. Users may only upload into their own folder.
create policy "report-images: upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'report-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- You can view a photo if you uploaded it, or if it belongs to a report you are allowed to see
-- (the reports table's own security rules decide that).
create policy "report-images: view own or visible report photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'report-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.reports r where r.photo_path = storage.objects.name)
    )
  );

-- Lets the app clean up a photo if saving the report fails.
create policy "report-images: delete own uploads"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'report-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
