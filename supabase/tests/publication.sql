-- Tests de l'enrichissement et de la publication. Lancer après rls.sql et seed.sql.
\set ON_ERROR_STOP on
set client_min_messages = warning;

reset role;
delete from public.cahier where id = 903;
insert into public.cahier (id, nom) overriding system value values (903, 'Cahier test publication');
insert into public.page_scannee (id, cahier_id, numero, image_chemin) overriding system value
values (903, 903, 1, 'cahiers/903/pages/1.jpg');
insert into public.recette (id, titre) overriding system value values (903, 'Recette test publication');
insert into public.recette_page (recette_id, page_id) values (903, 903);

-- Lecteur : ni enrichissement, ni accès au brouillon ou à sa page
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    perform public.enrichir_recette(903, '{}', true);
    raise exception 'un lecteur ne doit pas publier';
  exception when insufficient_privilege then null;
  end;
  assert not exists (select 1 from public.recette where id = 903), 'brouillon invisible au lecteur';
  assert not exists (select 1 from public.page_scannee where id = 903), 'page du brouillon invisible au lecteur';
end $$;
reset role;

-- Contributeur : enrichit sans publier
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.enrichir_recette(903, jsonb_build_object(
  'transmis_par', '  Tante Paule ', 'souvenir', 'Le dimanche chez elle', 'portions', 6, 'duree_minutes', 45.4,
  'type_repas_id', (select id from public.type_repas where nom = 'Dessert'),
  'occasions', (select jsonb_agg(id) from public.occasion where nom in ('Noël', 'Anniversaire')),
  'classique', true), false);
reset role;

do $$ begin
  assert (select transmis_par = 'Tante Paule' and souvenir = 'Le dimanche chez elle' and portions = 6
          and duree_minutes = 45 and classique and statut = 'brouillon' from public.recette where id = 903),
         'enrichie, encore en brouillon';
  assert (select count(*) from public.recette_occasion where recette_id = 903) = 2, 'deux occasions';
end $$;

-- Contributeur : publie, en vidant des champs
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.enrichir_recette(903, '{"transmis_par": "", "souvenir": null, "portions": 0, "duree_minutes": null, "type_repas_id": null, "occasions": [], "classique": false}', true);
reset role;

do $$ begin
  assert (select statut = 'publiee' and transmis_par is null and portions is null and type_repas_id is null
          from public.recette where id = 903), 'publiée, champs vidés';
  assert (select count(*) from public.recette_occasion where recette_id = 903) = 0, 'occasions retirées';
end $$;

-- Lecteur : voit la recette publiée et sa page
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert exists (select 1 from public.recette where id = 903), 'recette publiée visible';
  assert exists (select 1 from public.page_scannee where id = 903), 'page de la recette publiée visible';
  assert (select count(*) from public.page_scannee) = 1, 'aucune autre page visible';
end $$;
reset role;

delete from public.recette where id = 903;
delete from public.cahier where id = 903;
\echo 'Tous les tests de publication passent'
