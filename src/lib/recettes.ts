// Résumé d'une recette pour les cartes de l'accueil, des listes et des cahiers
// (vue recette_resume).
export type RecetteResume = {
  id: number;
  titre: string;
  statut: "brouillon" | "publiee";
  classique: boolean;
  type_repas_id: number | null;
  cahier_id: number | null;
  page_numero: number | null;
  vignette_chemin: string | null;
};

export type CarteRecette = {
  id: number;
  titre: string;
  classique: boolean;
  pageNumero: number | null;
  vignette?: string;
};

export const COLONNES_RESUME =
  "id, titre, statut, classique, type_repas_id, cahier_id, page_numero, vignette_chemin";

export function enCartes(
  recettes: RecetteResume[],
  urls: Map<string, string>,
): CarteRecette[] {
  return recettes.map((r) => ({
    id: r.id,
    titre: r.titre,
    classique: r.classique,
    pageNumero: r.page_numero,
    vignette: r.vignette_chemin ? urls.get(r.vignette_chemin) : undefined,
  }));
}
