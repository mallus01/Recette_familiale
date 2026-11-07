-- Tests de la relecture d'une recette. Lancer après rls.sql (réutilise ses membres).
\set ON_ERROR_STOP on
set client_min_messages = warning;

reset role;
delete from public.cahier where id = 901;
insert into public.cahier (id, nom) overriding system value values (901, 'Cahier test relecture');
insert into public.page_scannee (id, cahier_id, numero, image_chemin) overriding system value
values (901, 901, 1, 'cahiers/901/pages/1.jpg');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.enregistrer_lecture(901, $j${
  "recettes": [{"titre": "Crèpes", "portions": 4, "duree_minutes": null,
    "groupes": [{"nom": null, "ingredients": [
      {"quantite": 250, "unite": "g", "nom": "farine", "texte_origine": "1/2 livre de farine"},
      {"quantite": 3, "unite": null, "nom": "oeufs", "texte_origine": "3 oeufs"}]}],
    "etapes": ["Mélanger.", "Cuire."], "notes": ["Laisser reposer"]}],
  "mots_douteux": [{"mot": "Crèpes", "contexte": "Crèpes", "zone": null}]
}$j$, 'modele-test');
reset role;

-- Lecteur : ne peut pas relire
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    perform public.enregistrer_relecture(
      (select recette_id from public.recette_page where page_id = 901), '{"titre": "x"}');
    raise exception 'un lecteur ne doit pas relire';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Contributeur : corrige le titre, un ingrédient, ajoute un groupe, retire une étape
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.enregistrer_relecture((select recette_id from public.recette_page where page_id = 901), $j${
  "titre": "  Crêpes  ",
  "groupes": [
    {"nom": "", "ingredients": [
      {"quantite": 250, "unite": "g", "nom": "farine", "texte_origine": "1/2 livre de farine"},
      {"quantite": 4, "unite": null, "nom": "œufs", "texte_origine": "4 œufs"},
      {"quantite": null, "unite": "", "nom": " ", "texte_origine": ""}]},
    {"nom": "Pour servir", "ingredients": [{"quantite": null, "unite": null, "nom": "", "texte_origine": "du sucre"}]}
  ],
  "etapes": ["Mélanger la farine et les œufs.", ""],
  "notes": ["Laisser reposer une heure", "  "]
}$j$);
reset role;

do $$
declare v_id bigint := (select recette_id from public.recette_page where page_id = 901);
begin
  assert (select titre = 'Crêpes' and statut = 'brouillon' and portions = 4 from public.recette where id = v_id),
         'titre corrigé, statut et portions gardés';
  assert (select count(*) from public.groupe_ingredients where recette_id = v_id) = 2, 'deux groupes';
  assert (select nom is null from public.groupe_ingredients where recette_id = v_id and ordre = 1), 'groupe sans titre';
  assert (select count(*) from public.ingredient i join public.groupe_ingredients g on g.id = i.groupe_id
          where g.recette_id = v_id) = 3, 'ingrédient vide ignoré';
  assert exists (select 1 from public.ingredient i join public.groupe_ingredients g on g.id = i.groupe_id
                 where g.recette_id = v_id and i.nom = 'œufs' and i.quantite = 4), 'ingrédient corrigé';
  assert exists (select 1 from public.ingredient i join public.groupe_ingredients g on g.id = i.groupe_id
                 where g.recette_id = v_id and i.nom = 'du sucre'), 'nom repris du texte d''origine';
  assert (select count(*) from public.etape where recette_id = v_id) = 1, 'étape retirée';
  assert (select count(*) from public.note where recette_id = v_id) = 1, 'une note';
  assert exists (select 1 from public.note where recette_id = v_id and texte = 'Laisser reposer une heure'), 'note corrigée';
end $$;

-- Titre vide : titre par défaut ; recette inconnue : erreur
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.enregistrer_relecture((select recette_id from public.recette_page where page_id = 901),
  '{"titre": " ", "groupes": [], "etapes": [], "notes": []}');
do $$ begin
  begin
    perform public.enregistrer_relecture(-1, '{"titre": "x"}');
    raise exception 'une recette inconnue doit être refusée';
  exception when no_data_found then null;
  end;
end $$;
reset role;

do $$ begin
  assert exists (select 1 from public.recette r join public.recette_page rp on rp.recette_id = r.id
                 where rp.page_id = 901 and r.titre = 'Recette sans titre'), 'titre par défaut';
end $$;

-- US-13 : notes rattachées à une étape (numéro compté avant les étapes vides ignorées)
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.enregistrer_relecture((select recette_id from public.recette_page where page_id = 901), $j${
  "titre": "Crêpes", "groupes": [],
  "etapes": ["Mélanger.", " ", "Cuire."],
  "notes": [
    {"texte": "Pâte meilleure la veille", "etape": 1, "origine": "cahier"},
    {"texte": "Beurrer la poêle", "etape": 3, "origine": "membre"},
    {"texte": "Note sur une étape vide", "etape": 2},
    {"texte": "Étape inexistante", "etape": 9},
    "Recette de Mamie"
  ]
}$j$);
reset role;

do $$
declare v_id bigint := (select recette_id from public.recette_page where page_id = 901);
begin
  assert (select e.ordre from public.note n join public.etape e on e.id = n.etape_id
          where n.texte = 'Pâte meilleure la veille') = 1, 'note de l''étape 1';
  assert (select e.texte from public.note n join public.etape e on e.id = n.etape_id
          where n.texte = 'Beurrer la poêle') = 'Cuire.', 'note de l''étape 3, devenue la 2e';
  assert (select origine from public.note where texte = 'Beurrer la poêle') = 'membre', 'origine gardée';
  assert (select etape_id is null from public.note where texte = 'Note sur une étape vide'), 'étape vide : note de la recette';
  assert (select etape_id is null from public.note where texte = 'Étape inexistante'), 'étape inconnue : note de la recette';
  assert (select etape_id is null and origine = 'cahier' from public.note where recette_id = v_id and texte = 'Recette de Mamie'),
         'note en simple texte';
end $$;

delete from public.recette where id in (select recette_id from public.recette_page where page_id = 901);
delete from public.cahier where id = 901;
\echo 'Tous les tests de relecture passent'
