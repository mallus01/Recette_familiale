# Product backlog V1

32 user stories réparties sur les cinq sprints de la V1. Mettre à jour la colonne Statut au fil de l'avancement : `À faire`, `En cours` ou `Terminée`.

## Sprint 0 · Fondations

Objectif : une appli vide mais installable, connectée et déployée.

| ID | User story | Critères d'acceptation | Statut |
| --- | --- | --- | --- |
| US-01 | En tant que développeur, je veux un projet Next.js en PWA déployé sur Vercel, afin de tester chaque évolution sur mon téléphone. | Appli installable sur l'écran d'accueil ; déploiement automatique à chaque envoi de code ; mise en page mobile first. | Terminée |
| US-02 | En tant que développeur, je veux la base Supabase créée selon le modèle de données, afin de stocker cahiers, recettes et membres. | Toutes les tables de la V1 créées ; règles d'accès : un membre ne lit que ses propres listes ; schéma versionné. | Terminée |
| US-03 | En tant qu'utilisateur, je veux me connecter avec mon seul e-mail, afin d'accéder à l'appli sans mot de passe. | Un seul e-mail via Brevo avec lien magique et code à 6 chiffres ; valable 15 min, usage unique ; lien Renvoyer l'e-mail ; session de 30 jours par appareil. | Terminée |
| US-04 | En tant qu'administrateur, je veux un compte avec le rôle admin, afin d'accéder à toutes les fonctions. | Compte créé dans Supabase avec le rôle admin ; aucune inscription publique : l'accueil mène uniquement à la connexion. | Terminée |
| US-05 | En tant qu'administrateur, je veux que la base ne se mette jamais en pause, afin que l'appli reste disponible. | Requête quotidienne planifiée ; un échec de la tâche m'est signalé par e-mail. | Terminée |

## Sprint 1 · Capture et lecture IA

Objectif : photographier un cahier entier et voir l'IA en extraire les recettes.

