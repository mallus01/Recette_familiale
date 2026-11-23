-- V4 · Sprint 11 : listes créées par chaque membre (US-53 à US-55), en plus de Favoris
-- et À cuisiner. Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.
--
-- Comme Favoris et À cuisiner, ces listes sont privées, y compris vis-à-vis de l'admin.

create table if not exists public.liste_membre (
  id bigint generated always as identity primary key,
  membre_id uuid not null default auth.uid() references public.membre (id) on delete cascade,
  nom text not null check (length(trim(nom)) between 1 and 60),
  cree_le timestamptz not null default now()
);

-- Deux listes d'un même membre ne portent pas le même nom, sans tenir compte des majuscules.
create unique index if not exists liste_membre_nom_unique
  on public.liste_membre (membre_id, lower(trim(nom)));

create table if not exists public.liste_membre_recette (
  liste_id bigint not null references public.liste_membre (id) on delete cascade,
  recette_id bigint not null references public.recette (id) on delete cascade,
  ajoute_le timestamptz not null default now(),
  primary key (liste_id, recette_id)
);
create index if not exists liste_membre_recette_recette_idx on public.liste_membre_recette (recette_id);

alter table public.liste_membre enable row level security;
alter table public.liste_membre_recette enable row level security;
grant select, insert, update, delete on public.liste_membre, public.liste_membre_recette to authenticated;
revoke all on public.liste_membre, public.liste_membre_recette from anon;

drop policy if exists "chacun ses listes créées" on public.liste_membre;
create policy "chacun ses listes créées" on public.liste_membre
  for all to authenticated
  using (membre_id = auth.uid())
  with check (membre_id = auth.uid());

drop policy if exists "chacun les recettes de ses listes" on public.liste_membre_recette;
create policy "chacun les recettes de ses listes" on public.liste_membre_recette
  for all to authenticated
  using (exists (select 1 from public.liste_membre l where l.id = liste_id and l.membre_id = auth.uid()))
  with check (
    exists (select 1 from public.liste_membre l where l.id = liste_id and l.membre_id = auth.uid())
    and public.recette_visible(recette_id)
  );
