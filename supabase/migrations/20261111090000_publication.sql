-- US-16, US-17 et US-18 : enrichir une recette, la publier, et afficher sa fiche.
-- Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.

-- Enregistre l'enrichissement d'une recette (transmis par, souvenir, portions, durée,
-- tags) et, si p_publier, la publie. Tout ou rien, réservé aux contributeurs.
-- p_infos : { transmis_par, souvenir, portions, duree_minutes, type_repas_id,
--             occasions: [id…], classique }
create or replace function public.enrichir_recette(p_recette_id bigint, p_infos jsonb, p_publier boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_portions numeric := (p_infos ->> 'portions')::numeric;
  v_duree numeric := (p_infos ->> 'duree_minutes')::numeric;
begin
  if not public.est_contributeur() then
    raise exception 'réservé aux contributeurs' using errcode = '42501';
  end if;

  update public.recette
  set transmis_par = nullif(trim(p_infos ->> 'transmis_par'), ''),
      souvenir = nullif(trim(p_infos ->> 'souvenir'), ''),
      portions = case when v_portions > 0 then round(v_portions)::int end,
      duree_minutes = case when v_duree > 0 then round(v_duree)::int end,
      type_repas_id = (p_infos ->> 'type_repas_id')::bigint,
      classique = coalesce((p_infos ->> 'classique')::boolean, false),
      statut = case when p_publier then 'publiee'::public.statut_recette else statut end,
      modifie_le = now()
  where id = p_recette_id;
  if not found then
    raise exception 'recette introuvable' using errcode = 'P0002';
  end if;

  delete from public.recette_occasion where recette_id = p_recette_id;
  insert into public.recette_occasion (recette_id, occasion_id)
  select p_recette_id, o::bigint
  from jsonb_array_elements_text(coalesce(p_infos -> 'occasions', '[]'::jsonb)) as o
  on conflict do nothing;
end;
$$;

grant execute on function public.enrichir_recette(bigint, jsonb, boolean) to authenticated;

-- La fiche d'une recette publiée montre son scan d'origine (US-18) : tout membre peut
-- lire les pages liées à une recette qu'il peut voir.
create or replace function public.page_visible(id_page bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.est_contributeur()
    or exists (
      select 1
      from public.recette_page rp
      join public.recette r on r.id = rp.recette_id
      where rp.page_id = id_page and r.statut = 'publiee' and public.est_membre()
    );
$$;

drop policy if exists "pages des recettes publiées lisibles" on public.page_scannee;
create policy "pages des recettes publiées lisibles" on public.page_scannee
  for select to authenticated using (public.page_visible(id));
