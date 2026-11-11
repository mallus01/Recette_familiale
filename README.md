# Recettes familiales

Webapp privée qui rassemble les recettes de la famille et numérise les cahiers manuscrits. Mobile first, installable (PWA).

Le cadrage est dans `docs/` (le cahier des charges fait foi) et les consignes pour Claude Code dans `CLAUDE.md`.

## Lancer en local

Prérequis : Node.js 20.9 ou plus récent.

Copier `.env.example` en `.env.local` et y mettre l'URL et la clé publishable du projet Supabase.

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build && npm start   # version de production, avec le service worker
```

## Stack

- Next.js 16 (App Router) + Tailwind CSS 4
- PWA sans librairie : manifeste `src/app/manifest.ts`, service worker `public/sw.js` (page hors connexion), icônes dans `public/icons/` et `src/app/` (générées par `scripts/generer-icones.py`)
- Supabase : schéma et règles d'accès dans `supabase/`
- Connexion : Supabase Auth (lien magique et code dans un seul e-mail, via Brevo) ; réglages dans `docs/guide-connexion.md`
- Anti-pause : tâche GitHub Actions quotidienne (`.github/workflows/anti-pause.yml`) ; réglages dans `docs/guide-anti-pause.md`
- À venir : modèle d'IA de vision

## Base Supabase

Le schéma est versionné dans `supabase/migrations/` (une migration par évolution, jamais modifiée après application).

1. Créer un projet sur supabase.com (offre gratuite).
2. Dans SQL Editor, coller et exécuter chaque fichier de `supabase/migrations/` dans l'ordre de leur nom, puis `supabase/seed.sql` pour les valeurs d'exemple des listes fermées.
3. Vérifier dans Table Editor que les 14 tables sont là, avec RLS activé (cadenas).

Tester les règles d'accès sur un Postgres local (sans Supabase) :

```bash
createdb essai
psql -d essai -f supabase/tests/stub-supabase.sql
psql -d essai -f supabase/migrations/20261106230000_schema_v1.sql
psql -d essai -f supabase/migrations/20261106240000_anti_pause.sql
psql -d essai -f supabase/migrations/20261107120000_stockage_images.sql
psql -d essai -f supabase/migrations/20261107160000_lecture_ia.sql
psql -d essai -f supabase/migrations/20261107170000_comparaison_ia.sql
psql -d essai -f supabase/migrations/20261108090000_relecture.sql
psql -d essai -f supabase/migrations/20261108100000_notes_etapes.sql
psql -d essai -f supabase/migrations/20261108110000_tags_recette.sql
psql -d essai -f supabase/migrations/20261111090000_publication.sql
psql -d essai -f supabase/migrations/20261112090000_accueil.sql
psql -d essai -f supabase/migrations/20261112100000_invitations.sql
psql -d essai -f supabase/migrations/20261113090000_photos.sql
psql -d essai -f supabase/migrations/20261114090000_separer_fusionner.sql
psql -d essai -f supabase/migrations/20261115090000_test_ab.sql
psql -d essai -f supabase/seed.sql
psql -d essai -f supabase/tests/rls.sql        # « Tous les tests RLS passent »
psql -d essai -f supabase/tests/stockage.sql   # « Tous les tests de stockage passent »
psql -d essai -f supabase/tests/lecture.sql    # « Tous les tests de lecture passent »
psql -d essai -f supabase/tests/relecture.sql  # « Tous les tests de relecture passent »
psql -d essai -f supabase/tests/tags.sql       # « Tous les tests de tags passent »
psql -d essai -f supabase/tests/publication.sql # « Tous les tests de publication passent »
psql -d essai -f supabase/tests/accueil.sql     # « Tous les tests de l'accueil passent »
psql -d essai -f supabase/tests/invitations.sql # « Tous les tests d'invitation passent »
psql -d essai -f supabase/tests/photos.sql      # « Tous les tests des photos passent »
psql -d essai -f supabase/tests/separer-fusionner.sql # « Tous les tests de séparation et fusion passent »
psql -d essai -f supabase/tests/test-ab.sql     # « Tous les tests du test A/B passent »
```

## Déploiement sur Vercel

1. Sur vercel.com, Add New → Project, puis importer le dépôt GitHub `mallus01/Recette_familiale`.
2. Garder les réglages proposés (framework Next.js détecté automatiquement) et cliquer sur Deploy.
3. Chaque envoi sur `main` déploie la production ; chaque pull request reçoit son propre lien de prévisualisation.

## Installer l'appli sur le téléphone

- iPhone (Safari) : bouton Partager, puis Sur l'écran d'accueil.
- Android (Chrome) : menu ⋮, puis Installer l'application.
