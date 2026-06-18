-- Supabase Storage buckets and object policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('profile-avatars', 'profile-avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('message-attachments', 'message-attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public listing images readable" on storage.objects;
create policy "Public listing images readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'listing-images');

drop policy if exists "Authenticated users upload own listing images" on storage.objects;
create policy "Authenticated users upload own listing images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Authenticated users update own listing images" on storage.objects;
create policy "Authenticated users update own listing images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Public avatars readable" on storage.objects;
create policy "Public avatars readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'profile-avatars');

drop policy if exists "Users upload own avatars" on storage.objects;
create policy "Users upload own avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Message attachments readable by authenticated users" on storage.objects;
create policy "Message attachments readable by authenticated users"
on storage.objects for select
to authenticated
using (bucket_id = 'message-attachments');

drop policy if exists "Authenticated users upload own message attachments" on storage.objects;
create policy "Authenticated users upload own message attachments"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);