| ID | User story | Critères d'acceptation | Statut |
| --- | --- | --- | --- |
| US-06 | En tant que contributeur, je veux créer un cahier en photographiant sa couverture, afin de le retrouver facilement. | Saisie du nom du cahier ; la première photo est obligatoirement la couverture ; la couverture n'est pas envoyée à l'IA. | En cours |
| US-07 | En tant que contributeur, je veux photographier les pages à la suite, afin de numériser un cahier en une seule fois. | Numéro de page incrémenté automatiquement ; page détectée et recadrée automatiquement ; vignette de la dernière photo ; bouton Terminer. | À faire |
| US-08 | En tant que contributeur, je veux que les photos soient compressées à l'envoi, afin de tenir dans l'offre gratuite. | Environ 300 Ko par image ; texte toujours lisible au zoom ; stockage dans Supabase. | À faire |
| US-09 | En tant que contributeur, je veux que l'IA lise chaque page, afin de ne pas retaper les recettes. | Traitement en arrière-plan ; renvoie titre, groupes d'ingrédients, ingrédients (quantité, unité, nom, texte d'origine), étapes, notes et mots douteux ; une page en échec peut être relancée. | À faire |
| US-10 | En tant que contributeur, je veux une file des pages à relire, afin de suivre l'avancement de la lecture. | États en attente, lecture en cours, prête ; nombre de mots douteux affiché ; pages triées par cahier et numéro. | À faire |
| US-11 | En tant que développeur, je veux comparer deux ou trois modèles d'IA sur de vraies pages, afin de choisir le plus fiable. | Test sur 10 pages réelles ; comparaison des erreurs et du coût par page ; modèle retenu consigné dans le cahier des charges. | À faire |

## Sprint 2 · Relecture et fiche recette

Objectif : transformer une page lue par l'IA en recette publiée et consultable.

| ID | User story | Critères d'acceptation | Statut |
| --- | --- | --- | --- |
| US-12 | En tant que contributeur, je veux relire une recette face à son scan, afin de corriger les erreurs de l'IA. | Scan zoomable en haut, champs modifiables en dessous ; titre, ingrédients, étapes et notes modifiables ; mots douteux surlignés à la fois sur le scan et dans les champs. | À faire |
| US-13 | En tant que contributeur, je veux que les notes du cahier soient identifiées, afin de les distinguer des étapes. | Notes repérées par l'IA marquées comme notes ; rattachables à une étape ou à la recette ; affichées en italique. | À faire |
| US-14 | En tant que contributeur, je veux classer la recette par tags, afin de la retrouver par filtre. | Un type de repas choisi dans sa liste fermée ; une ou plusieurs occasions ; case Classique. | À faire |
| US-15 | En tant qu'administrateur, je veux gérer les listes fermées, afin de maîtriser les valeurs de tags. | Ajouter, renommer, supprimer une valeur de type de repas ou d'occasion ; icône par défaut pour chaque valeur. | À faire |
| US-16 | En tant que contributeur, je veux enrichir la recette, afin de garder son histoire. | Champs transmis par (texte libre), souvenir, portions et durée. | À faire |
| US-17 | En tant que contributeur, je veux valider ou reporter une relecture, afin d'avancer à mon rythme. | Plus tard laisse la recette dans la file ; Valider passe à l'enrichissement puis publie ; statut brouillon puis publiée. | À faire |
| US-18 | En tant qu'utilisateur, je veux consulter la fiche d'une recette, afin de la lire avant de cuisiner. | Scan d'origine, tags, transmis par, souvenir ; ingrédients groupés ; mesures d'époque avec leur équivalence moderne ; étapes ; notes en italique. | À faire |

## Sprint 3 · Mode cuisine et quantités

Objectif : cuisiner une recette de bout en bout avec le téléphone posé sur le plan de travail.

| ID | User story | Critères d'acceptation | Statut |
| --- | --- | --- | --- |
| US-19 | En tant qu'utilisateur, je veux lancer le mode cuisine depuis la fiche, l'écran restant allumé, afin de ne pas toucher le téléphone avec les mains sales. | Bouton Lancer le mode cuisine sur la fiche ; écran maintenu allumé tant que le mode est ouvert ; maintien relancé au retour dans l'appli. | À faire |
| US-20 | En tant qu'utilisateur, je veux voir clairement l'étape en cours, afin de ne pas me perdre. | Police agrandie ; étape en cours en gras ; étapes précédentes et suivantes grisées ; notes en italique sous leur étape. | À faire |
| US-21 | En tant qu'utilisateur, je veux naviguer entre les étapes, afin d'avancer à mon rythme. | Bouton Suivant plus large que Précédent, en bas de l'écran ; croix pour quitter ; swipe horizontal sur la zone des étapes ; flèches du clavier sur ordinateur. | À faire |
| US-22 | En tant qu'utilisateur, je veux voir les ingrédients en permanence, afin de ne pas revenir à la fiche. | Bandeau d'ingrédients compact en haut, qui défile, toujours visible. | À faire |
| US-23 | En tant qu'utilisateur, je veux voir ma progression, afin de savoir ce qu'il reste à faire. | Indicateur « Étape x sur y » et barre de progression. | À faire |
| US-24 | En tant qu'utilisateur, je veux adapter les quantités au nombre de personnes, afin de cuisiner pour la bonne tablée. | Réglage uniquement sur la fiche ; recalcul proportionnel arrondi à la valeur la plus proche ; ingrédients sans quantité inchangés ; valeur conservée en mode cuisine ; réinitialisée en quittant la recette. | À faire |
| US-25 | En tant qu'utilisateur, je veux copier les ingrédients, afin de faire ma liste de courses dans mes notes. | Bouton Copier ; texte : nom de la recette et nombre de personnes, puis ingrédients en liste à tirets avec quantités adaptées ; ingrédients sans quantité inclus. | À faire |

## Sprint 4 · Accueil et listes

Objectif : retrouver une recette en quelques secondes et organiser ce qu'on veut cuisiner.

| ID | User story | Critères d'acceptation | Statut |
| --- | --- | --- | --- |
| US-26 | En tant qu'utilisateur, je veux chercher une recette, afin de la retrouver vite. | Barre de recherche en haut de l'accueil ; recherche par nom de recette ou par ingrédient. | À faire |
| US-27 | En tant qu'utilisateur, je veux filtrer par tags, afin de trouver une idée selon le repas ou l'occasion. | Boutons Type de repas et Occasion dépliant un panneau de vignettes ; un seul panneau ouvert à la fois ; fermeture en touchant le bouton ou en faisant défiler ; bouton étoile pour Classiques. | À faire |
| US-28 | En tant qu'utilisateur, je veux mes listes Favoris et À cuisiner, afin de mettre des recettes de côté. | Ajout et retrait depuis la fiche ; listes privées ; onglet Mes listes avec les deux listes séparées. | À faire |
| US-29 | En tant qu'utilisateur, je veux qu'une recette cuisinée quitte À cuisiner, afin que la liste reste à jour. | Retrait automatique quand on passe la dernière étape du mode cuisine. | À faire |
| US-30 | En tant qu'utilisateur, je veux un accueil organisé en rangées, afin de naviguer facilement. | Rangées À cuisiner, Les cahiers (avec leur couverture) et Suggestions ; suggestions tirées au hasard à chaque ouverture, avec bouton de relance ; extrait du scan comme vignette d'une recette sans photo. | À faire |
| US-31 | En tant qu'utilisateur, je veux feuilleter un cahier, afin de retrouver ses recettes dans l'ordre d'origine. | Depuis la rangée Les cahiers ; recettes listées par numéro de page ; accès à la fiche de chaque recette. | À faire |
| US-32 | En tant qu'utilisateur, je veux une barre d'onglets, afin de passer d'une section à l'autre. | Onglets Accueil, Mes listes, Numériser et Profil ; Numériser visible seulement pour les contributeurs et l'admin ; barre latérale sur grand écran reportée en V2. | À faire |
