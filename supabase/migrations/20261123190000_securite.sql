-- Audit de sécurité du 23/11/2026 (docs/audit-securite.md, failles F1 à F5).
-- Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.

-- ---------------------------------------------------------------------------
-- F1 : un compte créé sans invitation devenait membre (lecteur).
-- Si l'inscription publique est restée ouverte dans Supabase (ou se rouvre par erreur),
-- n'importe qui pouvait appeler /auth/v1/signup avec la clé publique, qui est dans le code
-- de l'appli, et lire toutes les recettes. Désormais, un compte n'est accepté que s'il a
-- une invitation en cours. Seul le tout premier compte (l'administrateur, créé dans
-- Supabase avant tout membre, puis passé admin par definir-admin.sql) passe sans invitation.
-- ---------------------------------------------------------------------------
create or replace function public.creer_membre()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.role_membre;
begin
  select i.role into v_role
  from public.invitation i
  where lower(i.email) = lower(new.email) and i.acceptee_le is null
  order by i.envoyee_le desc
  limit 1;

  if v_role is null and exists (select 1 from public.membre) then
    raise exception 'Inscription réservée aux personnes invitées' using errcode = '42501';
  end if;

  insert into public.membre (id, email, prenom, nom, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'prenom',
    new.raw_user_meta_data ->> 'nom',
    coalesce(v_role, 'lecteur')
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- F2 : tout membre lisait l'e-mail et le nom de famille complet de tous les autres.
-- Seul l'administrateur en a besoin (gestion des membres, file des photos) ; chacun
-- garde l'accès à sa propre fiche.
-- ---------------------------------------------------------------------------
drop policy if exists "membres lisibles par les membres" on public.membre;
drop policy if exists "sa fiche, ou toutes pour l'admin" on public.membre;
create policy "sa fiche, ou toutes pour l'admin" on public.membre
  for select to authenticated
  using (id = auth.uid() or public.est_admin());

-- ---------------------------------------------------------------------------
-- F3 : un lecteur pouvait lister et télécharger toutes les images du bucket, dont les
-- scans des pages encore en brouillon et les photos refusées ou en attente des autres.
-- Il ne voit plus que les images que l'appli lui montre : couvertures des cahiers,
-- scans des recettes publiées, photos validées (ou les siennes), images des filtres.
-- ---------------------------------------------------------------------------
create index if not exists page_scannee_image_chemin on public.page_scannee (image_chemin);

create or replace function public.image_visible(p_chemin text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.est_contributeur()
    or (
      public.est_membre()
      and (
        p_chemin like 'filtres/%'
        or exists (select 1 from public.cahier c where c.couverture_chemin = p_chemin)
        or exists (
          select 1 from public.page_scannee p
          where p.image_chemin = p_chemin and public.page_visible(p.id)
        )
        or exists (
          select 1 from public.photo f
          where f.image_chemin = p_chemin
            and ((f.statut = 'validee' and public.recette_visible(f.recette_id)) or f.propose_par = auth.uid())
        )
      )
    );
$$;

revoke execute on function public.image_visible(text) from public, anon;
grant execute on function public.image_visible(text) to authenticated;

drop policy if exists "images lisibles par les membres" on storage.objects;
drop policy if exists "images visibles selon les droits" on storage.objects;
create policy "images visibles selon les droits" on storage.objects
  for select to authenticated
  using (bucket_id = 'images' and public.image_visible(name));

-- ---------------------------------------------------------------------------
-- F5 : un lecteur pouvait envoyer des fichiers sous photos/ pour n'importe quelle
-- recette, même un brouillon invisible ou inexistante (remplissage du stockage gratuit).
-- Le chemin doit être photos/<id d'une recette qu'il voit>/<fichier>.
-- ---------------------------------------------------------------------------
drop policy if exists "photos de plats envoyées par les membres" on storage.objects;
create policy "photos de plats envoyées par les membres" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'images'
    and public.est_membre()
    and case
      when name ~ '^photos/[0-9]{1,18}/[^/]+$' then public.recette_visible(split_part(name, '/', 2)::bigint)
      else false
    end
  );

-- ---------------------------------------------------------------------------
-- F4 : une photo proposée pouvait pointer vers n'importe quelle image (un scan de
-- cahier, une couverture). En la refusant, l'administrateur supprimait sans le savoir
-- cette image d'origine. Le chemin d'une photo doit être photos/<id de sa recette>/….
-- ---------------------------------------------------------------------------
drop policy if exists "photos proposées par les membres" on public.photo;
create policy "photos proposées par les membres" on public.photo
  for insert to authenticated
  with check (
    public.est_membre()
    and public.recette_visible(recette_id)
    and propose_par = auth.uid()
    and (statut = 'en_attente' or public.est_admin())
    and image_chemin ~ ('^photos/' || recette_id || '/[^/]+$')
  );
