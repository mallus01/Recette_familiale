-- Tests de l'accueil (recherche, filtres, suggestions) et des listes perso. Lancer après
-- rls.sql et seed.sql.
\set ON_ERROR_STOP on
set client_min_messages = warning;

reset role;
delete from public.recette where id in (904, 905);
delete from public.cahier where id = 904;
insert into public.cahier (id, nom) overriding system value values (904, 'Cahier test accueil');
insert into public.page_scannee (id, cahier_id, numero, image_chemin) overriding system value
values (904, 904, 2, 'cahiers/904/pages/2.jpg'), (905, 904, 5, 'cahiers/904/pages/5.jpg');
insert into public.recette (id, titre, statut, classique, type_repas_id) overriding system value values
  (904, 'Crêpes de la Chandeleur', 'publiee', true, (select id from public.type_repas where nom = 'Dessert')),
  (905, 'Pâté en croûte', 'brouillon', false, null);
insert into public.recette_page (recette_id, page_id) values (904, 904), (905, 905);
insert into public.recette_occasion (recette_id, occasion_id)
select 904, id from public.occasion where nom = 'Noël';
insert into public.groupe_ingredients (id, recette_id, ordre) overriding system value values (904, 904, 1)
  on conflict do nothing;
insert into public.ingredient (groupe_id, quantite, unite, nom, texte_origine) values
  (904, 250, 'g', 'farine', '1/2 livre de farine'), (904, 50, 'cl', 'lait', null);

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
declare v_dessert bigint := (select id from public.type_repas where nom = 'Dessert');
        v_noel bigint := (select id from public.occasion where nom = 'Noël');
        v_plat bigint := (select id from public.type_repas where nom = 'Plat');
begin
  assert (select vignette_chemin = 'cahiers/904/pages/2.jpg' and page_numero = 2 and cahier_id = 904
          from public.recette_resume where id = 904), 'résumé avec la vignette du scan';
  assert not exists (select 1 from public.recette_resume where id = 905), 'brouillon invisible au lecteur';
  assert exists (select 1 from public.chercher_recettes('crepe') where id = 904), 'titre sans accent';
  assert exists (select 1 from public.chercher_recettes('  FARINE ') where id = 904), 'ingrédient';
  assert exists (select 1 from public.chercher_recettes('livre') where id = 904), 'texte d''origine';
  assert not exists (select 1 from public.chercher_recettes('chocolat') where id = 904), 'pas de faux positif';
  assert not exists (select 1 from public.chercher_recettes('%') where id = 904), 'joker échappé';
  assert exists (select 1 from public.chercher_recettes(null, v_dessert, v_noel, true) where id = 904), 'filtres cumulés';
  assert not exists (select 1 from public.chercher_recettes(null, v_plat) where id = 904), 'autre type de repas';
  assert exists (select 1 from public.chercher_recettes('') where id = 904), 'recherche vide : tout';
  assert exists (select 1 from public.suggestions_recettes(30) where id = 904), 'suggestion';
  assert not exists (select 1 from public.suggestions_recettes(30) where statut <> 'publiee'), 'suggestions publiées';
end $$;

-- Listes : le lecteur ajoute et retire ; elles restent privées
insert into public.liste_perso (membre_id, recette_id, type) values
  ('00000000-0000-0000-0000-00000000000b', 904, 'favori'),
  ('00000000-0000-0000-0000-00000000000b', 904, 'a_cuisiner');
delete from public.liste_perso where recette_id = 904 and type = 'a_cuisiner';
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert not exists (select 1 from public.chercher_recettes('pate') where id = 905), 'brouillon hors recherche, même pour un contributeur';
  assert not exists (select 1 from public.liste_perso where recette_id = 904), 'listes d''un autre membre invisibles';
end $$;
reset role;

do $$ begin
  assert (select count(*) from public.liste_perso where recette_id = 904) = 1, 'favori gardé, à cuisiner retiré';
end $$;

delete from public.recette where id in (904, 905);
delete from public.cahier where id = 904;
\echo 'Tous les tests de l''accueil passent'
