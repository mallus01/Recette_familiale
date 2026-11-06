-- Tests des règles d'accès. Lancer après la migration (voir README).
-- Chaque vérification lève une erreur si elle échoue.
\set ON_ERROR_STOP on
set client_min_messages = warning;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@ex.fr', '{"prenom":"Ada"}'),
  ('00000000-0000-0000-0000-00000000000c', 'contrib@ex.fr', '{}'),
  ('00000000-0000-0000-0000-00000000000b', 'lecteur@ex.fr', '{}');
update public.membre set role = 'admin' where email = 'admin@ex.fr';
update public.membre set role = 'contributeur' where email = 'contrib@ex.fr';

do $$ begin
  assert (select prenom from public.membre where email = 'admin@ex.fr') = 'Ada', 'membre créé par le trigger';
end $$;

-- Contributeur : crée un cahier, une page, une recette brouillon et une publiée
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into public.cahier (nom) values ('Cahier de mamie');
insert into public.page_scannee (cahier_id, numero, image_chemin) values (1, 1, 'scans/1/1.jpg');
insert into public.recette (titre) values ('Brouillon');
insert into public.recette (titre, statut) values ('Tarte', 'publiee');
insert into public.groupe_ingredients (recette_id, nom) values (1, null), (2, 'pour la pâte');
insert into public.ingredient (groupe_id, quantite, unite, nom) values (1, 1, null, 'œuf'), (2, 250, 'g', 'farine');
do $$ begin
  begin
    insert into public.type_repas (nom) values ('Goûter');
    raise exception 'un contributeur ne doit pas gérer les listes fermées';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Lecteur : ne voit que la recette publiée et ses ingrédients, n'écrit rien
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.recette) = 1, 'lecteur : une seule recette visible';
  assert (select count(*) from public.ingredient) = 1, 'lecteur : ingrédients de la recette publiée seulement';
  assert (select count(*) from public.page_scannee) = 0, 'lecteur : pas de pages scannées';
  assert (select count(*) from public.cahier) = 1, 'lecteur : cahiers visibles';
  begin
    insert into public.recette (titre) values ('Pirate');
    raise exception 'un lecteur ne doit pas créer de recette';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.liste_perso (membre_id, recette_id, type) values ('00000000-0000-0000-0000-00000000000b', 1, 'favori');
    raise exception 'un lecteur ne doit pas lister un brouillon';
  exception when insufficient_privilege then null;
  end;
end $$;
insert into public.liste_perso (membre_id, recette_id, type) values ('00000000-0000-0000-0000-00000000000b', 2, 'favori');
reset role;

-- Admin : gère les listes fermées, ne voit pas les listes des autres
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into public.type_repas (nom) values ('Goûter');
insert into public.liste_perso (membre_id, recette_id, type) values ('00000000-0000-0000-0000-00000000000a', 2, 'a_cuisiner');
do $$ begin
  assert (select count(*) from public.liste_perso) = 1, 'admin : ne voit que sa propre liste';
  assert (select count(*) from public.recette) = 2, 'admin : voit aussi les brouillons';
  begin
    insert into public.liste_perso (membre_id, recette_id, type) values ('00000000-0000-0000-0000-00000000000b', 2, 'a_cuisiner');
    raise exception 'personne ne doit écrire dans la liste d''un autre';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Non connecté : rien
set role anon;
set request.jwt.claim.sub = '';
do $$ begin
  assert (select count(*) from public.recette) = 0, 'anonyme : aucune recette';
  assert (select count(*) from public.membre) = 0, 'anonyme : aucun membre';
end $$;
reset role;

select 'Tous les tests RLS passent' as resultat;
