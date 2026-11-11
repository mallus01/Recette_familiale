# Régler la connexion (US-03)

Réglages à faire une fois, dans Supabase, Brevo et Vercel. Aucun secret n'est stocké dans le code.

## 1. Brevo : expéditeur et clé SMTP

1. Créer un compte gratuit sur brevo.com.
2. Senders, Domains & Dedicated IPs → Senders : ajouter et valider l'adresse d'expédition (par exemple votre adresse personnelle).
3. SMTP & API → SMTP : noter le serveur (`smtp-relay.brevo.com`), le port (`587`), l'identifiant (login SMTP) et générer une clé SMTP.

## 2. Supabase : e-mails via Brevo

Authentication → Emails → SMTP Settings → Enable custom SMTP :

| Champ | Valeur |
| --- | --- |
| Sender email | l'adresse validée dans Brevo |
| Sender name | Recettes familiales |
| Host | smtp-relay.brevo.com |
| Port | 587 |
| Username | le login SMTP Brevo |
| Password | la clé SMTP Brevo |

## 3. Supabase : un seul e-mail avec le lien et le code

1. Authentication → Emails → Templates → **Magic Link** : sujet `Votre connexion à Recettes familiales`, corps = contenu de `supabase/templates/connexion.html`.
2. Authentication → Sign In / Providers → Email : **Email OTP Expiration** = `900` secondes (15 min) et **Email OTP Length** = `6`.
3. Authentication → Sign In / Providers : désactiver **Allow new users to sign up** (aucune inscription publique).
4. Authentication → URL Configuration : **Site URL** = l'adresse de production Vercel (par exemple `https://recette-familiale.vercel.app`). Ajouter aussi `http://localhost:3000/**` dans Redirect URLs pour tester en local.

## 4. Clés Supabase dans Vercel et en local

Project Settings → API Keys : copier l'URL du projet et la clé **publishable** (ou la clé `anon` des anciens projets).

- Vercel → projet → Settings → Environment Variables : ajouter `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Production et Preview), puis redéployer.
- En local : copier `.env.example` en `.env.local` et y mettre les mêmes valeurs.

## 5. Créer votre compte

En V1, le compte est créé à la main (US-04) :

1. Authentication → Users → Add user → Create new user, avec votre e-mail et sans mot de passe (cocher Auto Confirm User). La base crée la fiche membre avec le rôle lecteur.
2. SQL Editor : coller le contenu de `supabase/scripts/definir-admin.sql`, remplacer `votre.adresse@exemple.fr` par votre adresse, puis Run. Le résultat doit afficher votre adresse avec le rôle `admin`.
3. Se connecter à l'appli : l'accueil affiche « Connecté avec … · Administrateur ».

## Comportement attendu

- Une adresse inconnue ne reçoit rien, mais l'écran affiche la même chose que pour une adresse connue, pour ne pas révéler qui a un compte.
- Renvoyer l'e-mail est possible après 60 secondes (limite de Supabase).
- La session dure 30 jours sur l'appareil, et repart pour 30 jours à chaque utilisation de l'appli.

## 6. Inviter des membres (US-33)

À faire une seule fois, avant la première invitation :

1. SQL Editor : coller le contenu de `supabase/migrations/20261112100000_invitations.sql`, puis Run.
2. Authentication → Emails → Templates → **Invite user** : sujet `Vous êtes invité à rejoindre Recettes familiales`, corps = contenu de `supabase/templates/invitation.html`.
3. Project Settings → API Keys → **Secret keys** : copier une clé secrète (`sb_secret_…`), puis dans Vercel → Settings → Environment Variables ajouter `SUPABASE_SECRET_KEY` avec cette valeur (Production et Preview, cocher Sensitive), puis redéployer. Cette clé donne tous les droits sur la base : elle ne va jamais dans le code ni dans un message.

Ensuite : Profil → **Inviter et gérer les membres** → Inviter un membre. L'invité reçoit un e-mail (envoyé par Brevo), valable 15 minutes ; en ouvrant le lien, il arrive sur la page Bienvenue, où il saisit son prénom et son nom. Si le lien a expiré, l'invitation passe dans « Invitations expirées » avec un bouton Renvoyer.
