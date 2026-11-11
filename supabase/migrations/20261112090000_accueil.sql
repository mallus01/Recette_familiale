-- Sprint 4 : accueil (rangées, recherche, filtres), cahiers à feuilleter, listes perso.
-- Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.

-- Résumé d'une recette pour les cartes : titre, tags utiles aux filtres, et la première
-- page de son scan (cahier, numéro, image servant de vignette). Les droits de chacun
-- s'appliquent (security_invoker) : un lecteur ne voit que les recettes publiées.
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
  p.image_chemin as vignette_chemin
from public.recette r
left join lateral (
  select ps.cahier_id, ps.numero, ps.image_chemin
  from public.recette_page rp
  join public.page_scannee ps on ps.id = rp.page_id
  where rp.recette_id = r.id
  order by rp.ordre, ps.numero
  limit 1
) p on true;

grant select on public.recette_resume to authenticated;

-- Texte en minuscules et sans accents, pour chercher « creme » et trouver « Crème ».
create or replace function public.sans_accents(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(
    replace(replace(lower(coalesce(t, '')), 'œ', 'oe'), 'æ', 'ae'),
    'àâäáãåéèêëíìîïóòôöõúùûüçñÿ',
    'aaaaaaeeeeiiiiooooouuuucny'
  );
$$;

-- US-26 et US-27 : recherche par nom de recette ou par ingrédient, filtres par type de
-- repas, occasion et Classiques. Seules les recettes publiées sont proposées.
create or replace function public.chercher_recettes(
  p_texte text default null,
  p_type_repas_id bigint default null,
  p_occasion_id bigint default null,
  p_classique boolean default false
)
returns setof public.recette_resume
language sql
stable
security invoker
set search_path = public
as $$
  with motif as (
    select '%' || replace(replace(replace(public.sans_accents(trim(coalesce(p_texte, ''))),
      '\', '\\'), '%', '\%'), '_', '\_') || '%' as m
  )
  select rr.*
  from public.recette_resume rr, motif
  where rr.statut = 'publiee'
    and (p_type_repas_id is null or rr.type_repas_id = p_type_repas_id)
    and (p_occasion_id is null or exists (
      select 1 from public.recette_occasion ro
      where ro.recette_id = rr.id and ro.occasion_id = p_occasion_id))
    and (not coalesce(p_classique, false) or rr.classique)
    and (
      motif.m = '%%'
      or public.sans_accents(rr.titre) like motif.m
      or exists (
        select 1
        from public.groupe_ingredients g
        join public.ingredient i on i.groupe_id = g.id
        where g.recette_id = rr.id
          and (public.sans_accents(i.nom) like motif.m
               or public.sans_accents(i.texte_origine) like motif.m)
      )
    )
  order by rr.titre
  limit 100;
$$;

grant execute on function public.chercher_recettes(text, bigint, bigint, boolean) to authenticated;

-- US-30 : suggestions tirées au hasard parmi les recettes publiées.
create or replace function public.suggestions_recettes(p_nombre integer default 8)
returns setof public.recette_resume
language sql
volatile
security invoker
set search_path = public
as $$
  select * from public.recette_resume
  where statut = 'publiee'
  order by random()
  limit least(greatest(coalesce(p_nombre, 8), 1), 30);
$$;

grant execute on function public.suggestions_recettes(integer) to authenticated;
