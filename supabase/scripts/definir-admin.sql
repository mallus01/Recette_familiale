-- US-04 · Donner le rôle admin au compte du porteur de projet.
-- À exécuter dans Supabase → SQL Editor, après avoir créé le compte
-- (Authentication → Users → Add user). Remplacer l'adresse ci-dessous.
-- Rejouable sans risque : il ne fait que fixer le rôle.

do $$
declare
  adresse constant text := 'votre.adresse@exemple.fr';
begin
  -- Crée la fiche membre si le compte existait avant le schéma (trigger absent à l'époque).
  insert into public.membre (id, email)
  select id, email from auth.users where lower(email) = lower(adresse)
  on conflict (id) do nothing;

  update public.membre set role = 'admin' where lower(email) = lower(adresse);

  if not found then
    raise exception 'Aucun compte avec l''adresse %. Créez-le d''abord dans Authentication → Users.', adresse;
  end if;
end $$;

-- Vérification : doit afficher votre adresse avec le rôle admin.
select email, role from public.membre order by cree_le;
