# Régler la tâche anti-pause (US-05)

Un projet Supabase gratuit se met en pause après 7 jours sans activité. Une tâche GitHub Actions interroge la base chaque jour vers 6 h 17 (UTC) pour l'éviter. Si elle échoue, GitHub vous envoie un e-mail.

## 1. Ajouter la fonction dans la base

Supabase → SQL Editor : coller le contenu de `supabase/migrations/20261106240000_anti_pause.sql`, puis Run. Résultat attendu : « Success. No rows returned ».

## 2. Donner l'adresse de la base à GitHub

Sur github.com, dépôt `Recette_familiale` → Settings → Secrets and variables → Actions → New repository secret. Créer deux secrets, avec les mêmes valeurs que dans Vercel :

| Name | Secret |
| --- | --- |
| `SUPABASE_URL` | la Project URL (`https://….supabase.co`) |
| `SUPABASE_PUBLISHABLE_KEY` | la clé publishable (ou anon) |

## 3. Tester à la main

Dépôt → onglet Actions → « Anti-pause Supabase » → Run workflow. Après quelques secondes, la ligne doit passer au vert, et le détail afficher « La base a répondu : » suivi de la date du jour.

## 4. Vérifier l'alerte par e-mail

github.com → photo de profil → Settings → Notifications → section **Actions** : cocher **Email** et **Only notify for failed workflows**. GitHub prévient le compte qui a créé ou modifié la tâche planifiée, c'est-à-dire le propriétaire du dépôt.

## Bon à savoir

- La requête n'utilise que la clé publique et ne lit aucune donnée de l'appli.
- Si le dépôt devenait public, GitHub désactive les tâches planifiées après 60 jours sans activité sur le dépôt. Ce n'est pas le cas d'un dépôt privé.
