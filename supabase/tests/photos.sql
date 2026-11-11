-- Tests des photos proposées (US-38 à US-40). Lancer après rls.sql, seed.sql et accueil.sql.
\set ON_ERROR_STOP on
set client_min_messages = warning;

reset role;
delete from public.photo;
delete from storage.objects where name like 'photos/%';
insert into public.recette (titre, statut) values ('Tarte test photo', 'publiee');
insert into public.recette (titre, statut) values ('Brouillon test photo', 'brouillon');
select set_config('test.brouillon', id::text, false) from public.recette where titre = 'Brouillon test photo';

-- Lecteur : envoie et propose une photo sur une recette publiée, pas sur un brouillon
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into storage.objects (bucket_id, name) values ('images', 'photos/1/a.jpg');
insert into public.photo (recette_id, image_chemin)
select id, 'photos/1/a.jpg' from public.recette where titre = 'Tarte test photo';
do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values ('images', 'cahiers/1/pirate.jpg');
    raise exception 'un lecteur ne doit envoyer que des photos de plats';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.photo (recette_id, image_chemin, statut)
    select id, 'photos/1/b.jpg', 'validee' from public.recette where titre = 'Tarte test photo';
    raise exception 'un lecteur ne doit pas valider sa photo';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.photo (recette_id, image_chemin) values (current_setting('test.brouillon')::bigint, 'photos/1/c.jpg');
    raise exception 'pas de photo sur un brouillon invisible';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.photo) = 1, 'lecteur : voit sa proposition';
  assert (select propose_par from public.photo) = '00000000-0000-0000-0000-00000000000b', 'proposée en son nom';
  update public.photo set statut = 'validee';
  delete from public.photo;
end $$;
reset role;
do $$ begin
  assert (select statut from public.photo) = 'en_attente', 'lecteur : ne valide pas';
  assert (select vignette_chemin is null from public.recette_resume where titre = 'Tarte test photo'),
    'photo en attente : pas de vignette';
end $$;

-- Contributeur : ne voit pas la proposition d'un autre
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.photo) = 0, 'contributeur : pas les propositions des autres';
end $$;
reset role;

-- Admin : voit la file, valide
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.photo where statut = 'en_attente') = 1, 'admin : file des photos';
end $$;
update public.photo set statut = 'validee', validee_le = now();
insert into public.photo (recette_id, image_chemin, statut, validee_le)
select id, 'photos/1/d.jpg', 'validee', now() + interval '1 minute' from public.recette where titre = 'Tarte test photo';
reset role;

-- Contributeur : voit les photos validées, la première sert de vignette
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.photo) = 2, 'photos validées visibles';
  assert (select vignette_chemin from public.recette_resume where titre = 'Tarte test photo') = 'photos/1/a.jpg',
    'vignette : première photo validée';
end $$;
reset role;

-- Admin : supprime une photo validée ; membre retiré : la photo reste
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
delete from public.photo where image_chemin = 'photos/1/a.jpg';
reset role;
do $$ begin
  assert (select vignette_chemin from public.recette_resume where titre = 'Tarte test photo') = 'photos/1/d.jpg',
    'vignette : photo suivante';
end $$;

reset role;
delete from public.photo;
delete from storage.objects where name like 'photos/%';
delete from public.recette where titre in ('Tarte test photo', 'Brouillon test photo');
select 'Tous les tests des photos passent' as resultat;
