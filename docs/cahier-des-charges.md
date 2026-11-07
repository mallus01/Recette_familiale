# Cahier des charges – Webapp recettes familiales

6 novembre 2026 · Mattis

## Contexte et objectifs

Webapp privée qui rassemble les recettes de la famille et numérise les cahiers manuscrits. Ce document ne consigne que les décisions validées.

- Préserver les recettes des cahiers manuscrits, avec le scan d'origine conservé à côté du texte.
- Retrouver une recette rapidement grâce aux tags et aux listes personnelles.
- Cuisiner confortablement grâce à un mode cuisine dédié.
- Réserver l'accès aux membres de la famille, sur invitation.

## Plateformes cibles

La webapp est conçue en priorité pour le téléphone (mobile first).

- Le téléphone est la cible principale de toutes les interfaces.
- Une interface adaptée aux grands écrans (tablette, ordinateur) est également prévue.

## Comptes et accès

La webapp n'est accessible qu'avec un compte, et un compte ne se crée que sur invitation de l'administrateur.

- Aucune inscription publique : la page d'accueil mène uniquement à la connexion.
- Seul l'administrateur invite de nouveaux membres et décide de leur rôle.
- Une invitation est valable 15 minutes.
- Connexion sans mot de passe : par lien magique ou par code à usage unique, envoyés par e-mail. Une fois connecté, on le reste 30 jours sur un appareil.
- Une interface d'administration permet d'inviter des membres et d'attribuer ou modifier les rôles.

| Rôle | Droits |
| --- | --- |
| Administrateur | Tous les droits du contributeur, plus inviter des membres et gérer les rôles via l'interface d'administration |
| Contributeur | Consulter, ajouter, numériser et modifier des recettes |
| Lecteur | Consulter les recettes et gérer ses listes personnelles |

## Classement par tags

Chaque recette est classée par trois tags. Type de repas et occasion sont choisis dans des listes fermées.

| Tag | Format | Exemples |
| --- | --- | --- |
| Type de repas | Liste fermée, une seule valeur par recette | Entrée, plat, dessert |
| Occasion | Liste fermée, plusieurs valeurs possibles par recette | Noël, Nouvel An, anniversaire |
| Classique | Booléen (oui / non) | Recette très populaire, par exemple un classique de la cuisine française comme le bœuf bourguignon |

Les valeurs d'exemple sont indicatives. Seul l'administrateur gère le contenu des listes fermées (ajouter, renommer, supprimer une valeur) depuis l'interface d'administration. Il choisit une image pour chaque valeur lors de sa création ; sans image, une icône par défaut s'affiche dans les filtres.

## Listes Favoris et À cuisiner

Deux listes indépendantes et privées permettent à chacun de mettre des recettes de côté.

- **Favoris** : les recettes qu'on aime et qu'on veut retrouver vite.
- **À cuisiner** : les recettes qu'on prévoit de faire.
- Les listes sont privées : chaque membre ne voit que les siennes.
- Une recette peut figurer dans l'une, l'autre, les deux ou aucune.
- Une recette est retirée automatiquement de À cuisiner après un passage complet en mode cuisine, c'est-à-dire quand on passe la dernière étape.

## Mode cuisine

Un affichage dédié pour suivre la recette pendant qu'on cuisine.

1. Affichage
   - L'écran reste allumé en permanence tant que le mode cuisine est ouvert.
   - La police est agrandie par rapport à la fiche recette.
   - L'étape en cours est en gras.
   - Les étapes précédentes et suivantes sont grisées.
   - Les ingrédients sont dans un panneau toujours visible.
   - Un indicateur de progression affiche l'étape en cours sur le total (par exemple « Étape 3 sur 7 »).
2. Navigation
   - Un bouton pour passer à l'étape suivante.
   - Un bouton pour revenir à l'étape précédente.
   - Une croix pour quitter le mode cuisine et revenir à la fiche.
   - Navigation au swipe : selon la mise en page retenue en phase UX/UI (voir section UX/UI).
3. Notes complémentaires
   - Les notes laissées en plus du texte de la recette (annotations dans la marge du cahier, commentaires) sont identifiées comme telles.
   - Elles s'affichent en italique pour les distinguer des étapes.

## UX/UI

