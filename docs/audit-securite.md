# Audit de sécurité · 23/11/2026

Audit demandé par Mattis : passer en revue les failles les plus courantes, les tester sur la plateforme, documenter et corriger chaque faille trouvée, puis recommencer jusqu'à ne plus rien trouver d'exploitable.

## Méthode

- **Référentiels** : OWASP Top 10 (2021 et 2025), OWASP API Security Top 10, CWE Top 25, plus les failles propres à Supabase (règles RLS, fonctions `security definer`, stockage, clé publique dans le navigateur) et à Next.js (routes API, server actions, en-têtes).
- **Périmètre** : tout le code du dépôt (`src/`, `supabase/`, `.github/`, `next.config.ts`), au commit `6776980` (sprint 10 fusionné).
- **Où les tests ont été faits** : sur une base Postgres locale montée avec toutes les migrations et le faux schéma Supabase (`supabase/tests/stub-supabase.sql`), et sur un serveur Next.js local (`next build` puis `next start`, navigateur Playwright). **Aucun test n'a touché le projet Supabase ni le site Vercel de production**, ni les données de la famille.
- **Modèle d'attaquant** : (1) un inconnu qui n'a que l'adresse du site et la clé publique Supabase, visible dans le code envoyé au navigateur ; (2) un membre invité au rôle le plus bas (lecteur) qui appelle l'API Supabase directement, sans passer par l'interface ; (3) un site tiers ouvert par un membre connecté (CSRF).

## Résumé

| # | Faille | Gravité | Statut |
| --- | --- | --- | --- |
| F1 | Un compte créé sans invitation devient membre | Critique si l'inscription publique est ouverte dans Supabase | Corrigée |
| F2 | Tout membre lit l'e-mail et le nom complet des autres | Moyenne | Corrigée |
| F3 | Un lecteur liste et télécharge toutes les images, dont les scans en brouillon | Moyenne | Corrigée |
| F4 | Une photo proposée peut faire supprimer un scan d'origine par l'admin | Haute | Corrigée |
| F5 | Un lecteur peut remplir le stockage avec des fichiers hors de toute recette | Basse | Corrigée |
| D1 | Routes API sans contrôle d'origine (CSRF) | Durcissement, non exploitable aujourd'hui | Ajouté |
| D2 | En-têtes de sécurité incomplets (CSP, HSTS, Permissions-Policy) | Durcissement | Ajouté |

Les correctifs base de données sont dans `supabase/migrations/20261123190000_securite.sql`, à coller dans SQL Editor (rejouable). Le test `supabase/tests/securite.sql` rejoue chaque attaque et vérifie qu'elle échoue ; il échoue sans la migration et passe avec.

## Failles trouvées et corrigées

### F1 · Inscription sans invitation (OWASP A01 Contrôle d'accès, A07 Authentification · CWE-284)

**Constat.** La fonction `creer_membre`, appelée à chaque création de compte Supabase, donnait le rôle lecteur à tout compte sans invitation. L'appli bloque l'inscription côté interface (`shouldCreateUser: false`), mais ce réglage est dans le navigateur : n'importe qui peut appeler directement `POST /auth/v1/signup` (ou `/auth/v1/otp` avec `create_user: true`) avec la clé publique.

**Exploitation (base locale).** Un compte `pirate@exemple.com` créé sans invitation obtenait une fiche membre « lecteur », lisait toutes les recettes publiées, les scans et (avec F2) la liste des membres.

**Condition.** L'attaque ne marche en production que si **Allow new users to sign up** est encore activé dans Supabase (Authentication → Sign In / Providers). Le guide de connexion demande de le désactiver ; je n'ai pas vérifié ce réglage en production, pour ne pas y créer de compte.

