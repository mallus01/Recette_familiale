# Product backlog V4 · Version 2.0 de l'appli

Demandée par Mattis le 19/11/2026, après la V3 : renommer les cahiers, ajouter des recettes à la main, créer ses propres listes, et rendre l'appli plus confortable pour les personnes âgées. Elle est appelée « version 2.0 » par Mattis ; ce backlog porte le numéro 4 pour ne pas la confondre avec la V2 du cahier des charges (`docs/backlog-v2.md`).

8 user stories réparties sur trois sprints (10 à 12), une pull request à tester par sprint. Mettre à jour la colonne Statut au fil de l'avancement : `À faire`, `En cours` ou `Terminée`.

## Sprint 10 · Cahiers et recettes à la main

Objectif : corriger le nom d'un cahier et ajouter les recettes qui ne sont dans aucun cahier.

| ID    | User story | Critères d'acceptation | Statut |
| ----- | ---------- | ---------------------- | ------ |
| US-51 | En tant que contributeur, je veux renommer un cahier et modifier sa description, afin de corriger un nom mal choisi. | Sur la fiche du cahier (Numériser), « Modifier le nom et la description » ouvre un formulaire avec Annuler et Enregistrer ; le nom est obligatoire ; le nouveau nom s'affiche partout (accueil, file à relire, fiches). La page Cahier de l'accueil propose « Modifier le cahier » aux contributeurs. | Terminée |
| US-52 | En tant que contributeur, je veux ajouter une recette à la main, sans scan, afin de garder les recettes transmises de vive voix ou trouvées ailleurs. | Numériser → « Ajouter une recette à la main » demande le nom, puis ouvre l'écran de saisie (ingrédients, étapes, notes, sans scan ni champ « tel qu'écrit »), qui part d'un ingrédient et d'une étape vides ; Valider mène à l'enrichissement et à la publication comme une recette lue par l'IA ; Plus tard la garde en brouillon dans la file à relire, section « Recettes saisies à la main ». | Terminée |

## Sprint 11 · Mes propres listes

Objectif : ranger ses recettes comme on l'entend, en plus de Favoris et À cuisiner.

| ID    | User story | Critères d'acceptation | Statut |
| ----- | ---------- | ---------------------- | ------ |
| US-53 | En tant que membre, je veux créer, renommer et supprimer mes propres listes, afin de regrouper des recettes à ma façon. | Depuis Mes listes ; nom obligatoire, deux listes d'un même membre ne portent pas le même nom (sans tenir compte des majuscules) ; supprimer une liste demande une confirmation et ne supprime pas les recettes. Les listes sont privées, comme Favoris et À cuisiner. | En cours |
| US-54 | En tant que membre, je veux ajouter une recette à une de mes listes depuis sa fiche, afin de la retrouver plus tard. | Sur la fiche, « Ajouter à une liste » ouvre la liste de mes listes avec une case par liste, et « Nouvelle liste » ; une recette peut être dans plusieurs listes. | En cours |
| US-55 | En tant que membre, je veux voir toutes mes listes dans Mes listes, afin de passer de l'une à l'autre. | Le sélecteur de Mes listes montre Favoris, À cuisiner puis mes listes ; chaque liste affiche ses recettes, les derniers ajouts en premier. | En cours |

## Sprint 12 · Accessibilité pour les personnes âgées

Objectif : une appli lisible et facile à toucher, même avec une vue ou des gestes moins sûrs.

| ID    | User story | Critères d'acceptation | Statut |
| ----- | ---------- | ---------------------- | ------ |
| US-56 | En tant que membre, je veux agrandir le texte de l'appli, afin de lire sans lunettes. | Profil → Taille du texte : normale, grande, très grande ; tout l'écran s'agrandit (textes, boutons, espacements) ; le choix est gardé pour le membre, sur tous ses appareils. | À faire |
| US-57 | En tant que membre, je veux un contraste renforcé, afin de mieux distinguer les textes et les boutons. | Profil → Contraste renforcé : textes secondaires plus foncés, bordures plus marquées, liens soulignés plus épais ; même mémorisation que la taille du texte. | À faire |
| US-58 | En tant que membre âgé, je veux des boutons faciles à toucher et des textes simples, afin de ne pas me tromper. | Toutes les zones à toucher font au moins 48 px ; les icônes seules ont un libellé écrit ; le focus clavier est visible ; les messages d'erreur disent quoi faire ; les actions qui suppriment demandent une confirmation. | À faire |
