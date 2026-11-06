-- US-02 · Schéma de la V1 (voir docs/cahier-des-charges.md, section Modèle de données)
--
-- Noms d'entités en français, sans accents, en snake_case.
-- Les jetons de connexion, les sessions et les invitations sont gérés par Supabase Auth :
-- aucune table n'est créée pour eux.
-- La table des photos proposées arrivera avec la V2 (photos proposées et validation).
-- Les images (couvertures, scans, images des listes fermées) sont des chemins dans Supabase Storage.

-- ---------------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------------

create type public.role_membre as enum ('admin', 'contributeur', 'lecteur');
create type public.statut_page as enum ('en_attente', 'lecture_en_cours', 'prete', 'en_echec');
create type public.statut_recette as enum ('brouillon', 'publiee');
create type public.origine_note as enum ('cahier', 'membre');
create type public.type_liste as enum ('favori', 'a_cuisiner');

-- ---------------------------------------------------------------------------
-- Membres
-- ---------------------------------------------------------------------------

create table public.membre (
  id uuid primary key references auth.users (id) on delete cascade,
  prenom text,
  nom text, -- stocké en entier, seule l'initiale est affichée
  email text not null unique,
  role public.role_membre not null default 'lecteur',
  cree_le timestamptz not null default now()
);

-- Crée la fiche membre à la création d'un compte Supabase Auth.
create function public.creer_membre()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.membre (id, email, prenom, nom)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'prenom',
    new.raw_user_meta_data ->> 'nom'
  );
  return new;
end;
$$;

create trigger creer_membre_apres_inscription
  after insert on auth.users
  for each row execute function public.creer_membre();

-- Rôle du membre connecté (null si non connecté ou inconnu).
create function public.role_actuel()
returns public.role_membre
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.membre where id = auth.uid();
$$;

create function public.est_membre()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.role_actuel() is not null;
$$;

create function public.est_contributeur()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.role_actuel() in ('admin', 'contributeur'), false);
$$;

create function public.est_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.role_actuel() = 'admin', false);
$$;

-- ---------------------------------------------------------------------------
-- Organisation : listes fermées
-- ---------------------------------------------------------------------------

create table public.type_repas (
  id bigint generated always as identity primary key,
  nom text not null unique,
  image_chemin text -- null : icône par défaut
);

create table public.occasion (
  id bigint generated always as identity primary key,
  nom text not null unique,
  image_chemin text
);

-- ---------------------------------------------------------------------------
-- Cœur des recettes
-- ---------------------------------------------------------------------------

create table public.cahier (
  id bigint generated always as identity primary key,
  nom text not null,
  description text,
  couverture_chemin text, -- première photo du cahier, jamais envoyée à l'IA
  cree_par uuid references public.membre (id) on delete set null,
  cree_le timestamptz not null default now()
);

create table public.page_scannee (
  id bigint generated always as identity primary key,
  cahier_id bigint not null references public.cahier (id) on delete cascade,
  numero integer not null check (numero > 0),
  image_chemin text not null,
  statut public.statut_page not null default 'en_attente',
  nb_mots_douteux integer not null default 0 check (nb_mots_douteux >= 0),
  cree_le timestamptz not null default now(),
  unique (cahier_id, numero)
);

