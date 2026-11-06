# Recherche initiale (phase d'idéation)

Synthèse des recherches menées le 6 novembre 2026, avant la rédaction du cahier des charges. Elle explique d'où viennent les choix ; les décisions elles-mêmes sont dans `cahier-des-charges.md`.

## 1. Ce qu'apprennent les livres de cuisine

- Les recettes publiées suivent un ordre descendant : titre, chapô (headnote), portions, liste d'ingrédients, méthode, puis variantes, parfois avec le temps de préparation. Les anciens cahiers donnent souvent juste un nom et un court texte, avec les ingrédients cités au fil de l'eau.
- Le chapô (souvenir, histoire, conseils) est l'âme d'une recette familiale : c'est le champ « souvenir ».
- Les graphistes séparent visuellement les ingrédients de la méthode (souvent deux polices distinctes).
- L'usage veut qu'on crédite la source d'une recette : c'est le champ « transmis par ».
- La navigation repose sur des chapitres, une table des matières et un index.

## 2. Ce qu'apprennent les applis de recettes

Références étudiées : Paprika, Mela, Crouton, Recipe Keeper, Mealie et Tandoor (auto-hébergées).

- **Catégories vs tags** (doctrine de Mealie) : catégories limitées à une ou deux par recette, tags libres et plus précis. Un utilisateur conseille une liste fixe de catégories pour éviter le chaos. → D'où les listes fermées.
- **Statuts personnels** (Mela) : « Favori » et « À cuisiner ».
- **Mode cuisine** (Mela) : police agrandie, étape en cours en gras, étapes voisines grisées, minuteurs intégrés. C'est la fonction la plus appréciée.
- **Partage familial** (Mealie) : groupes et foyers, collections partagées.
- **Manque signalé** : pas de recherche intelligente dans ses propres recettes.

## 3. Ce qu'apprennent les applis de numérisation

Références : ReciNote, ReciScan, Recipe Vault Scanner, Old Family Recipe, OrganizEat.

- L'IA fait le gros du travail, mais pas tout (environ 93 % de précision annoncée par une appli) : une étape de relecture est indispensable.
- On conserve l'original : la photo de l'écriture a autant de valeur que le texte.
- Standard de données de référence : schema.org Recipe (`recipeIngredient`, `recipeInstructions`, `recipeYield`, `HowToSection` pour les sous-parties). S'en inspirer facilite les imports et exports futurs.

## 4. Recherche pour les choix techniques

- **Supabase Auth** : lien magique et code passent par la même méthode `signInWithOtp` ; le contenu reçu dépend du modèle d'e-mail, on peut donc envoyer les deux dans un seul e-mail. Longueur du code (6 à 10 chiffres) et durée de validité réglables. Attention : ce même réglage d'expiration s'applique aux liens d'invitation.
- **Offre gratuite Supabase** (vérifiée en 2026) : 500 Mo de base, 1 Go de fichiers, 5 Go de transfert, 50 000 utilisateurs actifs par mois, 2 projets ; **mise en pause après 7 jours d'inactivité** (données conservées). Offre Pro à 25 $/mois sans pause.
- **Écran toujours allumé** : API Screen Wake Lock supportée par Safari iOS 16.4+ ; dans une PWA installée, un bug l'a bloquée jusqu'à iOS 18.4.
- **Lecture de l'écriture manuscrite** : les modèles d'IA multimodaux (GPT-5, Gemini 3 Pro, Claude…) dominent les services OCR classiques sur l'écriture cursive (banc d'essai AIMultiple, janvier 2026). Coût : environ 0,01 à 0,05 $ par page. Réserves : moins bons hors anglais, risque d'inventer du texte. → D'où le test comparatif sur de vraies pages (US-11) et la relecture obligatoire.

## Sources

- [Jake Tilson – Notes on Recipe Design](https://jamesbrookdesign.blogspot.com/2011/07/jake-tilson-notes-on-recipe-design.html?m=1)
- [Heritage Cookbook – Headnotes](https://heritagecookbookhelp.zendesk.com/hc/en-us/articles/46461703025435-How-to-Add-a-Headnote-At-the-Top-of-Your-Recipe)
- [Envato Tuts+ – Cookery book layouts](https://design.tutsplus.com/tutorials/design-striking-layouts-for-your-own-cookery-book-using-indesign--cms-20551)
- [Clearlingo – How to write recipes](https://www.clearlingo.co.nz/blog/how-to-write-recipes-for-cookbooks-and-food-blogs)
- [Best Recipe Manager Apps 2026](https://www.lilachbullock.com/?p=162080)
- [Mealie – Features](https://docs.mealie.io/documentation/getting-started/features/)
- [Digitec – Mealie organises my recipe collection](https://www.digitec.ch/en/page/open-source-tip-mealie-organises-my-recipe-collection-42956)
- [Mela – App Store](https://apps.apple.com/ch/app/id1548466041)
- [Fueled – Mela app of the week](https://fueled.com/?p=30296)
- [OrganizEat – OCR recipe apps](https://home.organizeat.com/?p=2484)
- [Google – Recipe structured data](https://support.google.com/webmasters/answer/173379)
- [Brevo – Supabase magic links](https://www.brevo.com/blog/supabase-magic-links/)
- [Supabase – Passwordless email sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Progressier – Screen Wake Lock](https://progressier.com/pwa-capabilities/screen-wake-lock)
- [ImageToTable – AI Handwriting-to-Text 2026](https://imagetotable.ai/blog/the-ultimate-guide-to-ai-handwriting-to-text-conversion)
- [Benchmarking LLMs for Handwritten Text Recognition](https://www.academia.edu/128768270/Benchmarking_Large_Language_Models_for_Handwritten_Text_Recognition)
- [SSD Nodes – Is Supabase free?](https://www.ssdnodes.com/learn/is-supabase-free-cloud-vs-self-hosted)
- [LiveMyApp – Supabase pricing](https://livemy.app/blog/supabase-pricing)
