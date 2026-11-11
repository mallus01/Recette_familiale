-- Tests de la séparation et de la fusion de recettes (US-41 à US-43).
-- Lancer après rls.sql, seed.sql et photos.sql.
\set ON_ERROR_STOP on
set client_min_messages = warning;

reset role;
delete from public.cahier where id = 902;
insert into public.cahier (id, nom) overriding system value values (902, 'Cahier test pages');
insert into public.page_scannee (id, cahier_id, numero, image_chemin) overriding system value
values (921, 902, 1, 'cahiers/902/pages/1.jpg'), (922, 902, 2, 'cahiers/902/pages/2.jpg');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
-- Page 1 : deux recettes ; la seconde continue page 2
select public.enregistrer_lecture(921, $j${
  "recettes": [
    {"titre": "Sablés", "portions": null, "duree_minutes": null,
     "groupes": [{"nom": null, "ingredients": [{"quantite": 200, "unite": "g", "nom": "beurre", "texte_origine": "200 g de beurre"}]}],
     "etapes": ["Sabler."], "notes": [], "commence_page_precedente": false, "continue_page_suivante": false},
    {"titre": "Tarte TF", "portions": 6, "duree_minutes": null,
     "groupes": [{"nom": "Pâte", "ingredients": [{"quantite": 250, "unite": "g", "nom": "farine", "texte_origine": "250 g de farine"}]}],
     "etapes": ["Faire la pâte.", "Étaler."], "notes": [{"texte": "Pâte brisée", "etape": 1}],
     "commence_page_precedente": false, "continue_page_suivante": true}],
  "mots_douteux": []
}$j$, 'modele-test');
select public.enregistrer_lecture(922, $j${
  "recettes": [
    {"titre": "Suite de la tarte", "portions": null, "duree_minutes": null,
     "groupes": [{"nom": "Garniture", "ingredients": [{"quantite": 4, "unite": null, "nom": "pommes", "texte_origine": "4 pommes"}]}],
     "etapes": ["Garnir.", "Cuire."], "notes": [{"texte": "Four chaud", "etape": 2}],
     "commence_page_precedente": true, "continue_page_suivante": false}],
  "mots_douteux": []
}$j$, 'modele-test');
reset role;

do $$ begin
  assert (select count(*) from public.recette_page where page_id = 921) = 2, 'US-41 : deux recettes sur la page';
end $$;

-- Lecteur : ni séparer ni fusionner
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    perform public.fusionner_recettes(1, 2);
    raise exception 'un lecteur ne doit pas fusionner';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.separer_recette(1, '{}', '{}');
    raise exception 'un lecteur ne doit pas séparer';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- US-42 : fusion de la tarte avec la suite de la page 2
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.fusionner_recettes(
  (select id from public.recette where titre = 'Tarte TF'),
  (select id from public.recette where titre = 'Suite de la tarte'));
reset role;
do $$
declare v bigint := (select id from public.recette where titre = 'Tarte TF');
begin
  assert not exists (select 1 from public.recette where titre = 'Suite de la tarte'), 'suite supprimée';
  assert (select string_agg(texte, ' ' order by ordre) from public.etape where recette_id = v)
    = 'Faire la pâte. Étaler. Garnir. Cuire.', 'étapes à la suite';
  assert (select string_agg(nom, ',' order by ordre) from public.groupe_ingredients where recette_id = v)
    = 'Pâte,Garniture', 'groupes à la suite';
  assert (select e.texte from public.note n join public.etape e on e.id = n.etape_id where n.texte = 'Four chaud') = 'Cuire.',
    'note toujours rattachée à son étape';
  assert (select string_agg(ps.numero::text, ',' order by rp.ordre) from public.recette_page rp
    join public.page_scannee ps on ps.id = rp.page_id where rp.recette_id = v) = '1,2', 'les deux scans dans l''ordre';
end $$;

-- US-43 : séparer les Sablés à partir de leur unique étape n'a pas de sens ; on sépare
-- la tarte fusionnée à l'étape 3, avec la garniture
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.separer_recette((select id from public.recette where titre = 'Tarte TF'),
  $j${"titre": "Tarte TF", "groupes": [{"nom": "Pâte", "ingredients": [{"quantite": 250, "unite": "g", "nom": "farine", "texte_origine": "250 g de farine"}]}],
      "etapes": ["Faire la pâte.", "Étaler."], "notes": [{"texte": "Pâte brisée", "etape": 1, "origine": "cahier"}]}$j$,
  $j${"titre": "Garniture aux pommes", "groupes": [{"nom": "Garniture", "ingredients": [{"quantite": 4, "unite": null, "nom": "pommes", "texte_origine": "4 pommes"}]}],
      "etapes": ["Garnir.", "Cuire."], "notes": [{"texte": "Four chaud", "etape": 2, "origine": "cahier"}]}$j$) as nouvelle;
reset role;
do $$
declare
  a bigint := (select id from public.recette where titre = 'Tarte TF');
  b bigint := (select id from public.recette where titre = 'Garniture aux pommes');
begin
  assert (select count(*) from public.etape where recette_id = a) = 2, 'début gardé';
  assert (select string_agg(texte, ' ' order by ordre) from public.etape where recette_id = b) = 'Garnir. Cuire.', 'suite séparée';
  assert (select statut from public.recette where id = b) = 'brouillon', 'nouvelle recette en brouillon';
  assert (select count(*) from public.recette_page where recette_id = b) = 2, 'liée aux mêmes pages';
  assert (select e.ordre from public.note n join public.etape e on e.id = n.etape_id where n.recette_id = b) = 2, 'note de la suite';
end $$;

reset role;
delete from public.recette where id in (select recette_id from public.recette_page where page_id in (921, 922));
delete from public.cahier where id = 902;
select 'Tous les tests de séparation et fusion passent' as resultat;