Les interfaces sont conçues d'abord pour le téléphone, puis adaptées aux grands écrans.

### Mode cuisine sur téléphone

- Bandeau d'ingrédients compact en haut de l'écran, qui défile.
- Étapes au centre, boutons Précédent et Suivant en bas, dans la zone du pouce ; Suivant est plus large que Précédent.
- Swipe horizontal actif uniquement sur la zone des étapes ; les boutons restent la méthode principale.

### Mode cuisine sur grand écran

- Ingrédients dans une colonne fixe à gauche, étapes à droite.
- Pas de swipe ; navigation possible avec les flèches du clavier.

### Ingrédients en mode cuisine (tous écrans)

- Les ingrédients utilisés dans l'étape en cours sont surlignés.
- Les ingrédients déjà utilisés dans les étapes passées sont barrés.

### Palette de couleurs

| Couleur | Hexadécimal | RGB | Rôle |
| --- | --- | --- | --- |
| Gris ardoise | #5C707D | 92, 112, 125 | Texte principal, bouton principal (texte blanc dessus) |
| Brun taupe | #7D735C | 125, 115, 92 | Texte secondaire : auteur, notes en italique |
| Orange pêche | #FCA86E | 252, 168, 110 | Surlignage des ingrédients de l'étape, barre de progression |
| Jaune pâle | #FCDC8D | 252, 220, 141 | Fond du scan d'origine, tags d'occasion |
| Bleu ciel | #8DD2FC | 141, 210, 252 | Tags de type de repas, éléments d'information et liens |

Source : palette fournie (color.adobe.com, voir `assets/palette.jpeg`). Les trois couleurs claires ne servent jamais de couleur de texte sur fond blanc ; les deux foncées respectent le contraste de 4,5:1.

### Écran d'accueil

