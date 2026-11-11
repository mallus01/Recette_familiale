-- V2 · Sprint 7 : séparer et fusionner des recettes en relecture (US-41 à US-43).
-- Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.

-- US-43 : « Séparer ». La recette garde le début (p_avant) ; la suite (p_apres) devient
-- une nouvelle recette en brouillon, liée aux mêmes pages. Les deux contenus sont au
-- format de la relecture. Renvoie l'identifiant de la nouvelle recette.
create or replace function public.separer_recette(p_recette_id bigint, p_avant jsonb, p_apres jsonb)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_nouvelle bigint;
begin
  if not public.est_contributeur() then
    raise exception 'réservé aux contributeurs' using errcode = '42501';
  end if;

  perform public.enregistrer_relecture(p_recette_id, p_avant);

  insert into public.recette (titre, cree_par)
  values (coalesce(nullif(trim(p_apres ->> 'titre'), ''), 'Recette sans titre'), auth.uid())
  returning id into v_nouvelle;

  insert into public.recette_page (recette_id, page_id, ordre)
  select v_nouvelle, rp.page_id, rp.ordre
  from public.recette_page rp
  where rp.recette_id = p_recette_id;

  perform public.remplir_recette(v_nouvelle, p_apres);
  return v_nouvelle;
end;
$$;

-- US-42 et US-43 : « Fusionner avec la page suivante ». Le contenu de p_suivante_id
-- (ingrédients, étapes, notes, photos, scans) passe à la suite de p_recette_id, puis
-- p_suivante_id est supprimée. Les scans restent dans l'ordre des pages.
create or replace function public.fusionner_recettes(p_recette_id bigint, p_suivante_id bigint)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_groupes int;
  v_etapes int;
  v_pages int;
begin
  if not public.est_contributeur() then
    raise exception 'réservé aux contributeurs' using errcode = '42501';
  end if;
  if p_recette_id = p_suivante_id then
    raise exception 'une recette ne se fusionne pas avec elle-même' using errcode = '22023';
  end if;
  if (select count(*) from public.recette where id in (p_recette_id, p_suivante_id)) <> 2 then
    raise exception 'recette introuvable' using errcode = 'P0002';
  end if;

  select coalesce(max(ordre), 0) into v_groupes from public.groupe_ingredients where recette_id = p_recette_id;
  select coalesce(max(ordre), 0) into v_etapes from public.etape where recette_id = p_recette_id;
  select coalesce(max(ordre), 0) into v_pages from public.recette_page where recette_id = p_recette_id;

  update public.groupe_ingredients set recette_id = p_recette_id, ordre = ordre + v_groupes
  where recette_id = p_suivante_id;
  update public.etape set recette_id = p_recette_id, ordre = ordre + v_etapes
  where recette_id = p_suivante_id;
  update public.note set recette_id = p_recette_id where recette_id = p_suivante_id;
  update public.photo set recette_id = p_recette_id where recette_id = p_suivante_id;

  insert into public.recette_page (recette_id, page_id, ordre)
  select p_recette_id, rp.page_id, rp.ordre + v_pages
  from public.recette_page rp
  where rp.recette_id = p_suivante_id
  on conflict (recette_id, page_id) do nothing;

  delete from public.recette where id = p_suivante_id;
  update public.recette set modifie_le = now() where id = p_recette_id;
end;
$$;

grant execute on function public.separer_recette(bigint, jsonb, jsonb) to authenticated;
grant execute on function public.fusionner_recettes(bigint, bigint) to authenticated;
