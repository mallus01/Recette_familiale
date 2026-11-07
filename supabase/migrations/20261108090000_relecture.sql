-- US-12 : relecture d'une recette face à son scan.
-- Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.

-- Remplit le contenu d'une recette (groupes, ingrédients, étapes, notes) à partir du JSON
-- d'une recette, au format de la lecture par l'IA. Le contenu existant est remplacé.
create or replace function public.remplir_recette(p_recette_id bigint, r jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  g jsonb;
  i jsonb;
  e jsonb;
  n jsonb;
  v_groupe bigint;
  v_ordre int := 0;
  v_ordre_ing int;
begin
  delete from public.note where recette_id = p_recette_id;
  delete from public.etape where recette_id = p_recette_id;
  delete from public.groupe_ingredients where recette_id = p_recette_id;

  for g in select * from jsonb_array_elements(coalesce(r -> 'groupes', '[]'::jsonb)) loop
    v_ordre := v_ordre + 1;
    insert into public.groupe_ingredients (recette_id, nom, ordre)
    values (p_recette_id, nullif(trim(g ->> 'nom'), ''), v_ordre)
    returning id into v_groupe;
    v_ordre_ing := 0;
    for i in select * from jsonb_array_elements(coalesce(g -> 'ingredients', '[]'::jsonb)) loop
      -- Un ingrédient entièrement vide (ligne ajoutée puis laissée) est ignoré.
      continue when nullif(trim(i ->> 'nom'), '') is null and nullif(trim(i ->> 'texte_origine'), '') is null;
      v_ordre_ing := v_ordre_ing + 1;
      insert into public.ingredient (groupe_id, quantite, unite, nom, texte_origine, ordre)
      values (
        v_groupe,
        (i ->> 'quantite')::numeric,
        nullif(trim(i ->> 'unite'), ''),
        coalesce(nullif(trim(i ->> 'nom'), ''), trim(i ->> 'texte_origine')),
        nullif(trim(i ->> 'texte_origine'), ''),
        v_ordre_ing
      );
    end loop;
  end loop;

  v_ordre := 0;
  for e in select * from jsonb_array_elements(coalesce(r -> 'etapes', '[]'::jsonb)) loop
    if nullif(trim(e #>> '{}'), '') is not null then
      v_ordre := v_ordre + 1;
      insert into public.etape (recette_id, ordre, texte) values (p_recette_id, v_ordre, trim(e #>> '{}'));
    end if;
  end loop;

  for n in select * from jsonb_array_elements(coalesce(r -> 'notes', '[]'::jsonb)) loop
    if nullif(trim(n #>> '{}'), '') is not null then
      insert into public.note (recette_id, texte, origine) values (p_recette_id, trim(n #>> '{}'), 'cahier');
    end if;
  end loop;
end;
$$;

-- Lecture d'une page (US-09), réécrite pour partager remplir_recette.
create or replace function public.enregistrer_lecture(p_page_id bigint, p_resultat jsonb, p_modele text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  r jsonb;
  v_recette bigint;
  v_ordre_recette int := 0;
  v_nb_douteux int := coalesce(jsonb_array_length(p_resultat -> 'mots_douteux'), 0);
begin
  if not public.est_contributeur() then
    raise exception 'réservé aux contributeurs' using errcode = '42501';
  end if;

  delete from public.recette
  where statut = 'brouillon'
    and id in (select recette_id from public.recette_page where page_id = p_page_id);

  for r in select * from jsonb_array_elements(coalesce(p_resultat -> 'recettes', '[]'::jsonb)) loop
    v_ordre_recette := v_ordre_recette + 1;
    insert into public.recette (titre, portions, duree_minutes, cree_par)
    values (
      coalesce(nullif(trim(r ->> 'titre'), ''), 'Recette sans titre'),
      nullif((r ->> 'portions')::numeric, 0)::int,
      nullif((r ->> 'duree_minutes')::numeric, 0)::int,
      auth.uid()
    )
    returning id into v_recette;
    insert into public.recette_page (recette_id, page_id, ordre) values (v_recette, p_page_id, v_ordre_recette);
    perform public.remplir_recette(v_recette, r);
  end loop;

  update public.page_scannee
  set statut = 'prete', lecture = p_resultat, modele_ia = p_modele, nb_mots_douteux = v_nb_douteux
  where id = p_page_id;
end;
$$;

-- Enregistre la relecture d'une recette : titre et contenu corrigés. Tout ou rien.
create or replace function public.enregistrer_relecture(p_recette_id bigint, p_recette jsonb)
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
  set titre = coalesce(nullif(trim(p_recette ->> 'titre'), ''), 'Recette sans titre'),
      modifie_le = now()
  where id = p_recette_id;
  if not found then
    raise exception 'recette introuvable' using errcode = 'P0002';
  end if;

  perform public.remplir_recette(p_recette_id, p_recette);
end;
$$;

grant execute on function public.remplir_recette(bigint, jsonb) to authenticated;
grant execute on function public.enregistrer_lecture(bigint, jsonb, text) to authenticated;
grant execute on function public.enregistrer_relecture(bigint, jsonb) to authenticated;