- En haut : barre de recherche (recette, ingrédient).
- Dessous : les filtres par tags.
  - Deux boutons compacts, Type de repas et Occasion, plus un bouton étoile pour Classiques (activé ou désactivé d'un toucher).
  - Toucher Type de repas ou Occasion déplie vers le bas un panneau de vignettes avec image, une par valeur de la liste fermée.
  - Le panneau pousse le reste de l'accueil vers le bas, sans le recouvrir ; le bouton actif est encadré, avec une flèche vers le haut.
  - Un seul panneau ouvert à la fois : ouvrir l'un referme l'autre.
  - Le panneau se referme en touchant à nouveau son bouton ou en faisant défiler la page.
- Puis trois rangées défilant horizontalement :
  1. **À cuisiner** : la liste privée du membre.
  2. **Les cahiers** : accès aux cahiers d'origine, chacun affiché avec sa photo de couverture.
  3. **Suggestions** : recettes tirées au hasard, avec un nouveau tirage à chaque ouverture de l'accueil et un bouton pour relancer le tirage.
- Une recette sans photo du plat affiche un extrait de son scan d'origine comme vignette.

### Navigation principale

- Téléphone : barre d'onglets en bas avec Accueil, Mes listes, Numériser et Profil.
- L'onglet Numériser n'apparaît que pour les contributeurs et l'administrateur.
- L'interface d'administration est accessible depuis Profil.
- Grand écran : la barre d'onglets est remplacée par une barre latérale à gauche.

### Numérisation

Le parcours se fait en trois écrans, réservés aux contributeurs et à l'administrateur.

1. **Capture**
   - On choisit d'abord le cahier. Pour un nouveau cahier, la première photo est obligatoirement sa couverture ; elle sert d'image de couverture dans les menus et n'est pas envoyée à l'IA. On photographie ensuite les pages à la suite, en série.
   - Le numéro de page avance automatiquement.
   - La page est détectée et recadrée automatiquement.
   - Une vignette montre la dernière photo prise.
2. **File à relire**
   - L'IA traite les pages en arrière-plan.
   - Chaque page affiche son état : en attente, lecture en cours, prête.
   - Chaque page prête affiche son nombre de mots douteux.
3. **Relecture**
   - Téléphone : scan zoomable en haut, champs modifiables en dessous (titre, ingrédients, étapes, notes).
   - Grand écran : scan à gauche, champs à droite.
   - Les mots douteux sont surlignés à la fois sur le scan et dans les champs.
   - Les notes repérées par l'IA sont identifiées et affichées en italique.
   - L'IA détecte une page contenant plusieurs recettes ou une recette sur plusieurs pages, et propose de séparer ou de fusionner.
   - Bouton Plus tard : la recette reste dans la file.
   - Bouton Valider : passage à l'enrichissement (auteur, souvenir, tags), puis à la publication.

### Administration

- Bouton principal Inviter un membre : formulaire avec e-mail et rôle.
- Invitations en attente : chacune affiche le temps restant avant expiration et un menu ⋮ pour l'annuler.
- Invitations expirées : un bouton pour la renvoyer et un menu ⋮ pour l'annuler sans la renvoyer.
- Membres actifs : le rôle de chacun se change avec un menu déroulant.
- Retirer un membre : depuis sa ligne, avec une confirmation ; ses listes privées sont supprimées, les recettes qu'il a numérisées restent dans la base.
- Grand écran : la liste passe en tableau (membre, rôle, statut).
- Gestion des listes fermées (type de repas, occasion) : ajout, renommage et suppression de valeurs, avec choix d'une image par valeur.

### Invitation reçue

- Le lien de l'e-mail ouvre une page d'accueil indiquant qui invite et avec quel rôle.
- L'e-mail est prérempli et verrouillé.
- Le membre saisit son prénom et son nom de famille.
- Dans l'interface, seule l'initiale du nom de famille est affichée (par exemple « Claire D. »).

### Connexion

- Un seul champ : l'e-mail.
- Un seul e-mail envoyé, qui contient à la fois le lien magique et un code à 6 chiffres.
- Lien pour se connecter sur le même appareil, code pour se connecter depuis un autre appareil.
- Lien Renvoyer l'e-mail sous le champ du code.

### Images des recettes

- Par défaut, l'image d'une recette est son scan d'origine.
- Les membres peuvent proposer des photos de la recette.
- Chaque photo proposée doit être validée par l'administrateur avant d'apparaître.
- Une photo validée passe devant le scan dans l'ordre de défilement des images de la recette.
- Une photo validée est utilisée comme vignette de la recette dans les menus.
- L'interface d'administration comprend une file des photos à valider.

### Idées pour de futurs tests A/B

- Rangée À cuisiner en grandes cartes avec image de la recette, face aux cartes standard.

## Adaptation des quantités

On peut adapter les quantités d'une recette au nombre de personnes.

- Le nombre de personnes de départ est celui de la recette (champ portions).
- Le nombre de personnes se règle uniquement sur la fiche recette ; les quantités des ingrédients sont recalculées proportionnellement.
- La valeur choisie est conservée en passant en mode cuisine.
- La valeur revient à celle de la recette dès qu'on quitte la recette ; elle n'est pas enregistrée.
- Le calcul s'appuie sur la quantité structurée de chaque ingrédient ; les mesures d'époque utilisent leur équivalence moderne.
- Les quantités sont arrondies à la valeur pratique la plus proche (par exemple 1,33 œuf donne 1 œuf, 133 g donnent 135 g).
- Un ingrédient sans quantité chiffrée (par exemple « une pincée de sel ») n'est pas modifié.

### Copier pour la liste de courses

- Un bouton Copier place dans le presse-papiers le nom de la recette et ses ingrédients avec les quantités adaptées au nombre de personnes choisi.
- Le but est de coller cette liste dans une application de notes pour faire ses courses.
- Le texte copié commence par le nom de la recette suivi du nombre de personnes, puis liste les ingrédients avec des tirets.
- Les ingrédients sans quantité chiffrée (sel, poivre) sont inclus.

```markdown
Bœuf bourguignon (4 personnes)
- 1 kg de bœuf
- 50 cl de vin rouge
- 135 g de lardons
- 1 oignon
- 1 bouquet garni
```

## Modèle de données

Le modèle compte trois blocs : le cœur des recettes, les membres et l'accès, l'organisation.

### Cœur des recettes

| Entité | Attributs principaux | Relations |
| --- | --- | --- |
| Cahier | nom, description, image de couverture (première photo du cahier) | contient des pages scannées |
| Page scannée | numéro de page, image, statut, nombre de mots douteux | appartient à un cahier ; liée à une ou plusieurs recettes |
| Recette-page | ordre | liaison : une page peut contenir plusieurs recettes, une recette s'étaler sur plusieurs pages |
| Recette | titre, transmis par (texte libre), souvenir, portions, durée, classique (booléen), statut (brouillon, publiée) | un type de repas ; plusieurs occasions |
| Groupe d'ingrédients | nom (« pour la pâte »), ordre | appartient à une recette |
| Ingrédient | quantité, unité, nom, texte d'origine (mesure d'époque), ordre | appartient à un groupe ; utilisé par une ou plusieurs étapes |
| Étape | ordre, texte | appartient à une recette ; utilise des ingrédients |
| Note | texte, origine (cahier ou membre) | appartient à une recette ; rattachée ou non à une étape |

