-- Tests des listes créées par les membres (US-53 à US-55). Lancer après rls.sql et seed.sql.
\set ON_ERROR_STOP on
set client_min_messages = warning;

reset role;
delete from public.liste_membre;
delete from public.recette where titre in ('Test listes publiée', 'Test listes brouillon');
insert into public.recette (titre, statut) values ('Test listes publiée', 'publiee'), ('Test listes brouillon', 'brouillon');
do $$ begin perform set_config('test.brouillon', (select id::text from public.recette where titre = 'Test listes brouillon'), false); end $$;

-- Lecteur : crée une liste, y range une recette publiée
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.liste_membre (nom) values ('Repas de Noël');
insert into public.liste_membre_recette (liste_id, recette_id)
select l.id, r.id from public.liste_membre l, public.recette r
where l.nom = 'Repas de Noël' and r.titre = 'Test listes publiée';
do $$ begin
  assert (select membre_id from public.liste_membre) = '00000000-0000-0000-0000-00000000000b', 'propriétaire par défaut';
  assert (select count(*) from public.liste_membre_recette) = 1, 'recette rangée';
  begin
    insert into public.liste_membre (nom) values ('  repas de noël ');
    raise exception 'deux listes ne doivent pas porter le même nom';
  exception when unique_violation then null;
  end;
  begin
    insert into public.liste_membre (nom) values ('   ');
    raise exception 'le nom est obligatoire';
  exception when check_violation then null;
  end;
  begin
    insert into public.liste_membre (membre_id, nom) values ('00000000-0000-0000-0000-00000000000c', 'Pour un autre');
    raise exception 'pas de liste au nom d''un autre';
  exception when insufficient_privilege then null;
  end;
end $$;
update public.liste_membre set nom = 'Noël en famille';
reset role;

-- Contributeur : même nom permis, mais ne voit ni ne modifie les listes du lecteur
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into public.liste_membre (nom) values ('Noël en famille');
do $$ begin
  assert (select count(*) from public.liste_membre) = 1, 'contributeur : seulement sa liste';
  assert (select count(*) from public.liste_membre_recette) = 0, 'contributeur : pas les recettes du lecteur';
end $$;
update public.liste_membre_recette set ajoute_le = now();
delete from public.liste_membre where membre_id = '00000000-0000-0000-0000-00000000000b';
-- Ranger une recette dans la liste d'un autre est refusé
do $$ begin
  begin
    insert into public.liste_membre_recette (liste_id, recette_id)
    select (select id from public.liste_membre where nom = 'Noël en famille' and membre_id <> auth.uid() limit 1),
           (select id from public.recette where titre = 'Test listes publiée');
    raise exception 'pas d''ajout dans la liste d''un autre';
  exception when insufficient_privilege or not_null_violation then null;
  end;
end $$;
reset role;

-- Admin : ne voit pas les listes des autres
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.liste_membre) = 0, 'admin : listes des autres invisibles';
end $$;
reset role;

do $$ begin
  assert (select count(*) from public.liste_membre where membre_id = '00000000-0000-0000-0000-00000000000b') = 1,
         'la liste du lecteur est intacte';
  assert (select count(*) from public.liste_membre_recette) = 1, 'sa recette aussi';
end $$;

-- Lecteur : un brouillon (invisible pour lui) ne peut pas être rangé ; supprimer la liste
-- ne supprime pas la recette
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    insert into public.liste_membre_recette (liste_id, recette_id)
    select l.id, current_setting('test.brouillon')::bigint
    from public.liste_membre l;
    raise exception 'pas de brouillon dans une liste de lecteur';
  exception when insufficient_privilege then null;
  end;
end $$;
delete from public.liste_membre;
reset role;
do $$ begin
  assert (select count(*) from public.liste_membre_recette) = 0, 'liens supprimés avec la liste';
  assert exists (select 1 from public.recette where titre = 'Test listes publiée'), 'recette gardée';
end $$;
delete from public.liste_membre;
delete from public.recette where titre in ('Test listes publiée', 'Test listes brouillon');

\echo 'Tous les tests des listes créées passent'
