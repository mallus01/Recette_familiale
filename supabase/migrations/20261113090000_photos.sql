-- V2 · Sprint 6 : photos proposées par les membres et validées par l'administrateur
-- (US-38 à US-40), images des valeurs de filtres (US-37).
-- Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.
--
-- Chemins dans le bucket « images » :
--   photos/<id de la recette>/<aléatoire>.jpg   photo proposée d'un plat
--   filtres/<type_repas|occasion>/<id>-<aléatoire>.jpg   image d'une valeur de filtre

create table if not exists public.photo (
  id bigint generated always as identity primary key,
  recette_id bigint not null references public.recette (id) on delete cascade,
  image_chemin text not null unique,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'validee')),
  propose_par uuid default auth.uid() references public.membre (id) on delete set null, -- null : « Ancien membre »
  proposee_le timestamptz not null default now(),
  validee_le timestamptz -- ordre de défilement des photos validées
);

create index if not exists photo_recette_idx on public.photo (recette_id, statut, validee_le);

alter table public.photo enable row level security;
grant select, insert, update, delete on public.photo to authenticated;

-- Lecture : photos validées des recettes visibles ; ses propres propositions ; tout pour l'admin.
drop policy if exists "photos lisibles" on public.photo;
create policy "photos lisibles" on public.photo
  for select to authenticated
  using (
    public.est_admin()
    or (statut = 'validee' and public.recette_visible(recette_id))
    or propose_par = auth.uid()
  );

-- Proposition : tout membre, sur une recette qu'il voit, en son nom et en attente
-- (l'administrateur peut ajouter directement une photo validée).
drop policy if exists "photos proposées par les membres" on public.photo;
create policy "photos proposées par les membres" on public.photo
  for insert to authenticated
  with check (
    public.est_membre()
    and public.recette_visible(recette_id)
    and propose_par = auth.uid()
    and (statut = 'en_attente' or public.est_admin())
  );

-- Validation et suppression : administrateur seul.
drop policy if exists "photos validées par l'admin" on public.photo;
create policy "photos validées par l'admin" on public.photo
  for update to authenticated
  using (public.est_admin()) with check (public.est_admin());

drop policy if exists "photos supprimées par l'admin" on public.photo;
create policy "photos supprimées par l'admin" on public.photo
  for delete to authenticated
  using (public.est_admin());

-- Stockage : tout membre peut envoyer une photo de plat (les contributeurs et l'admin
-- envoient déjà toutes les autres images ; la suppression reste aux contributeurs).
drop policy if exists "photos de plats envoyées par les membres" on storage.objects;
create policy "photos de plats envoyées par les membres" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and name like 'photos/%' and public.est_membre());

-- US-40 : la vignette d'une recette est sa première photo validée, sinon le haut de la
-- première page de son scan.
create or replace view public.recette_resume
with (security_invoker = true) as
select
  r.id,
  r.titre,
  r.statut,
  r.classique,
  r.type_repas_id,
  r.cree_le,
  p.cahier_id,
  p.numero as page_numero,
  coalesce(ph.image_chemin, p.image_chemin) as vignette_chemin
from public.recette r
left join lateral (
  select ps.cahier_id, ps.numero, ps.image_chemin
  from public.recette_page rp
  join public.page_scannee ps on ps.id = rp.page_id
  where rp.recette_id = r.id
  order by rp.ordre, ps.numero
  limit 1
) p on true
left join lateral (
  select f.image_chemin
  from public.photo f
  where f.recette_id = r.id and f.statut = 'validee'
  order by f.validee_le, f.id
  limit 1
) ph on true;

grant select on public.recette_resume to authenticated;