### Membres et accès

| Entité | Attributs principaux | Relations |
| --- | --- | --- |
| Membre | prénom, nom (stocké en entier, initiale affichée), e-mail unique, rôle | envoie des invitations, ouvre des sessions |
| Invitation | e-mail, rôle, expiration (15 min), statut ; gérée par le mécanisme d'invitation de Supabase | envoyée par l'admin |
| Jeton de connexion | empreinte du lien, empreinte du code, expiration (15 min), utilisé | lié à un membre ; usage unique |
| Session | appareil, expiration (30 jours) | liée à un membre |

### Organisation

| Entité | Attributs principaux | Relations |
| --- | --- | --- |
| Type de repas | nom unique, image | une valeur par recette |
| Occasion | nom unique, image | plusieurs par recette (table de liaison) |
| Liste perso | type (favori, à cuisiner), date d'ajout | un membre, une recette ; privée |
| Photo | image, statut (en attente, validée), ordre | une recette ; proposée par un membre, validée par l'admin |

Règles associées :

- Le lien magique et le code ne sont stockés que sous forme d'empreinte, valables 15 minutes et à usage unique.
- Une photo refusée par l'admin est supprimée.
- Le retrait automatique de À cuisiner supprime la ligne de liste perso quand on passe la dernière étape.
- Quand un membre est retiré, ses recettes numérisées et ses photos validées restent attachées aux recettes, et son nom s'affiche « Ancien membre ».

Note pour l'implémentation : les jetons de connexion et les sessions sont gérés par Supabase Auth ; les tables correspondantes décrivent le comportement attendu, pas forcément des tables à créer à la main.

## Choix techniques

La webapp repose sur Next.js en PWA, Supabase, un modèle d'IA de vision, Brevo et Vercel, sur leurs offres gratuites.

| Brique | Choix | Rôle |
| --- | --- | --- |
| Interface | Next.js + Tailwind, en PWA (installable) | Interface et logique serveur, mobile first |
| Connexion, base, images | Supabase, offre gratuite uniquement | Lien magique et code, base Postgres, stockage des scans et photos |
| Lecture des cahiers | Claude (Anthropic), modèle d'IA multimodal retenu après un test comparatif avec Gemini (Google) sur de vraies pages | Extraction de la recette structurée et des mots douteux |
| E-mails | Brevo | Envoi des e-mails de connexion et d'invitation |
| Hébergement | Vercel | Déploiement de la webapp |

- Les invitations utilisent le mécanisme natif de Supabase ; elles partagent donc la durée de validité des liens de connexion, soit 15 minutes.
- Le lien magique et le code sont envoyés dans un même e-mail, via un modèle d'e-mail Supabase personnalisé.
- L'écran toujours allumé du mode cuisine s'appuie sur l'API Wake Lock du navigateur.
- Usage prévu : principalement un seul utilisateur ; l'offre gratuite de Supabase suffit.
- Aucune contrainte de région d'hébergement : l'hébergement européen n'est pas obligatoire.
- Une tâche planifiée quotidienne interroge la base pour éviter la mise en pause du projet Supabase après 7 jours d'inactivité.
- Les scans et photos sont compressés automatiquement à l'envoi (environ 300 Ko par image) pour tenir dans 1 Go de stockage.

## Priorisation en versions

La V1 doit permettre à un utilisateur seul de numériser ses cahiers et de cuisiner avec ; le partage familial arrive en V2.