create table public.recette (
  id bigint generated always as identity primary key,
  titre text not null,
  transmis_par text, -- texte libre
  souvenir text,
  portions integer check (portions > 0),
  duree_minutes integer check (duree_minutes > 0),
  classique boolean not null default false,
  statut public.statut_recette not null default 'brouillon',
  type_repas_id bigint references public.type_repas (id) on delete set null,
  cree_par uuid references public.membre (id) on delete set null, -- null : « Ancien membre »
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

-- Une page peut contenir plusieurs recettes, une recette s'étaler sur plusieurs pages.
create table public.recette_page (
  recette_id bigint not null references public.recette (id) on delete cascade,
  page_id bigint not null references public.page_scannee (id) on delete cascade,
  ordre integer not null default 1,
  primary key (recette_id, page_id)
);

create table public.recette_occasion (
  recette_id bigint not null references public.recette (id) on delete cascade,
  occasion_id bigint not null references public.occasion (id) on delete cascade,
  primary key (recette_id, occasion_id)
);

create table public.groupe_ingredients (
  id bigint generated always as identity primary key,
  recette_id bigint not null references public.recette (id) on delete cascade,
  nom text, -- « pour la pâte » ; null pour le groupe unique sans titre
  ordre integer not null default 1
);

create table public.ingredient (
  id bigint generated always as identity primary key,
  groupe_id bigint not null references public.groupe_ingredients (id) on delete cascade,
  quantite numeric check (quantite >= 0), -- null : ingrédient sans quantité (« sel »)
  unite text,
  nom text not null,
  texte_origine text, -- mesure d'époque telle qu'écrite dans le cahier
  ordre integer not null default 1
);

create table public.etape (
  id bigint generated always as identity primary key,
  recette_id bigint not null references public.recette (id) on delete cascade,
  ordre integer not null,
  texte text not null
);

-- Ingrédients utilisés par une étape (surlignage en mode cuisine, V2).
create table public.etape_ingredient (
  etape_id bigint not null references public.etape (id) on delete cascade,
  ingredient_id bigint not null references public.ingredient (id) on delete cascade,
  primary key (etape_id, ingredient_id)
);

create table public.note (
  id bigint generated always as identity primary key,
  recette_id bigint not null references public.recette (id) on delete cascade,
  etape_id bigint references public.etape (id) on delete set null, -- null : note de la recette
  texte text not null,
  origine public.origine_note not null default 'cahier'
);

create table public.liste_perso (
  membre_id uuid not null references public.membre (id) on delete cascade,
  recette_id bigint not null references public.recette (id) on delete cascade,
  type public.type_liste not null,
  ajoute_le timestamptz not null default now(),
  primary key (membre_id, recette_id, type)
);

-- Index sur les clés étrangères les plus parcourues
create index on public.page_scannee (statut);
create index on public.recette (type_repas_id);
create index on public.recette (statut);
create index on public.recette_page (page_id);
create index on public.recette_occasion (occasion_id);
create index on public.groupe_ingredients (recette_id);
create index on public.ingredient (groupe_id);
create index on public.etape (recette_id);
create index on public.etape_ingredient (ingredient_id);
create index on public.note (recette_id);
create index on public.liste_perso (recette_id);

-- Date de modification tenue à jour automatiquement
create function public.toucher_modifie_le()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.modifie_le = now();
  return new;
end;
$$;

create trigger recette_modifie_le
  before update on public.recette
  for each row execute function public.toucher_modifie_le();

-- ---------------------------------------------------------------------------
-- Règles d'accès (Row Level Security)
--
-- Lecteur : lit les recettes publiées, gère ses propres listes.
-- Contributeur : lit tout, crée et modifie cahiers, pages et recettes.
-- Admin : comme contributeur, plus les listes fermées et les rôles.
-- Listes perso : chaque membre ne voit et ne modifie que les siennes, admin compris.
-- ---------------------------------------------------------------------------

-- Une recette est lisible si elle est publiée, ou si le membre est contributeur.
create function public.recette_visible(id_recette bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.est_contributeur()
    or (
      public.est_membre()
      and exists (select 1 from public.recette r where r.id = id_recette and r.statut = 'publiee')
    );
$$;

alter table public.membre enable row level security;
alter table public.type_repas enable row level security;
alter table public.occasion enable row level security;
alter table public.cahier enable row level security;
alter table public.page_scannee enable row level security;
alter table public.recette enable row level security;
alter table public.recette_page enable row level security;
alter table public.recette_occasion enable row level security;
alter table public.groupe_ingredients enable row level security;
alter table public.ingredient enable row level security;
alter table public.etape enable row level security;
alter table public.etape_ingredient enable row level security;
alter table public.note enable row level security;
alter table public.liste_perso enable row level security;

-- Membres : tout membre voit les autres (pour afficher un auteur) ; seul l'admin les modifie.
create policy "membres lisibles par les membres" on public.membre
  for select to authenticated using (public.est_membre());
create policy "membres gérés par l'admin" on public.membre
  for update to authenticated using (public.est_admin()) with check (public.est_admin());

-- Listes fermées : lues par tous les membres, gérées par l'admin (US-15).
create policy "types de repas lisibles" on public.type_repas
  for select to authenticated using (public.est_membre());
create policy "types de repas gérés par l'admin" on public.type_repas
  for all to authenticated using (public.est_admin()) with check (public.est_admin());

create policy "occasions lisibles" on public.occasion
  for select to authenticated using (public.est_membre());
create policy "occasions gérées par l'admin" on public.occasion
  for all to authenticated using (public.est_admin()) with check (public.est_admin());

-- Cahiers : lus par tous les membres, écrits par les contributeurs.
create policy "cahiers lisibles" on public.cahier
  for select to authenticated using (public.est_membre());
create policy "cahiers écrits par les contributeurs" on public.cahier
  for all to authenticated using (public.est_contributeur()) with check (public.est_contributeur());

-- Pages scannées : outil de numérisation, réservé aux contributeurs.
create policy "pages réservées aux contributeurs" on public.page_scannee
  for all to authenticated using (public.est_contributeur()) with check (public.est_contributeur());

-- Recettes et leur contenu : lecture si visible, écriture par les contributeurs.
create policy "recettes lisibles" on public.recette
  for select to authenticated using (public.recette_visible(id));
create policy "recettes écrites par les contributeurs" on public.recette
  for all to authenticated using (public.est_contributeur()) with check (public.est_contributeur());

create policy "liens recette-page lisibles" on public.recette_page
  for select to authenticated using (public.recette_visible(recette_id));
create policy "liens recette-page écrits par les contributeurs" on public.recette_page
  for all to authenticated using (public.est_contributeur()) with check (public.est_contributeur());

create policy "occasions de recette lisibles" on public.recette_occasion
  for select to authenticated using (public.recette_visible(recette_id));
create policy "occasions de recette écrites par les contributeurs" on public.recette_occasion
  for all to authenticated using (public.est_contributeur()) with check (public.est_contributeur());

create policy "groupes lisibles" on public.groupe_ingredients
  for select to authenticated using (public.recette_visible(recette_id));
create policy "groupes écrits par les contributeurs" on public.groupe_ingredients
  for all to authenticated using (public.est_contributeur()) with check (public.est_contributeur());

create policy "ingrédients lisibles" on public.ingredient
  for select to authenticated using (
    public.recette_visible((select g.recette_id from public.groupe_ingredients g where g.id = groupe_id))
  );
create policy "ingrédients écrits par les contributeurs" on public.ingredient
  for all to authenticated using (public.est_contributeur()) with check (public.est_contributeur());

create policy "étapes lisibles" on public.etape
  for select to authenticated using (public.recette_visible(recette_id));
create policy "étapes écrites par les contributeurs" on public.etape
  for all to authenticated using (public.est_contributeur()) with check (public.est_contributeur());

create policy "ingrédients d'étape lisibles" on public.etape_ingredient
  for select to authenticated using (
    public.recette_visible((select e.recette_id from public.etape e where e.id = etape_id))
  );
create policy "ingrédients d'étape écrits par les contributeurs" on public.etape_ingredient
  for all to authenticated using (public.est_contributeur()) with check (public.est_contributeur());

create policy "notes lisibles" on public.note
  for select to authenticated using (public.recette_visible(recette_id));
create policy "notes écrites par les contributeurs" on public.note
  for all to authenticated using (public.est_contributeur()) with check (public.est_contributeur());

-- Listes perso : privées, y compris vis-à-vis de l'admin.
create policy "chacun ses listes" on public.liste_perso
  for all to authenticated
  using (membre_id = auth.uid())
  with check (membre_id = auth.uid() and public.recette_visible(recette_id));
