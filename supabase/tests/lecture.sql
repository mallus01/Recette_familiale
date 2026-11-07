-- Tests de l'enregistrement d'une lecture IA. Lancer après rls.sql (réutilise ses membres).
\set ON_ERROR_STOP on
set client_min_messages = warning;

reset role;
delete from public.cahier where id = 900;
insert into public.cahier (id, nom) overriding system value values (900, 'Cahier test lecture');
insert into public.page_scannee (id, cahier_id, numero, image_chemin) overriding system value
values (900, 900, 1, 'cahiers/900/pages/1.jpg');

-- Lecteur : ne peut pas enregistrer de lecture
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    perform public.enregistrer_lecture(900, '{"recettes": [], "mots_douteux": []}', 'test');
    raise exception 'un lecteur ne doit pas enregistrer de lecture';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Contributeur : deux recettes sur la page
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.enregistrer_lecture(900, $j${
  "recettes": [
    {
      "titre": "Tarte aux pommes",
      "portions": 6,
      "duree_minutes": null,
      "groupes": [
        {"nom": "Pour la pâte", "ingredients": [
          {"quantite": 250, "unite": "g", "nom": "farine", "texte_origine": "1/2 livre de farine"},
          {"quantite": null, "unite": null, "nom": "sel", "texte_origine": "une pincée de sel"}
        ]},
        {"nom": null, "ingredients": [{"quantite": 4, "unite": null, "nom": "pommes", "texte_origine": "4 pommes"}]}
      ],
      "etapes": ["Faire la pâte.", "  ", "Cuire 30 min."],
      "notes": ["Meilleure avec des reinettes"]
    },
    {"titre": "", "portions": null, "duree_minutes": 10, "groupes": [], "etapes": ["Mélanger."], "notes": []}
  ],
  "mots_douteux": [{"mot": "reinettes", "contexte": "avec des reinettes"}, {"mot": "livre", "contexte": "1/2 livre"}]
}$j$, 'modele-test');
reset role;

do $$ begin
  assert (select statut = 'prete' and nb_mots_douteux = 2 and modele_ia = 'modele-test' and lecture is not null
          from public.page_scannee where id = 900), 'page prête avec 2 mots douteux';
  assert (select count(*) from public.recette_page where page_id = 900) = 2, 'deux recettes liées à la page';
  assert (select count(*) from public.recette r join public.recette_page rp on rp.recette_id = r.id
          where rp.page_id = 900 and r.statut = 'brouillon' and r.cree_par = '00000000-0000-0000-0000-00000000000c') = 2,
         'deux brouillons créés par le contributeur';
  assert exists (select 1 from public.recette where titre = 'Recette sans titre' and duree_minutes = 10), 'titre par défaut';
  assert (select count(*) from public.ingredient i join public.groupe_ingredients g on g.id = i.groupe_id
          join public.recette r on r.id = g.recette_id where r.titre = 'Tarte aux pommes') = 3, 'trois ingrédients';
  assert (select count(*) from public.etape e join public.recette r on r.id = e.recette_id
          where r.titre = 'Tarte aux pommes') = 2, 'étape vide ignorée';
  assert (select max(ordre) from public.etape e join public.recette r on r.id = e.recette_id
          where r.titre = 'Tarte aux pommes') = 2, 'étapes numérotées à la suite';
  assert exists (select 1 from public.ingredient where nom = 'sel' and quantite is null and texte_origine = 'une pincée de sel'),
         'ingrédient sans quantité';
  assert exists (select 1 from public.note where texte = 'Meilleure avec des reinettes' and origine = 'cahier'), 'note du cahier';
end $$;

-- Relecture de la même page : les anciens brouillons sont remplacés, une recette publiée est gardée
update public.recette set statut = 'publiee' where titre = 'Recette sans titre';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.enregistrer_lecture(900, '{"recettes": [{"titre": "Tarte relue", "portions": null, "duree_minutes": null, "groupes": [], "etapes": [], "notes": []}], "mots_douteux": []}', 'modele-test');
reset role;

do $$ begin
  assert not exists (select 1 from public.recette where titre = 'Tarte aux pommes'), 'ancien brouillon supprimé';
  assert exists (select 1 from public.recette where titre = 'Recette sans titre'), 'recette publiée gardée';
  assert exists (select 1 from public.recette where titre = 'Tarte relue'), 'nouveau brouillon';
  assert (select nb_mots_douteux from public.page_scannee where id = 900) = 0, 'compteur remis à jour';
end $$;

delete from public.recette where titre in ('Recette sans titre', 'Tarte relue');
delete from public.cahier where id = 900;
\echo 'Tous les tests de lecture passent'
