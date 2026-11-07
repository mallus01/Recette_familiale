-- US-11 : comparaison des modèles d'IA sur de vraies pages.
-- Rejouable : peut être collée plusieurs fois dans SQL Editor sans erreur.
-- Outil de développement réservé à l'administrateur ; n'écrit aucune recette.

create table if not exists public.comparaison_lecture (
  id bigint generated always as identity primary key,
  page_id bigint not null references public.page_scannee (id) on delete cascade,
  fournisseur text not null check (fournisseur in ('claude', 'gemini', 'simulee')),
  modele text,
  statut text not null default 'en_cours' check (statut in ('en_cours', 'terminee', 'en_echec')),
  resultat jsonb,
  erreur text,
  duree_ms integer,
  jetons_entree integer,
  jetons_sortie integer,
  cout_dollars numeric,
  nb_erreurs integer check (nb_erreurs >= 0), -- relevé à la main en comparant au scan
  cree_le timestamptz not null default now(),
  unique (page_id, fournisseur)
);

alter table public.comparaison_lecture enable row level security;

drop policy if exists "comparaisons réservées à l'admin" on public.comparaison_lecture;
create policy "comparaisons réservées à l'admin" on public.comparaison_lecture
  for all to authenticated using (public.est_admin()) with check (public.est_admin());
