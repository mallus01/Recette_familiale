-- Tests des invitations (US-33). Lancer après rls.sql et seed.sql.
\set ON_ERROR_STOP on
set client_min_messages = warning;

reset role;
delete from auth.users where email in ('invite@ex.fr', 'direct@ex.fr');
delete from public.invitation where email in ('invite@ex.fr', 'direct@ex.fr');
update public.membre set prenom = 'Ada', nom = 'Lovelace' where id = '00000000-0000-0000-0000-00000000000a';

-- Lecteur et contributeur : pas d'accès aux invitations
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  begin
    insert into public.invitation (email, role) values ('pirate@ex.fr', 'admin');
    raise exception 'un contributeur ne doit pas inviter';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Admin : invite un contributeur
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into public.invitation (email, role, invite_par)
values ('Invite@ex.fr', 'contributeur', '00000000-0000-0000-0000-00000000000a');
reset role;

-- Supabase crée le compte à l'envoi de l'invitation : le rôle prévu est appliqué
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'invite@ex.fr');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d2', 'direct@ex.fr');
do $$ begin
  assert (select role from public.membre where email = 'invite@ex.fr') = 'contributeur', 'rôle de l''invitation';
  assert (select role from public.membre where email = 'direct@ex.fr') = 'lecteur', 'sans invitation : lecteur';
end $$;

-- L'invité ouvre le lien, voit qui l'invite, complète son profil
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
do $$ begin
  assert (select invite_par = 'Ada L.' and role = 'contributeur' and email = 'invite@ex.fr' from public.mon_invitation()),
         'qui invite, avec quel rôle';
  assert not exists (select 1 from public.invitation), 'invitations invisibles pour l''invité';
end $$;
select public.accepter_invitation();
select public.completer_profil('  Claire ', ' Dupont ');
do $$ begin
  begin
    perform public.completer_profil('Claire', ' ');
    raise exception 'le nom est obligatoire';
  exception when check_violation then null;
  end;
end $$;
reset role;

do $$ begin
  assert (select acceptee_le is not null from public.invitation where email = 'Invite@ex.fr'), 'invitation acceptée';
  assert (select prenom = 'Claire' and nom = 'Dupont' from public.membre where email = 'invite@ex.fr'), 'profil complété';
end $$;

delete from auth.users where email in ('invite@ex.fr', 'direct@ex.fr');
delete from public.invitation where email in ('Invite@ex.fr', 'direct@ex.fr');
\echo 'Tous les tests d''invitation passent'
