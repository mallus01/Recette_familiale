-- Tests de l'audit de sécurité (docs/audit-securite.md, F1 à F5). Lancer après rls.sql.
-- Chaque test rejoue l'attaque et vérifie qu'elle échoue.
\set ON_ERROR_STOP on
set client_min_messages = warning;

reset role;
delete from public.photo;
delete from storage.objects;
insert into public.recette (id, titre, statut) overriding system value values
  (8001, 'Publiée audit', 'publiee'), (8002, 'Brouillon audit', 'brouillon');
insert into public.page_scannee (id, cahier_id, numero, image_chemin) overriding system value values
  (8001, 1, 81, 'cahiers/1/pages/81.jpg'), (8002, 1, 82, 'cahiers/1/pages/82.jpg');
insert into public.recette_page (recette_id, page_id) values (8001, 8001), (8002, 8002);
update public.cahier set couverture_chemin = 'cahiers/1/couverture.jpg' where id = 1;
insert into storage.objects (bucket_id, name) values
  ('images', 'cahiers/1/couverture.jpg'),
  ('images', 'cahiers/1/pages/81.jpg'),
  ('images', 'cahiers/1/pages/82.jpg'),
  ('images', 'filtres/type_repas/1-a.jpg'),
  ('images', 'photos/8001/validee.jpg'),
  ('images', 'photos/8001/attente-autre.jpg');
insert into public.photo (recette_id, image_chemin, statut, propose_par, validee_le) values
  (8001, 'photos/8001/validee.jpg', 'validee', '00000000-0000-0000-0000-00000000000a', now()),
  (8001, 'photos/8001/attente-autre.jpg', 'en_attente', '00000000-0000-0000-0000-00000000000c', null);

-- F1 : un compte créé sans invitation (inscription publique) est refusé
do $$ begin
  begin
    insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ff', 'pirate@exemple.com');
    raise exception 'F1 : un compte sans invitation doit être refusé';
  exception when insufficient_privilege then null;
  end;
  assert not exists (select 1 from public.membre where email = 'pirate@exemple.com'), 'F1 : pas de fiche membre';
end $$;

-- F2 : un lecteur ne voit que sa propre fiche ; l'admin voit tout le monde
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.membre) = 1, 'F2 : lecteur, sa fiche seulement';
  assert (select email from public.membre) = 'lecteur@ex.fr', 'F2 : sa propre fiche';
  assert public.est_membre(), 'F2 : reste membre';
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.membre) = 1, 'F2 : contributeur, sa fiche seulement';
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.membre) = 3, 'F2 : admin, tous les membres';
end $$;

-- F3 : un lecteur ne voit que les images que l'appli lui montre
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert exists (select 1 from storage.objects where name = 'cahiers/1/couverture.jpg'), 'F3 : couverture visible';
  assert exists (select 1 from storage.objects where name = 'cahiers/1/pages/81.jpg'), 'F3 : scan publié visible';
  assert exists (select 1 from storage.objects where name = 'filtres/type_repas/1-a.jpg'), 'F3 : image de filtre visible';
  assert exists (select 1 from storage.objects where name = 'photos/8001/validee.jpg'), 'F3 : photo validée visible';
  assert not exists (select 1 from storage.objects where name = 'cahiers/1/pages/82.jpg'), 'F3 : scan en brouillon caché';
  assert not exists (select 1 from storage.objects where name = 'photos/8001/attente-autre.jpg'), 'F3 : photo en attente d''un autre cachée';
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from storage.objects) = 6, 'F3 : contributeur, toutes les images';
end $$;

-- F4 et F5 : un lecteur ne propose une photo que sous photos/<id de la recette>/
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into storage.objects (bucket_id, name) values ('images', 'photos/8001/mienne.jpg');
insert into public.photo (recette_id, image_chemin) values (8001, 'photos/8001/mienne.jpg');
do $$ begin
  assert exists (select 1 from storage.objects where name = 'photos/8001/mienne.jpg'), 'F3 : sa propre photo visible';
  begin
    insert into public.photo (recette_id, image_chemin) values (8001, 'cahiers/1/pages/81.jpg');
    raise exception 'F4 : une photo ne doit pas pointer vers un scan';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.photo (recette_id, image_chemin) values (8001, 'photos/8002/x.jpg');
    raise exception 'F4 : une photo doit être rangée sous sa recette';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('images', 'photos/8002/spam.jpg');
    raise exception 'F5 : pas d''envoi pour un brouillon invisible';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('images', 'photos/abc/spam.jpg');
    raise exception 'F5 : chemin invalide refusé';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('images', 'photos/8001/sous/dossier.jpg');
    raise exception 'F5 : sous-dossier refusé';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Anonyme : toujours rien
set role anon;
set request.jwt.claim.sub = '';
do $$ begin
  assert (select count(*) from storage.objects) = 0, 'anonyme : aucune image';
  assert (select count(*) from public.membre) = 0, 'anonyme : aucun membre';
end $$;

reset role;
delete from public.photo;
delete from storage.objects;
delete from public.recette where id in (8001, 8002);
delete from public.page_scannee where id in (8001, 8002);
select 'Tous les tests de sécurité passent' as resultat;
