-- US-09 : lecture des pages par l'IA.
-- Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.

-- Résultat brut de la lecture, gardé pour la relecture (mots douteux) et la comparaison
-- des modèles (US-11), et moment du lancement, pour relancer une lecture restée bloquée.
alter table public.page_scannee add column if not exists lecture jsonb;
alter table public.page_scannee add column if not exists modele_ia text;
alter table public.page_scannee add column if not exists lecture_le timestamptz;

-- Enregistre la lecture d'une page : remplace les brouillons déjà tirés de cette page
-- (page reprise ou relue), crée une recette brouillon par recette lue, puis marque la
-- page prête. Tout ou rien, et soumis aux droits de l'appelant (contributeur).
create or replace function public.enregistrer_lecture(p_page_id bigint, p_resultat jsonb, p_modele text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  r jsonb;
  g jsonb;
  i jsonb;
  e jsonb;
  n jsonb;
  v_recette bigint;
  v_groupe bigint;
  v_ordre_recette int := 0;
  v_ordre int;
  v_ordre_ing int;
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

    v_ordre := 0;
    for g in select * from jsonb_array_elements(coalesce(r -> 'groupes', '[]'::jsonb)) loop
      v_ordre := v_ordre + 1;
      insert into public.groupe_ingredients (recette_id, nom, ordre)
      values (v_recette, nullif(trim(g ->> 'nom'), ''), v_ordre)
      returning id into v_groupe;
      v_ordre_ing := 0;
      for i in select * from jsonb_array_elements(coalesce(g -> 'ingredients', '[]'::jsonb)) loop
        v_ordre_ing := v_ordre_ing + 1;
        insert into public.ingredient (groupe_id, quantite, unite, nom, texte_origine, ordre)
        values (
          v_groupe,
          (i ->> 'quantite')::numeric,
          nullif(trim(i ->> 'unite'), ''),
          coalesce(nullif(trim(i ->> 'nom'), ''), '?'),
          nullif(trim(i ->> 'texte_origine'), ''),
          v_ordre_ing
        );
      end loop;
    end loop;

    v_ordre := 0;
    for e in select * from jsonb_array_elements(coalesce(r -> 'etapes', '[]'::jsonb)) loop
      if nullif(trim(e #>> '{}'), '') is not null then
        v_ordre := v_ordre + 1;
        insert into public.etape (recette_id, ordre, texte) values (v_recette, v_ordre, trim(e #>> '{}'));
      end if;
    end loop;

    for n in select * from jsonb_array_elements(coalesce(r -> 'notes', '[]'::jsonb)) loop
      if nullif(trim(n #>> '{}'), '') is not null then
        insert into public.note (recette_id, texte, origine) values (v_recette, trim(n #>> '{}'), 'cahier');
      end if;
    end loop;
  end loop;

  update public.page_scannee
  set statut = 'prete', lecture = p_resultat, modele_ia = p_modele, nb_mots_douteux = v_nb_douteux
  where id = p_page_id;
end;
$$;

grant execute on function public.enregistrer_lecture(bigint, jsonb, text) to authenticated;
