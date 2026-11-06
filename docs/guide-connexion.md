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

En V1, le compte est créé à la main (US-04) : Authentication → Users → Add user → Create new user, avec votre e-mail et sans mot de passe (cocher Auto Confirm User). Le trigger de la base crée la fiche membre.

## Comportement attendu

- Une adresse inconnue ne reçoit rien, mais l'écran affiche la même chose que pour une adresse connue, pour ne pas révéler qui a un compte.
- Renvoyer l'e-mail est possible après 60 secondes (limite de Supabase).
- La session dure 30 jours sur l'appareil, et repart pour 30 jours à chaque utilisation de l'appli.
