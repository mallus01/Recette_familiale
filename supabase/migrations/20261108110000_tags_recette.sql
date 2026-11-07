-- US-14 : classer une recette par tags (type de repas, occasions, classique).
-- Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.

-- Enregistre les tags d'une recette en une fois : un type de repas (ou aucun), les
-- occasions choisies (remplacent les précédentes) et la case Classique.
create or replace function public.classer_recette(
  p_recette_id bigint,
  p_type_repas_id bigint,
  p_occasions bigint[],
  p_classique boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.est_contributeur() then
    raise exception 'réservé aux contributeurs' using errcode = '42501';
  end if;

  update public.recette
  set type_repas_id = p_type_repas_id, classique = coalesce(p_classique, false), modifie_le = now()
  where id = p_recette_id;
  if not found then
    raise exception 'recette introuvable' using errcode = 'P0002';
  end if;

  delete from public.recette_occasion where recette_id = p_recette_id;
  insert into public.recette_occasion (recette_id, occasion_id)
  select p_recette_id, o from unnest(coalesce(p_occasions, '{}')) as o
  on conflict do nothing;
end;
$$;

grant execute on function public.classer_recette(bigint, bigint, bigint[], boolean) to authenticated;
