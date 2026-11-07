-- US-13 : notes du cahier rattachées à une étape ou à la recette.
-- Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.

-- Remplit le contenu d'une recette (groupes, ingrédients, étapes, notes) à partir du JSON
-- d'une recette. Chaque note est soit un texte (note de la recette), soit un objet
-- { texte, etape, origine } où etape est le numéro de l'étape (1, 2…) ou null.
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
  v_etape bigint;
  v_etapes bigint[] := '{}';
  v_ordre int := 0;
  v_ordre_ing int;
  v_texte text;
  v_numero int;
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

  -- Les étapes vides sont ignorées ; v_etapes garde, pour chaque étape reçue, l'étape
  -- créée (null si ignorée), pour y rattacher les notes.
  v_ordre := 0;
  for e in select * from jsonb_array_elements(coalesce(r -> 'etapes', '[]'::jsonb)) loop
    v_etape := null;
    if nullif(trim(e #>> '{}'), '') is not null then
      v_ordre := v_ordre + 1;
      insert into public.etape (recette_id, ordre, texte)
      values (p_recette_id, v_ordre, trim(e #>> '{}'))
      returning id into v_etape;
    end if;
    v_etapes := v_etapes || v_etape;
  end loop;

  for n in select * from jsonb_array_elements(coalesce(r -> 'notes', '[]'::jsonb)) loop
    if jsonb_typeof(n) = 'object' then
      v_texte := trim(n ->> 'texte');
      v_numero := (n ->> 'etape')::int;
    else
      v_texte := trim(n #>> '{}');
      v_numero := null;
    end if;
    continue when nullif(v_texte, '') is null;
    insert into public.note (recette_id, etape_id, texte, origine)
    values (
      p_recette_id,
      case when v_numero between 1 and coalesce(array_length(v_etapes, 1), 0) then v_etapes[v_numero] end,
      v_texte,
      case when n ->> 'origine' = 'membre' then 'membre'::public.origine_note else 'cahier'::public.origine_note end
    );
  end loop;
end;
$$;

grant execute on function public.remplir_recette(bigint, jsonb) to authenticated;
