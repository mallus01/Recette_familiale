# Recettes familiales

Webapp privée qui rassemble les recettes de la famille et numérise les cahiers manuscrits. Mobile first, installable (PWA).

Le cadrage est dans `docs/` (le cahier des charges fait foi) et les consignes pour Claude Code dans `CLAUDE.md`.

## Lancer en local

Prérequis : Node.js 20.9 ou plus récent.

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
- À venir : connexion Supabase Auth, Brevo (e-mails), modèle d'IA de vision

## Base Supabase

Le schéma est versionné dans `supabase/migrations/` (une migration par évolution, jamais modifiée après application).

1. Créer un projet sur supabase.com (offre gratuite).
2. Dans SQL Editor, coller et exécuter le contenu de `supabase/migrations/20261106230000_schema_v1.sql`, puis `supabase/seed.sql` pour les valeurs d'exemple des listes fermées.
3. Vérifier dans Table Editor que les 14 tables sont là, avec RLS activé (cadenas).

Tester les règles d'accès sur un Postgres local (sans Supabase) :

```bash
createdb essai
psql -d essai -f supabase/tests/stub-supabase.sql
psql -d essai -f supabase/migrations/20261106230000_schema_v1.sql
psql -d essai -f supabase/seed.sql
psql -d essai -f supabase/tests/rls.sql   # affiche « Tous les tests RLS passent »
```

## Déploiement sur Vercel

1. Sur vercel.com, Add New → Project, puis importer le dépôt GitHub `mallus01/Recette_familiale`.
2. Garder les réglages proposés (framework Next.js détecté automatiquement) et cliquer sur Deploy.
3. Chaque envoi sur `main` déploie la production ; chaque pull request reçoit son propre lien de prévisualisation.

## Installer l'appli sur le téléphone

- iPhone (Safari) : bouton Partager, puis Sur l'écran d'accueil.
- Android (Chrome) : menu ⋮, puis Installer l'application.
