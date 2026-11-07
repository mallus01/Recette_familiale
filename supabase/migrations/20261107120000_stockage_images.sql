-- US-06 · Stockage des images (couvertures de cahiers, puis pages scannées).
-- Bucket privé : les images ne sont lisibles qu'avec une session de membre,
-- via des URL signées. Chemins : cahiers/<id du cahier>/couverture.jpg,
-- cahiers/<id du cahier>/pages/<numéro>.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', false, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "images lisibles par les membres" on storage.objects
  for select to authenticated
  using (bucket_id = 'images' and public.est_membre());

create policy "images ajoutées par les contributeurs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and public.est_contributeur());

create policy "images modifiées par les contributeurs" on storage.objects
  for update to authenticated
  using (bucket_id = 'images' and public.est_contributeur())
  with check (bucket_id = 'images' and public.est_contributeur());

create policy "images supprimées par les contributeurs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images' and public.est_contributeur());