**Correctif.** `creer_membre` refuse désormais tout compte sans invitation en cours (erreur, le compte n'est pas créé). Seul le tout premier compte du projet, quand aucun membre n'existe encore, passe sans invitation (création de l'admin, puis `definir-admin.sql`). L'envoi d'invitations depuis Profil n'est pas touché : l'invitation est enregistrée avant la création du compte.

### F2 · Fiches des membres lisibles par tous (OWASP A01 · CWE-359)

**Constat.** La règle « membres lisibles par les membres » laissait tout membre lire, via l'API, l'e-mail et le nom de famille complet de tous les autres, alors que le cahier des charges n'affiche que l'initiale.

**Correctif.** Chacun ne lit que sa propre fiche ; l'administrateur lit toutes les fiches (gestion des membres, file des photos). Aucun autre écran ne lit la fiche d'un autre membre.

### F3 · Toutes les images lisibles par tout membre (OWASP A01 · CWE-639, IDOR)

**Constat.** La règle de lecture du bucket `images` ne vérifiait que « est membre ». Un lecteur pouvait lister le bucket et télécharger les scans des pages encore en brouillon (chemins prévisibles `cahiers/<id>/pages/<n>.jpg`) et les photos en attente des autres membres.

**Correctif.** Nouvelle fonction `image_visible(chemin)` : un contributeur voit tout ; un lecteur ne voit que les couvertures de cahiers, les scans liés à une recette publiée, les photos validées d'une recette visible, ses propres photos proposées et les images des filtres. C'est exactement ce que l'appli lui montre.

### F4 · Suppression d'un scan par une photo piégée (OWASP A01, A04 Conception · CWE-73)

**Constat.** En proposant une photo, un lecteur choisit librement le chemin de l'image (`image_chemin`). Il pouvait donc proposer une « photo » qui pointe vers un scan de cahier, par exemple `cahiers/1/pages/1.jpg`. Quand l'admin refuse la photo, l'appli supprime l'image au chemin indiqué, avec les droits de l'admin : le scan d'origine disparaît pour de bon.

**Correctif.** Double barrière :

- en base : une photo doit être rangée sous `photos/<id de sa recette>/<fichier>`, sinon elle est refusée ;
- dans l'appli : refuser ou supprimer une photo n'efface plus que des fichiers sous `photos/<id>/` (`supprimerPhotoDePlat`), ce qui protège aussi d'une éventuelle proposition piégée déjà en base.

**À vérifier en production** (lecture seule, dans SQL Editor) : `select id, recette_id, image_chemin from public.photo where image_chemin !~ '^photos/[0-9]+/';` doit ne rien renvoyer. Sinon, supprimer ces lignes dans Table Editor sans passer par Refuser.

### F5 · Envoi de fichiers hors de toute recette (OWASP A04 · CWE-400)

**Constat.** Un lecteur pouvait envoyer des fichiers sous `photos/` pour n'importe quel identifiant, même une recette inexistante ou en brouillon, et remplir le 1 Go de stockage gratuit.

**Correctif.** L'envoi n'est accepté que sous `photos/<id d'une recette qu'il voit>/<fichier>`. La limite de 2 Mo par fichier et les types JPEG et WebP restent imposés par le bucket.

## Durcissements ajoutés

### D1 · Contrôle d'origine sur les routes API (CSRF · CWE-352)

`/api/lecture` et `/api/comparaison` lancent une lecture par l'IA (coût, et remplacement des brouillons d'une page). Une requête d'un autre site n'aboutit déjà pas : les cookies de session sont en `SameSite=Lax` et ne partent pas avec un POST venu d'ailleurs. Par précaution, ces routes refusent maintenant (403) toute requête qui n'est pas du JSON ou dont l'origine n'est pas l'appli (`src/lib/meme-origine.ts`). Les server actions de l'admin ont déjà ce contrôle dans Next.js.

### D2 · En-têtes de sécurité (OWASP A05 Configuration)

Ajoutés dans `next.config.ts` pour toutes les pages :

- `Content-Security-Policy` : scripts et styles de l'appli seulement, images et appels réseau vers l'appli et Supabase, aucun plugin, aucun envoi de formulaire ailleurs, aucune intégration dans un autre site ;
- `Strict-Transport-Security` : HTTPS imposé pendant 2 ans ;
- `Permissions-Policy` : caméra pour l'appli seule (capture des cahiers), micro et position refusés ;
- `Cross-Origin-Opener-Policy: same-origin`.

Vérifié sur le serveur local : la page de connexion se charge, s'hydrate et appelle Supabase sans aucune violation de la CSP.

## Points vérifiés sans faille trouvée

| Catégorie | Vérification | Résultat |
| --- | --- | --- |
| Injection SQL (A03, CWE-89) | Toutes les requêtes passent par supabase-js ou des fonctions SQL à paramètres ; la recherche échappe `%`, `_` et `\` ; le seul filtre composé à la main (`/api/lecture`) n'utilise qu'une date calculée par le serveur | Aucune |
| XSS (A03, CWE-79) | Aucun `dangerouslySetInnerHTML`, `innerHTML` ni `eval` ; React échappe tout le texte saisi (titres, prénoms, notes) ; liens construits uniquement à partir d'identifiants numériques | Aucune |
| Redirections ouvertes (CWE-601) | `/auth/confirm` et le proxy ne redirigent que vers des chemins fixes | Aucune |
| Élévation de rôle | Un membre ne peut ni modifier sa fiche (hors prénom et nom via `completer_profil`), ni créer d'invitation, ni appeler les fonctions d'admin (`changer_variante_ab`, `resultats_ab`, `conclure_test_ab`) ; les server actions de Profil → Administration vérifient le rôle côté serveur | Aucune |
| Écriture par un lecteur | Toutes les tables de recettes, cahiers, pages, tags et listes fermées refusent l'écriture d'un lecteur ; les fonctions `security invoker` (`remplir_recette`, `enregistrer_relecture`…) restent soumises à ces règles | Aucune |
| Accès anonyme | Sans session, aucune table ni image n'est lisible ; seules `ping` (anti-pause) et des fonctions qui ne renvoient rien sans session sont appelables | Aucune |
| Listes perso | Chacun ne voit et ne modifie que les siennes, admin compris | Aucune |
| Mesures du test A/B | Tables fermées, accès uniquement par fonctions ; l'admin ne voit que des totaux | Aucune |
| Secrets (A02, CWE-798) | Aucune clé dans le code ni dans l'historique git ; `.env*` ignoré ; la clé secrète Supabase et les clés d'IA ne sont lues que côté serveur et absentes du code envoyé au navigateur (vérifié dans le build) | Aucune |
| Session et connexion (A07) | Lien et code à usage unique (Supabase) ; jeton vérifié côté serveur (`getClaims`) ; cookie `Secure` en HTTPS et `SameSite=Lax` ; messages identiques pour une adresse connue ou inconnue | Aucune |
| Envoi de fichiers (CWE-434) | Bucket privé, 2 Mo maximum, JPEG et WebP seulement, URL signées d'une heure | Aucune (hors F4, F5) |
| Clickjacking | `X-Frame-Options: DENY`, désormais aussi `frame-ancestors 'none'` | Aucune |
| Dépendances (A06) | `npm audit` : 0 vulnérabilité | Aucune |
| Intégration continue | La tâche anti-pause n'a aucune permission GitHub et n'utilise que la clé publique | Aucune |
| Service worker | Ne met aucune page en cache, seulement la page hors connexion | Aucune |

## Risques résiduels acceptés (faibles)

- **Contenu brut de la lecture IA** : un lecteur peut lire la colonne `lecture` d'une page liée à une recette publiée, qui contient aussi les autres recettes lues sur la même page, même en brouillon. Le scan de cette page lui est de toute façon montré.
- **Auteur déclaré** : un contributeur peut indiquer un autre membre comme créateur d'une recette ou d'un cahier. L'auteur n'est montré qu'à l'admin.
- **Mesures du test A/B** : un membre peut gonfler ses propres mesures en appelant la fonction en boucle. Sans effet sur les données de la famille.
- **Code à 6 chiffres** : sa robustesse repose sur les limites de tentatives de Supabase (Authentication → Rate Limits), à garder aux valeurs par défaut.
- **CSP avec `'unsafe-inline'`** : nécessaire sans nonce avec le rendu partiel de Next.js. Le risque XSS reste couvert par l'échappement de React.

## À faire par Mattis

1. Coller `supabase/migrations/20261123190000_securite.sql` dans Supabase → SQL Editor, puis exécuter.
2. Vérifier dans Authentication → Sign In / Providers que **Allow new users to sign up** est désactivé (protection indépendante de F1).
3. Lancer la requête de vérification de F4 (ci-dessus) et me dire si elle renvoie des lignes.
4. Après le déploiement, ouvrir l'appli sur le téléphone : connexion, fiche d'une recette avec photos, capture d'une page, file des photos. Une image ou un écran qui ne se charge plus signalerait une règle trop stricte.
