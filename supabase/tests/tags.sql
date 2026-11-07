-- Tests du classement d'une recette par tags. Lancer après rls.sql et seed.sql.
\set ON_ERROR_STOP on
set client_min_messages = warning;

reset role;
delete from public.recette where titre = 'Recette test tags';
insert into public.recette (id, titre) overriding system value values (902, 'Recette test tags');

-- Lecteur : refusé
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    perform public.classer_recette(902, null, '{}', true);
    raise exception 'un lecteur ne doit pas classer';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Contributeur : un type, deux occasions, classique
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.classer_recette(902,
  (select id from public.type_repas where nom = 'Dessert'),
  array(select id from public.occasion where nom in ('Noël', 'Anniversaire')),
  true);
reset role;

do $$ begin
  assert (select t.nom = 'Dessert' and r.classique from public.recette r join public.type_repas t on t.id = r.type_repas_id
          where r.id = 902), 'type et classique';
  assert (select count(*) from public.recette_occasion where recette_id = 902) = 2, 'deux occasions';
end $$;

-- Reclassement : occasions remplacées, type retiré
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.classer_recette(902, null, array(select id from public.occasion where nom = 'Nouvel An'), false);
reset role;

do $$ begin
  assert (select type_repas_id is null and not classique from public.recette where id = 902), 'type retiré';
  assert (select array_agg(o.nom) from public.recette_occasion ro join public.occasion o on o.id = ro.occasion_id
          where ro.recette_id = 902) = array['Nouvel An'], 'occasions remplacées';
end $$;

delete from public.recette where id = 902;
\echo 'Tous les tests de tags passent'