| Version | Objectif | Contenu |
| --- | --- | --- |
| V1 | Le cahier numérique, utilisable seul | Connexion lien et code (compte admin unique créé dans Supabase) ; capture en série, file à relire, relecture ; fiche recette avec scan et notes ; tags et gestion des listes fermées ; mode cuisine (écran allumé, étapes, panneau d'ingrédients, progression, swipe, boutons) ; adaptation des quantités et copie ; accueil (recherche, filtres, cahiers, suggestions) ; Favoris et À cuisiner ; tâche anti-pause et compression des images |
| V2 | La famille | Invitations, rôles et interface d'administration ; retrait d'un membre ; photos proposées et validation ; images des valeurs de filtres ; ingrédients surlignés et barrés en mode cuisine ; séparation et fusion de pages ; mises en page dédiées aux grands écrans |
| V3 | Les bonus | Test A/B des grandes cartes À cuisiner |

Aménagements de la V1 :

- Mode cuisine sans surlignage ni barrage des ingrédients ; le panneau d'ingrédients reste toujours visible.
- Une page contenant deux recettes est photographiée deux fois, une fois par recette.
- Sur grand écran, la disposition mobile est élargie ; les icônes par défaut servent de vignettes de filtres.
- La V1 est découpée en sprints selon la méthode Scrum, en commençant par la numérisation pour tester tôt la lecture des cahiers.

## Organisation du projet (Scrum)

La V1 est développée selon Scrum, adapté à un projet solo, en sprints de 2 semaines.

| Élément Scrum | Version solo |
| --- | --- |
| Rôles | Le porteur de projet est à la fois Product Owner et développeur |
| Product backlog | Fonctionnalités de la V1 rédigées en user stories, avec critères d'acceptation |
| Sprint | 2 semaines, avec un objectif clair |
| Sprint planning | 30 minutes en début de sprint pour choisir les stories |
| Daily | Note de 2 minutes en début de session : où j'en suis, ce que je fais |
| Sprint review | Test du résultat sur téléphone, en conditions réelles |
| Rétrospective | 15 minutes : ce qui a marché, ce qui a coincé, une amélioration pour le sprint suivant |
| Definition of Done | Fonctionne sur téléphone, testé en conditions réelles, déployé sur Vercel, cahier des charges à jour |

| Sprint | Objectif | Contenu |
| --- | --- | --- |
| Sprint 0 | Fondations | Projet Next.js en PWA, projet Supabase et schéma de base, connexion lien et code via Brevo, compte admin, déploiement Vercel, tâche anti-pause |
| Sprint 1 | Capture et lecture IA | Création d'un cahier avec sa couverture, capture en série avec recadrage, compression, stockage, appel à l'IA, file à relire, test comparatif des modèles d'IA |
| Sprint 2 | Relecture et fiche recette | Relecture avec mots douteux, notes, tags et listes fermées, publication, fiche recette avec scan |
| Sprint 3 | Mode cuisine et quantités | Écran allumé, étapes, panneau d'ingrédients, progression, boutons et swipe, nombre de personnes, bouton Copier |
| Sprint 4 | Accueil et listes | Recherche, filtres à panneau dépliant, rangées Cahiers et Suggestions, Favoris et À cuisiner avec retrait automatique |

Le détail des user stories et leur suivi : `docs/backlog-v1.md`.

## Points ouverts à valider

Propositions faites lors de l'écriture du schéma (US-02), appliquées dans la migration en attendant validation :

- Un lecteur ne voit que les recettes publiées ; les brouillons et les pages scannées sont réservés aux contributeurs et à l'admin.
- Une page scannée a un quatrième statut, « en échec », pour pouvoir relancer sa lecture (US-09).
- La table des photos proposées n'est créée qu'avec la V2, quand la fonction arrive.
- L'admin ne voit pas les listes Favoris et À cuisiner des autres membres.

Proposition faite lors de la connexion (US-03) :

- Une adresse sans compte voit le même écran « e-mail envoyé » qu'une adresse connue, mais ne reçoit rien, pour ne pas révéler qui a un compte.
- La session de 30 jours repart à chaque utilisation de l'appli (on n'est déconnecté qu'après 30 jours sans l'ouvrir).

Propositions faites lors de la capture des pages (US-07) :

