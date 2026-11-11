# CLAUDE.md — Recettes familiales

Point d'entrée de Claude Code pour ce projet. À lire en début de chaque session.

## Le projet en bref

Webapp privée (sur invitation) qui rassemble les recettes de la famille et numérise des cahiers de recettes manuscrits. Mobile first, installable (PWA). Usage prévu : principalement un seul utilisateur au départ (le porteur de projet, administrateur).

Phase actuelle : **V1 développée (sprints 0 à 4), développement de la V2 (sprint 6)**.

## Documents de référence

| Fichier | Contenu |
| --- | --- |
| `docs/cahier-des-charges.md` | Source de vérité : toutes les décisions validées (fonctionnel, UX/UI, modèle de données, choix techniques, priorisation, Scrum, journal des décisions) |
| `docs/backlog-v1.md` | Product backlog de la V1 : 33 user stories avec critères d'acceptation, réparties en 5 sprints |
| `docs/backlog-v2.md` | Product backlog de la V2 : 14 user stories (US-34 à US-47), réparties en 4 sprints (5 à 8) |
| `docs/recherche-initiale.md` | Synthèse de la recherche d'idéation (livres de cuisine, applis, numérisation, choix techniques) et ses sources |
| `assets/palette.jpeg` | Palette de couleurs fournie (color.adobe.com) |

En cas de doute sur un comportement attendu, **le cahier des charges fait foi**. Ne pas inventer de fonctionnalité non validée : la proposer, puis l'ajouter à la section « Points ouverts » du cahier des charges.

## Stack technique (validée)

- **Interface** : Next.js + Tailwind CSS, en PWA (installable sur l'écran d'accueil). Next.js 16 : consulter `AGENTS.md` et la doc embarquée `node_modules/next/dist/docs/` avant d'écrire du code
- **Connexion, base, images** : Supabase, **offre gratuite uniquement** (Postgres, Auth, Storage)
- **Lecture des cahiers** : modèle d'IA multimodal (vision), choisi après un test comparatif sur de vraies pages (US-11)
- **E-mails** : Brevo (SMTP personnalisé de Supabase)
- **Hébergement** : Vercel
- Pas de contrainte de région d'hébergement

Contraintes qui en découlent :

- Connexion : `signInWithOtp` de Supabase ; un **seul e-mail** contient le lien magique ET le code à 6 chiffres (modèle d'e-mail personnalisé). Validité 15 min, usage unique. Session de 30 jours par appareil.
- Invitations : mécanisme natif de Supabase, donc même durée de validité que les liens de connexion (15 min).
- Offre gratuite : tâche planifiée quotidienne anti-pause (le projet se met en pause après 7 jours d'inactivité) ; compression des images à l'envoi (~300 Ko) pour tenir dans 1 Go de stockage.
- Écran toujours allumé en mode cuisine : API Screen Wake Lock (fonctionne dans Safari iOS ≥ 16.4 et dans les PWA installées depuis iOS 18.4) ; toujours entourer la requête d'un try/catch et la relancer au retour de visibilité.

## Palette de couleurs

| Couleur | Hex | Rôle |
| --- | --- | --- |
| Gris ardoise | `#5C707D` | Texte principal, bouton principal (texte blanc dessus) |
| Brun taupe | `#7D735C` | Texte secondaire : auteur, notes en italique |
| Orange pêche | `#FCA86E` | Surlignage des ingrédients de l'étape, barre de progression |
| Jaune pâle | `#FCDC8D` | Fond du scan d'origine, tags d'occasion |
| Bleu ciel | `#8DD2FC` | Tags de type de repas, éléments d'information et liens |

Les trois couleurs claires ne servent **jamais** de couleur de texte sur fond blanc (contraste insuffisant).

## Organisation : Scrum en solo

- Sprints de **2 semaines**, V1 en 5 sprints (0 à 4) — voir `docs/backlog-v1.md` ; V2 en 4 sprints (5 à 8) — voir `docs/backlog-v2.md`.
- Ordre : 0 Fondations → 1 Capture et lecture IA → 2 Relecture et fiche recette → 3 Mode cuisine et quantités → 4 Accueil et listes.
- **Definition of Done** : fonctionne sur téléphone, testé en conditions réelles, déployé sur Vercel, cahier des charges à jour.
- En début de session : indiquer le sprint en cours et la ou les stories travaillées.
- Quand une story est terminée : mettre à jour son statut dans `docs/backlog-v1.md` ou `docs/backlog-v2.md`.
- Toute nouvelle décision validée : la consigner dans `docs/cahier-des-charges.md` (section concernée + ligne datée dans le journal des décisions).

## Hors périmètre V1 (prévu en V2 / V3)

Ne pas développer en V1, sauf demande explicite :

- V2 : retrait d'un membre ; photos proposées et validation ; images des valeurs de filtres ; ingrédients surlignés et barrés en mode cuisine ; séparation et fusion de pages ; mises en page dédiées aux grands écrans (dont barre latérale).
- V3 : test A/B des grandes cartes « À cuisiner ».

En V1, le compte administrateur est créé directement dans Supabase ; les autres membres sont invités depuis Profil → Inviter et gérer les membres (US-33, avancée en V1 le 11/11/2026).

## Conventions

- Langue de l'interface : français. Textes en casse de phrase, sans point d'exclamation.
- Mobile first : concevoir chaque écran pour le téléphone d'abord.
- Le modèle de données (section « Modèle de données » du cahier des charges) suit des noms d'entités en français ; garder cette cohérence dans le schéma SQL.
- Ne jamais stocker un secret (clé API, mot de passe) dans le code : variables d'environnement uniquement.
