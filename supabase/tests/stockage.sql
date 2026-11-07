-- Tests des règles d'accès aux images. Lancer après rls.sql (réutilise ses membres).
\set ON_ERROR_STOP on
set client_min_messages = warning;

do $$ begin
  assert (select public = false from storage.buckets where id = 'images'), 'bucket images privé';
end $$;

-- Contributeur : ajoute une couverture
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into storage.objects (bucket_id, name) values ('images', 'cahiers/1/couverture.jpg');
reset role;

-- Lecteur : la voit, ne peut rien ajouter ni supprimer
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from storage.objects) = 1, 'lecteur : voit les images';
  begin
    insert into storage.objects (bucket_id, name) values ('images', 'cahiers/1/pirate.jpg');
    raise exception 'un lecteur ne doit pas ajouter d''image';
  exception when insufficient_privilege then null;
  end;
end $$;
delete from storage.objects;
reset role;
do $$ begin
  assert (select count(*) from storage.objects) = 1, 'lecteur : ne supprime rien';
end $$;

-- Anonyme : rien
set role anon;
set request.jwt.claim.sub = '';
do $$ begin
  assert (select count(*) from storage.objects) = 0, 'anonyme : aucune image';
end $$;
reset role;

select 'Tous les tests de stockage passent' as resultat;
