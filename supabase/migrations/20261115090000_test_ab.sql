-- V3 · Sprint 9 : test A/B des grandes cartes de la rangée À cuisiner (US-48 à US-50).
-- Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.
--
-- Chaque membre reçoit une variante au hasard (en équilibrant les effectifs), gardée sur
-- tous ses appareils. Les mesures sont anonymes pour l'administrateur : il ne voit que des
-- totaux par variante, jamais les recettes de la liste À cuisiner d'un membre.

create table if not exists public.test_ab (
  code text primary key,
  libelle text not null,
  variantes text[] not null,
  statut text not null default 'en_cours' check (statut in ('en_cours', 'termine')),
  gagnante text, -- variante appliquée à tous une fois le test terminé
  commence_le timestamptz not null default now(),
  termine_le timestamptz,
  check (gagnante is null or gagnante = any (variantes))
);

create table if not exists public.variante_membre (
  test_code text not null references public.test_ab (code) on delete cascade,
  membre_id uuid not null references public.membre (id) on delete cascade,
  variante text not null,
  attribuee_le timestamptz not null default now(),
  primary key (test_code, membre_id)
);

create table if not exists public.mesure_ab (
  id bigint generated always as identity primary key,
  test_code text not null references public.test_ab (code) on delete cascade,
  membre_id uuid not null references public.membre (id) on delete cascade,
  variante text not null,
  type text not null check (type in ('affichage', 'ouverture', 'cuisinee')),
  jour date not null default current_date,
  mesuree_le timestamptz not null default now()
);

-- Un affichage de la rangée compte une fois par jour et par membre.
create unique index if not exists mesure_ab_affichage_jour
  on public.mesure_ab (test_code, membre_id, jour) where type = 'affichage';
create index if not exists mesure_ab_test_idx on public.mesure_ab (test_code, variante, type);

insert into public.test_ab (code, libelle, variantes)
values ('cartes_a_cuisiner', 'Grandes cartes de la rangée À cuisiner', array['standard', 'grandes'])
on conflict (code) do nothing;

-- Le test et son statut sont lisibles par tous les membres ; variantes et mesures ne
-- passent que par les fonctions ci-dessous.
alter table public.test_ab enable row level security;
alter table public.variante_membre enable row level security;
alter table public.mesure_ab enable row level security;
grant select on public.test_ab to authenticated;
revoke all on public.variante_membre, public.mesure_ab from authenticated, anon;

drop policy if exists "tests lisibles par les membres" on public.test_ab;
create policy "tests lisibles par les membres" on public.test_ab
  for select to authenticated
  using (public.est_membre());

-- Variante du membre connecté : la gagnante si le test est terminé, sinon la sienne,
-- attribuée à la première visite (la moins attribuée, au hasard en cas d'égalité).
create or replace function public.variante_ab(p_test text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.test_ab;
  v text;
begin
  if not public.est_membre() then
    return null;
  end if;
  select * into t from public.test_ab where code = p_test;
  if not found then
    return null;
  end if;
  if t.statut = 'termine' then
    return t.gagnante;
  end if;
  select variante into v from public.variante_membre
  where test_code = p_test and membre_id = auth.uid();
  if v is not null then
    return v;
  end if;
  select x into v
  from unnest(t.variantes) as x
  order by (select count(*) from public.variante_membre vm
            where vm.test_code = p_test and vm.variante = x), random()
  limit 1;
  insert into public.variante_membre (test_code, membre_id, variante)
  values (p_test, auth.uid(), v)
  on conflict (test_code, membre_id) do nothing;
  return (select variante from public.variante_membre
          where test_code = p_test and membre_id = auth.uid());
end;
$$;

-- Enregistre une mesure pour le membre connecté, seulement pendant le test.
create or replace function public.mesurer_ab(p_test text, p_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v text;
begin
  if not exists (select 1 from public.test_ab where code = p_test and statut = 'en_cours') then
    return;
  end if;
  v := public.variante_ab(p_test);
  if v is null then
    return;
  end if;
  if p_type = 'affichage' then
    insert into public.mesure_ab (test_code, membre_id, variante, type)
    values (p_test, auth.uid(), v, p_type)
    on conflict (test_code, membre_id, jour) where type = 'affichage' do nothing;
  else
    insert into public.mesure_ab (test_code, membre_id, variante, type)
    values (p_test, auth.uid(), v, p_type);
  end if;
end;
$$;

-- Administrateur : essayer lui-même une autre variante pendant le test.
create or replace function public.changer_variante_ab(p_test text, p_variante text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.est_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if not exists (select 1 from public.test_ab where code = p_test and p_variante = any (variantes)) then
    raise exception 'Variante inconnue';
  end if;
  insert into public.variante_membre (test_code, membre_id, variante)
  values (p_test, auth.uid(), p_variante)
  on conflict (test_code, membre_id) do update set variante = excluded.variante, attribuee_le = now();
end;
$$;

-- Totaux par variante, pour l'administrateur.
drop function if exists public.resultats_ab(text);
create function public.resultats_ab(p_test text)
returns table (variante text, membres bigint, jours_vus bigint, ouvertures bigint, cuisinees bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.est_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  return query
  select x,
    (select count(*) from public.variante_membre vm where vm.test_code = p_test and vm.variante = x),
    (select count(*) from public.mesure_ab m where m.test_code = p_test and m.variante = x and m.type = 'affichage'),
    (select count(*) from public.mesure_ab m where m.test_code = p_test and m.variante = x and m.type = 'ouverture'),
    (select count(*) from public.mesure_ab m where m.test_code = p_test and m.variante = x and m.type = 'cuisinee')
  from public.test_ab t, unnest(t.variantes) with ordinality as u(x, n)
  where t.code = p_test
  order by n;
end;
$$;

-- Terminer le test en retenant une variante pour tous (p_gagnante), ou le reprendre
-- (p_gagnante à null) : les mesures déjà prises sont gardées.
create or replace function public.conclure_test_ab(p_test text, p_gagnante text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.est_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  update public.test_ab
  set statut = case when p_gagnante is null then 'en_cours' else 'termine' end,
      gagnante = p_gagnante,
      termine_le = case when p_gagnante is null then null else now() end
  where code = p_test;
end;
$$;

revoke execute on function public.variante_ab(text), public.mesurer_ab(text, text),
  public.changer_variante_ab(text, text), public.resultats_ab(text),
  public.conclure_test_ab(text, text) from public, anon;
grant execute on function public.variante_ab(text), public.mesurer_ab(text, text),
  public.changer_variante_ab(text, text), public.resultats_ab(text),
  public.conclure_test_ab(text, text) to authenticated;