- Le recadrage automatique est rectangulaire, sans redresser une page photographiée de travers ; si la page ne se distingue pas du fond, la photo est gardée entière.
- On peut reprendre la dernière photo ; elle remplace la page du même numéro, qui repart en attente de lecture.
- Les pages s'envoient pendant qu'on photographie la suivante ; une page en échec d'envoi peut être renvoyée, et Terminer attend la fin des envois.
- Terminer mène à la file à relire.

Propositions faites lors de la lecture par l'IA (US-09) :

- La lecture démarre dès qu'une page est envoyée ; chaque recette lue devient une recette brouillon liée à sa page, et une page relue remplace ses brouillons.
- Le résultat brut de l'IA (dont les mots douteux et leur contexte) est gardé avec la page, pour la relecture et la comparaison des modèles.
- Une lecture restée « en cours » plus de 10 minutes peut être relancée, comme une page en échec, depuis la file à relire ou la fiche du cahier.

Propositions faites lors de la file à relire (US-10) :

- La file montre aussi les pages en échec, avec un bouton Relancer.
- Une page quitte la file quand toutes ses recettes sont publiées ; une page lue sans recette y reste avec la mention « Aucune recette trouvée ».
- Les cahiers sont classés par ordre alphabétique ; chaque page affiche les titres des recettes lues.
- La file est accessible depuis l'écran Numériser.

Propositions faites lors de la comparaison des modèles (US-11) :

- La comparaison se fait dans l'appli, sur un écran réservé à l'administrateur : les deux modèles lisent la même page, sans créer de recette, et l'administrateur saisit le nombre d'erreurs de chacun.
- Une erreur compte un mot mal lu, une quantité fausse, ou un ingrédient ou une étape manquant ou inventé.
- Une lecture est interrompue au bout de 4 minutes et notée en échec ; une lecture restée bloquée peut être relancée.

Propositions faites lors de la relecture (US-12) :

- La relecture s'ouvre depuis la file à relire, en touchant le titre d'une recette ; une recette sur plusieurs pages permet de passer d'un scan à l'autre.
- Le scan reste visible en haut pendant la saisie ; il se zoome au pincement, au double toucher ou avec les boutons + et −.
- L'IA situe chaque mot douteux sur la photo, pour l'encadrer sur le scan ; les pages lues avant cette version n'ont que le surlignage dans les champs, sauf à relancer leur lecture.
- Un encadré récapitule les mots douteux encore présents ; un mot corrigé n'est plus surligné.
- Chaque ingrédient se corrige tel qu'écrit, puis en quantité, unité et nom ; on peut ajouter ou retirer ingrédients, groupes, étapes et notes.
- Un bouton Enregistrer les corrections garde les changements ; les boutons Plus tard et Valider arrivent avec US-17.


