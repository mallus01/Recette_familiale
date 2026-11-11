# Product backlog V2

La V2 apporte « la famille » (voir la priorisation du cahier des charges) : retrait d'un membre, photos proposées et validées, images des valeurs de filtres, ingrédients surlignés et barrés en mode cuisine, séparation et fusion de pages, mises en page dédiées aux grands écrans. Les invitations et les rôles, prévus en V2, ont été avancés en V1 (US-33).

14 user stories réparties sur quatre sprints (5 à 8), à la suite de la V1. Mettre à jour la colonne Statut au fil de l'avancement : `À faire`, `En cours` ou `Terminée`.

## Sprint 5 · Membres et mode cuisine enrichi

Objectif : gérer les départs de la famille et suivre d'un coup d'œil les ingrédients pendant la cuisine.

| ID    | User story                                                                                                         | Critères d'acceptation                                                                                                                                                                                                | Statut   |
| ----- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| US-34 | En tant qu'administrateur, je veux retirer un membre, afin qu'il n'ait plus accès à l'appli.                       | Depuis sa ligne dans l'administration, avec une confirmation ; ses listes privées sont supprimées ; les recettes qu'il a numérisées restent, avec « Ancien membre » comme auteur ; impossible de se retirer soi-même. | En cours |
| US-35 | En tant qu'utilisateur, je veux voir les ingrédients de l'étape en cours, afin de savoir quoi prendre.             | En mode cuisine, les ingrédients utilisés dans l'étape en cours sont surlignés en orange pêche dans le bandeau et passent en tête.                                                                                    | En cours |
| US-36 | En tant qu'utilisateur, je veux voir les ingrédients déjà utilisés, afin de ne rien oublier ni rajouter deux fois. | En mode cuisine, les ingrédients utilisés dans les étapes passées sont barrés, sauf s'ils servent aussi à l'étape en cours.                                                                                           | En cours |

## Sprint 6 · Images

Objectif : des recettes et des filtres plus parlants grâce aux photos.

| ID    | User story                                                                                                                  | Critères d'acceptation                                                                                                                                                           | Statut   |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| US-37 | En tant qu'administrateur, je veux choisir une image pour chaque valeur de filtre, afin de rendre les filtres plus visuels. | Image ajoutée à la création ou plus tard depuis la gestion des listes ; compression à l'envoi ; icône par défaut sans image ; images affichées dans les vignettes des filtres.   | En cours |
| US-38 | En tant que membre, je veux proposer une photo d'une recette, afin de montrer le plat.                                      | Bouton sur la fiche ; photo compressée (~300 Ko) ; statut en attente ; message indiquant qu'elle sera visible après validation.                                                  | En cours |
| US-39 | En tant qu'administrateur, je veux valider ou refuser les photos proposées, afin de garder des images de qualité.           | File des photos à valider dans l'administration ; Valider ou Refuser ; une photo refusée est supprimée.                                                                          | En cours |
| US-40 | En tant qu'utilisateur, je veux voir les photos validées, afin de reconnaître le plat.                                      | Photo validée affichée avant le scan sur la fiche, défilement entre les images ; première photo validée utilisée comme vignette dans les menus ; retirée si l'admin la supprime. | En cours |

## Sprint 7 · Séparation et fusion de pages

Objectif : numériser sans contorsion les pages à plusieurs recettes et les recettes sur plusieurs pages.

| ID    | User story                                                                                                               | Critères d'acceptation                                                                                                                                 | Statut   |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| US-41 | En tant que contributeur, je veux que l'IA repère une page à plusieurs recettes, afin de ne pas photographier deux fois. | La lecture renvoie une recette par recette trouvée ; la relecture propose de les séparer, chacune devenant une recette liée à la même page.            | En cours |
| US-42 | En tant que contributeur, je veux que l'IA repère une recette sur plusieurs pages, afin de la retrouver entière.         | Quand une recette semble continuer sur la page suivante, la relecture propose de fusionner ; la recette fusionnée garde les deux scans dans l'ordre.   | En cours |
| US-43 | En tant que contributeur, je veux séparer ou fusionner à la main, afin de corriger l'IA.                                 | Depuis la relecture : « Séparer » crée une nouvelle recette à partir d'une étape choisie ; « Fusionner avec la page suivante » regroupe deux recettes. | En cours |

## Sprint 8 · Grands écrans

Objectif : profiter de la tablette et de l'ordinateur. Grand écran = à partir de 768 px de large (tablette en portrait ou en paysage, ordinateur) ; un téléphone, même en paysage, garde la mise en page mobile.

| ID    | User story                                                                                                    | Critères d'acceptation                                                                                   | Statut  |
| ----- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------- |
| US-44 | En tant qu'utilisateur sur grand écran, je veux une barre latérale, afin de naviguer sans barre d'onglets.    | À partir de la largeur tablette, la barre d'onglets devient une barre latérale à gauche, mêmes sections. | À faire |
| US-45 | En tant qu'utilisateur sur grand écran, je veux le mode cuisine en deux colonnes, afin de tout voir.          | Ingrédients dans une colonne fixe à gauche, étapes à droite ; swipe et flèches du clavier.               | À faire |
| US-46 | En tant que contributeur sur grand écran, je veux relire face au scan, afin de comparer d'un regard.          | Scan à gauche, champs à droite, chacun défilant séparément.                                              | À faire |
| US-47 | En tant qu'administrateur sur grand écran, je veux les membres en tableau, afin de les gérer d'un coup d'œil. | Tableau membre, rôle, statut ; accueil et fiche recette élargis en plusieurs colonnes.                   | À faire |
