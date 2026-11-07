# Régler la lecture des cahiers par l'IA (US-09)

La lecture se fait côté serveur, sur Vercel. Les clés API ne sont jamais dans le code : uniquement dans les variables d'environnement de Vercel.

## 1. Base de données

Supabase → SQL Editor : coller le contenu de `supabase/migrations/20261107160000_lecture_ia.sql`, puis Run. Le script peut être rejoué sans erreur.

## 2. Clé Claude (Anthropic)

1. Créer un compte sur platform.claude.com.
2. Settings → Billing : ajouter un moyen de paiement et quelques dollars de crédit (la lecture coûte quelques centimes par page). Vous pouvez fixer une limite de dépense mensuelle dans Settings → Limits.
3. Settings → API Keys → Create Key, nommée par exemple `recettes-familiales`. Copier la clé (elle commence par `sk-ant-`), elle ne s'affiche qu'une fois.

## 3. Clé Gemini (Google)

1. Aller sur aistudio.google.com et se connecter avec un compte Google.
2. Get API key → Create API key. Copier la clé.

L'offre gratuite de Gemini suffit pour les essais ; Google peut utiliser les données envoyées sur l'offre gratuite pour améliorer ses produits.

## 4. Variables dans Vercel

Vercel → projet → Settings → Environment Variables, cocher Production et Preview :

| Nom | Valeur |
| --- | --- |
| `ANTHROPIC_API_KEY` | la clé Claude |
| `GEMINI_API_KEY` | la clé Gemini |
| `LECTURE_IA` | `claude` ou `gemini` : le modèle utilisé pour lire les pages |

Facultatif : `LECTURE_MODELE_CLAUDE` (par défaut `claude-opus-5-5`) et `LECTURE_MODELE_GEMINI` (par défaut `gemini-3.8-flash`) pour essayer un autre modèle.

Ces variables ne commencent **pas** par `NEXT_PUBLIC_` : elles restent sur le serveur et ne sont jamais envoyées au téléphone.

Redéployer ensuite (Deployments → … → Redeploy).

## Comportement attendu

- Dès qu'une page est envoyée, elle passe « Lecture en cours », puis « Prête » avec son nombre de mots douteux, en général en moins d'une minute.
- Chaque recette lue devient une recette brouillon, à relire au sprint 2.
- Une page « En échec » (ou restée en lecture plus de 10 minutes) se relance depuis la fiche du cahier. En cas d'échec, le détail est dans Vercel → Logs.
