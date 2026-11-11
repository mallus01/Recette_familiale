-- Tests du test A/B des cartes À cuisiner (US-48 à US-50). Lancer après rls.sql et seed.sql.
\set ON_ERROR_STOP on
set client_min_messages = warning;

reset role;
delete from public.variante_membre;
delete from public.mesure_ab;
update public.test_ab set statut = 'en_cours', gagnante = null, termine_le = null;

-- Lecteur : reçoit une variante, toujours la même, et ne lit ni variantes ni mesures
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
declare v text;
begin
  v := public.variante_ab('cartes_a_cuisiner');
  assert v in ('standard', 'grandes'), 'lecteur : une variante';
  assert public.variante_ab('cartes_a_cuisiner') = v, 'lecteur : variante stable';
  assert (select statut from public.test_ab) = 'en_cours', 'lecteur : lit le statut du test';
  perform public.mesurer_ab('cartes_a_cuisiner', 'affichage');
  perform public.mesurer_ab('cartes_a_cuisiner', 'affichage');
  perform public.mesurer_ab('cartes_a_cuisiner', 'ouverture');
  begin
    perform count(*) from public.mesure_ab;
    raise exception 'un membre ne doit pas lire les mesures';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.variante_membre;
    raise exception 'un membre ne doit pas lire les variantes';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.resultats_ab('cartes_a_cuisiner');
    raise exception 'un membre ne doit pas voir les résultats';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.conclure_test_ab('cartes_a_cuisiner', 'grandes');
    raise exception 'un membre ne doit pas terminer le test';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.changer_variante_ab('cartes_a_cuisiner', 'grandes');
    raise exception 'un membre ne doit pas choisir sa variante';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Contributeur : reçoit l'autre variante (effectifs équilibrés)
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  perform public.variante_ab('cartes_a_cuisiner');
  perform public.mesurer_ab('cartes_a_cuisiner', 'cuisinee');
end $$;
reset role;
do $$ begin
  assert (select count(distinct variante) from public.variante_membre) = 2, 'deux membres : deux variantes';
  assert (select count(*) from public.mesure_ab where type = 'affichage') = 1, 'un affichage par jour';
end $$;

-- Admin : résultats, changement de sa variante, fin et reprise du test
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare l record; v_lecteur text;
begin
  perform public.changer_variante_ab('cartes_a_cuisiner', 'grandes');
  assert public.variante_ab('cartes_a_cuisiner') = 'grandes', 'admin : variante choisie';
  perform public.changer_variante_ab('cartes_a_cuisiner', 'standard');
  assert public.variante_ab('cartes_a_cuisiner') = 'standard', 'admin : variante changée';
  begin
    perform public.changer_variante_ab('cartes_a_cuisiner', 'inconnue');
    raise exception 'variante inconnue acceptée';
  exception when raise_exception then
    if sqlerrm = 'variante inconnue acceptée' then raise; end if;
  end;
  assert (select count(*) from public.resultats_ab('cartes_a_cuisiner')) = 2, 'une ligne par variante';
  assert (select sum(membres) from public.resultats_ab('cartes_a_cuisiner')) = 3, 'trois membres répartis';
  assert (select sum(jours_vus) from public.resultats_ab('cartes_a_cuisiner')) = 1, 'jours vus';
  assert (select sum(ouvertures) from public.resultats_ab('cartes_a_cuisiner')) = 1, 'ouvertures';
  assert (select sum(cuisinees) from public.resultats_ab('cartes_a_cuisiner')) = 1, 'recettes cuisinées';
  select variante into l from public.resultats_ab('cartes_a_cuisiner') limit 1;
  assert l.variante = 'standard', 'ordre des variantes';

  perform public.conclure_test_ab('cartes_a_cuisiner', 'grandes');
  assert public.variante_ab('cartes_a_cuisiner') = 'grandes', 'test terminé : gagnante pour tous';
  perform public.mesurer_ab('cartes_a_cuisiner', 'ouverture');
  assert (select sum(ouvertures) from public.resultats_ab('cartes_a_cuisiner')) = 1, 'pas de mesure après la fin';
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert public.variante_ab('cartes_a_cuisiner') = 'grandes', 'lecteur : gagnante après la fin';
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  perform public.conclure_test_ab('cartes_a_cuisiner', null);
  assert (select statut from public.test_ab) = 'en_cours', 'test repris';
  assert public.variante_ab('cartes_a_cuisiner') = 'standard', 'reprise : chacun retrouve sa variante';
end $$;
reset role;

delete from public.variante_membre;
delete from public.mesure_ab;
select 'Tous les tests du test A/B passent' as resultat;
