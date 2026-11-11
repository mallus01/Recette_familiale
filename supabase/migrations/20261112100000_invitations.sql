-- US-33 : inviter des membres depuis l'interface d'administration.
-- Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.
--
-- L'envoi de l'e-mail passe par l'invitation native de Supabase (côté serveur, clé
-- secrète). Cette table garde la trace de chaque invitation : rôle prévu, qui invite,
-- date d'envoi (pour le temps restant) et date d'acceptation.

create table if not exists public.invitation (
  id bigint generated always as identity primary key,
  email text not null,
  role public.role_membre not null default 'lecteur',
  invite_par uuid references public.membre (id) on delete set null,
  envoyee_le timestamptz not null default now(),
  acceptee_le timestamptz
);

create index if not exists invitation_email on public.invitation (lower(email));

alter table public.invitation enable row level security;

drop policy if exists "invitations gérées par l'admin" on public.invitation;
create policy "invitations gérées par l'admin" on public.invitation
  for all to authenticated using (public.est_admin()) with check (public.est_admin());

-- À la création du compte (invitation envoyée), le membre reçoit le rôle prévu par sa
-- dernière invitation non acceptée ; sans invitation (compte créé dans Supabase), lecteur.
create or replace function public.creer_membre()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.membre (id, email, prenom, nom, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'prenom',
    new.raw_user_meta_data ->> 'nom',
    coalesce(
      (select i.role from public.invitation i
       where lower(i.email) = lower(new.email) and i.acceptee_le is null
       order by i.envoyee_le desc limit 1),
      'lecteur'
    )
  );
  return new;
end;
$$;

-- Appelée quand l'invité ouvre le lien de son e-mail : l'invitation est acceptée.
create or replace function public.accepter_invitation()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.invitation
  set acceptee_le = now()
  where acceptee_le is null
    and lower(email) = lower((select m.email from public.membre m where m.id = auth.uid()));
$$;

grant execute on function public.accepter_invitation() to authenticated;

-- Page d'accueil de l'invité : qui l'invite et avec quel rôle.
create or replace function public.mon_invitation()
returns table (email text, role public.role_membre, invite_par text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.email, m.role,
    nullif(trim(concat(a.prenom, ' ', left(a.nom, 1) || '.')), '')
  from public.membre m
  left join lateral (
    select i.invite_par from public.invitation i
    where lower(i.email) = lower(m.email)
    order by i.envoyee_le desc limit 1
  ) i on true
  left join public.membre a on a.id = i.invite_par
  where m.id = auth.uid();
$$;

grant execute on function public.mon_invitation() to authenticated;

-- L'invité saisit son prénom et son nom de famille (seule l'initiale du nom s'affiche).
create or replace function public.completer_profil(p_prenom text, p_nom text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(trim(p_prenom), '') is null or nullif(trim(p_nom), '') is null then
    raise exception 'prénom et nom obligatoires' using errcode = 'check_violation';
  end if;
  update public.membre set prenom = trim(p_prenom), nom = trim(p_nom) where id = auth.uid();
end;
$$;

grant execute on function public.completer_profil(text, text) to authenticated;
