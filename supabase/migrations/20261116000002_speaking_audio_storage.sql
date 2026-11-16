-- Private bucket for speaking recordings. Used ONLY when the learner has opted in
-- (profiles.audio_storage_opt_in). Each learner can access only their own folder: <user_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('speaking-audio', 'speaking-audio', false, 15728640, array['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav'])
on conflict (id) do nothing;

create policy "own audio read" on storage.objects for select to authenticated
  using (bucket_id = 'speaking-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own audio insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'speaking-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own audio delete" on storage.objects for delete to authenticated
  using (bucket_id = 'speaking-audio' and (storage.foldername(name))[1] = auth.uid()::text);
