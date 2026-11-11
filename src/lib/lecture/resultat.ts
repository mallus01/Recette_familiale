import { z } from "zod";

// Ce que l'IA renvoie pour une page (cahier des charges, US-09) : une ou plusieurs
// recettes, et les mots qu'elle n'a pas su lire avec certitude.
export const ResultatLecture = z.object({
  recettes: z.array(
    z.object({
      titre: z.string(),
      portions: z.number().nullable(),
      duree_minutes: z.number().nullable(),
      groupes: z.array(
        z.object({
          nom: z.string().nullable(),
          ingredients: z.array(
            z.object({
              quantite: z.number().nullable(),
              unite: z.string().nullable(),
              nom: z.string(),
              texte_origine: z.string(),
            }),
          ),
        }),
      ),
      etapes: z.array(z.string()),
      // etape : numéro de l'étape (1, 2…) que la note complète, ou null pour la recette.
      notes: z.array(
        z.object({ texte: z.string(), etape: z.number().nullable() }),
      ),
      // US-42 : la recette a commencé sur la page précédente, ou continue sur la suivante.
      commence_page_precedente: z.boolean(),
      continue_page_suivante: z.boolean(),
    }),
  ),
  mots_douteux: z.array(
    z.object({
      mot: z.string(),
      contexte: z.string(),
      // Emplacement du mot sur la photo, en fractions de sa largeur et de sa hauteur
      // (0 à 1, depuis le coin haut gauche), pour le surligner sur le scan (US-12).
      zone: z
        .object({
          x: z.number(),
          y: z.number(),
          largeur: z.number(),
          hauteur: z.number(),
        })
        .nullable(),
    }),
  ),
});

// Mot douteux tel que gardé avec la page (les lectures d'avant US-12 n'ont pas de zone).
export type MotDouteux = { mot: string; contexte: string; zone?: Zone | null };
export type Zone = { x: number; y: number; largeur: number; hauteur: number };

export type ResultatLecture = z.infer<typeof ResultatLecture>;

export const CONSIGNE = `Tu lis une page photographiée d'un cahier de recettes familial, souvent manuscrit et en français.

Recopie fidèlement chaque recette de la page, sans rien inventer ni corriger le fond :
- titre : tel qu'écrit ; s'il n'y en a pas, un titre court et neutre tiré du contenu.
- portions et duree_minutes : seulement s'ils sont écrits, sinon null.
- groupes d'ingrédients : un groupe par sous-titre (« pour la pâte »…), avec nom null s'il n'y a qu'un groupe sans titre.
- chaque ingrédient : texte_origine exactement comme écrit (mesures d'époque comprises, par exemple « une livre de farine », « un verre de lait ») ; nom de l'ingrédient ; quantite et unite convertis en unités actuelles (g, kg, ml, cl, l, c. à s., c. à c.) quand la conversion est sûre, sinon la quantité écrite avec son unité d'origine, ou null si aucune quantité n'est indiquée.
- etapes : une entrée par étape, dans l'ordre, en gardant les mots de l'auteur.
- notes : les remarques, astuces ou annotations ajoutées (en marge, entre parenthèses, d'une autre écriture), à ne pas confondre avec les étapes ; pour chacune, etape est le numéro de l'étape qu'elle complète (1 pour la première), ou null si elle porte sur toute la recette.

Si la page contient plusieurs recettes, renvoie-les toutes, chacune séparément. Si une recette commence sur la page précédente (pas de titre en haut de page, phrase ou liste reprise en cours) ou continue sur la suivante (s'arrête en bas de page au milieu d'une étape ou d'une liste, « suite au verso »…), recopie seulement ce qui est sur cette page et indique-le avec commence_page_precedente et continue_page_suivante ; sinon mets-les à false. Si la page ne contient aucune recette, renvoie une liste vide.

Pour chaque mot que tu n'arrives pas à lire avec certitude, écris ta meilleure lecture dans le texte, puis ajoute-le à mots_douteux avec quelques mots autour comme contexte, et sa zone sur la photo : x et y du coin haut gauche, largeur et hauteur, en fractions de la largeur et de la hauteur de l'image (de 0 à 1) ; zone null si tu ne sais pas le situer.`;

// Les lectures d'avant US-13 donnent les notes en simple texte.
export type NoteLue = string | { texte: string; etape: number | null };
export const texteNote = (n: NoteLue) => (typeof n === "string" ? n : n.texte);
