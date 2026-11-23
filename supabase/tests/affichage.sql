-- Tests des réglages d'affichage (US-56 et US-57). Lancer après rls.sql et seed.sql.
\set ON_ERROR_STOP on
set client_min_messages = warning;

reset role;
update public.membre set taille_texte = 'normale', contraste_renforce = false;

-- Lecteur : règle son affichage, sans toucher aux autres membres ni à son rôle
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin perform public.regler_affichage('tres_grande', true); end $$;
do $$ begin
  begin
    perform public.regler_affichage('enorme', false);
    raise exception 'taille inconnue refusée';
  exception when check_violation then null;
  end;
end $$;
reset role;

do $$ begin
  assert (select taille_texte = 'tres_grande' and contraste_renforce and role = 'lecteur'
          from public.membre where id = '00000000-0000-0000-0000-00000000000b'), 'réglage du lecteur gardé';
  assert (select count(*) from public.membre where taille_texte <> 'normale' or contraste_renforce) = 1,
         'les autres membres ne changent pas';
end $$;
update public.membre set taille_texte = 'normale', contraste_renforce = false;

\echo 'Tous les tests d''affichage passent'