| Date | Sujet | Décision |
| --- | --- | --- |
| 06/11/2026 | Classement | Trois tags : type de repas (texte), occasion (texte), classique (booléen) |
| 06/11/2026 | Listes | Deux listes indépendantes : Favoris et À cuisiner |
| 06/11/2026 | Mode cuisine | Police agrandie, étape en cours en gras, autres étapes grisées |
| 06/11/2026 | Mode cuisine | Boutons suivant et précédent, croix pour quitter |
| 06/11/2026 | Mode cuisine | Notes complémentaires identifiées et affichées en italique |
| 06/11/2026 | Accès | Comptes obligatoires, création uniquement sur invitation |
| 06/11/2026 | Classement | Listes fermées pour type de repas et occasion ; plusieurs occasions par recette ; classique = recette très populaire |
| 06/11/2026 | Listes | Favoris et À cuisiner privées ; retrait automatique de À cuisiner après un passage complet |
| 06/11/2026 | Mode cuisine | Écran toujours allumé, panneau ingrédients toujours visible, indicateur de progression |
| 06/11/2026 | Accès | Rôles administrateur, contributeur, lecteur ; seul l'admin invite et gère les rôles via une interface admin |
| 06/11/2026 | Accès | Connexion par lien magique ou code ; invitation valable 1 h maximum |
| 06/11/2026 | Listes | Passage complet = quand on passe la dernière étape du mode cuisine |
| 06/11/2026 | Accès | Lien magique et code envoyés par e-mail |
| 06/11/2026 | Plateformes | Mobile first, avec une interface prévue pour les grands écrans |
| 06/11/2026 | UX/UI | Mode cuisine mobile : bandeau ingrédients en haut, swipe sur la zone des étapes ; grand écran : colonne ingrédients, flèches du clavier |
| 06/11/2026 | UX/UI | Ingrédients de l'étape surlignés, ingrédients utilisés barrés |
| 06/11/2026 | UX/UI | Palette : #8DD2FC, #FCDC8D, #FCA86E, #5C707D, #7D735C |
| 06/11/2026 | UX/UI | Rôles des couleurs de la palette validés |
| 06/11/2026 | UX/UI | Accueil : rangées À cuisiner, Les cahiers, Suggestions (aléatoires) ; Ajoutées récemment abandonné |
| 06/11/2026 | UX/UI | Filtres par tags agrandis avec images ; nouveau tirage des suggestions à chaque ouverture et bouton de relance ; extrait du scan comme vignette par défaut |
| 06/11/2026 | UX/UI | Onglets mobiles Accueil, Mes listes, Numériser, Profil ; barre latérale sur grand écran |
| 06/11/2026 | UX/UI | Filtres : boutons Type de repas et Occasion dépliant un panneau de vignettes (un seul ouvert, fermeture au toucher ou au défilement) ; bouton étoile pour Classiques |
| 06/11/2026 | UX/UI | Numérisation : capture en série, file à relire, relecture avec mots douteux surlignés, séparation ou fusion de recettes, boutons Plus tard et Valider |
| 06/11/2026 | Accès | Administration : invitation, annulation (en attente et expirées), renvoi, changement de rôle, retrait d'un membre avec confirmation |
| 06/11/2026 | Accès | Invitation : prénom et nom demandés, initiale du nom affichée ; connexion par un e-mail unique avec lien et code |
| 06/11/2026 | Accès | Session de 30 jours par appareil |
| 06/11/2026 | Classement | Une seule valeur de type de repas par recette |
| 06/11/2026 | Images | Scan par défaut ; photos proposées par les membres, validées par l'admin, prioritaires dans le défilement et les vignettes |
| 06/11/2026 | Classement | Listes fermées gérées par l'admin seul ; image par valeur choisie par l'admin, icône par défaut sinon |
| 06/11/2026 | Données | Modèle de données validé (cœur des recettes, membres et accès, organisation) ; jetons de 15 min à usage unique ; photo refusée supprimée ; membre retiré affiché « Ancien membre » |
| 06/11/2026 | Fonctionnel | Adaptation des quantités au nombre de personnes |
| 06/11/2026 | Fonctionnel | Nombre de personnes réglable sur la fiche, conservé en mode cuisine, réinitialisé en quittant la recette ; arrondi à la valeur la plus proche |
| 06/11/2026 | Fonctionnel | Bouton Copier : nom de la recette et ingrédients aux quantités adaptées, pour une liste de courses |
| 06/11/2026 | Fonctionnel | Copie : nombre de personnes indiqué, ingrédients sans quantité inclus |
| 06/11/2026 | Technique | Next.js en PWA, Supabase en offre gratuite, IA de vision choisie après test, Brevo, Vercel ; pas d'hébergement européen obligatoire |
| 06/11/2026 | Accès | Invitations via le mécanisme natif de Supabase, valables 15 min (remplace la durée de 1 h) |
| 06/11/2026 | Technique | Tâche quotidienne anti-pause Supabase ; compression des images à l'envoi |
| 06/11/2026 | Priorisation | Découpage V1 (cahier numérique), V2 (famille), V3 (bonus) ; V1 organisée en sprints Scrum, numérisation en premier |
| 06/11/2026 | Organisation | Scrum adapté en solo, sprints de 2 semaines, V1 en cinq sprints (0 à 4) |
| 06/11/2026 | Numérisation | Première photo d'un cahier = sa couverture, utilisée comme image de couverture dans les menus |
| 07/11/2026 | Technique | Lecture des cahiers : comparaison entre Claude et Gemini (US-11), modèle interchangeable par variable d'environnement |
| 07/11/2026 | Technique | Modèle de lecture retenu : Claude (les lectures Gemini n'aboutissaient pas lors du test) ; LECTURE_IA=claude |
