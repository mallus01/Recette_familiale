// Prix en dollars par million de jetons (entrée, sortie), pour estimer le coût par page.
// Claude Opus 5.5 : tarif public d'Anthropic. Gemini : à renseigner selon la grille de
// Google (LECTURE_PRIX_GEMINI="entrée,sortie"), sinon le coût reste inconnu.
const PRIX: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  simulee: [0, 0],
};

function prixDepuisEnv(valeur: string | undefined): [number, number] | null {
  const [e, s] = (valeur ?? "").split(",").map(Number);
  return Number.isFinite(e) && Number.isFinite(s) && valeur ? [e, s] : null;
}

export function coutEstime(fournisseur: string, modele: string, entree: number, sortie: number) {
  const prix =
    (fournisseur === "gemini" ? prixDepuisEnv(process.env.LECTURE_PRIX_GEMINI) : null) ??
    (fournisseur === "claude" ? prixDepuisEnv(process.env.LECTURE_PRIX_CLAUDE) : null) ??
    PRIX[modele] ??
    null;
  if (!prix) return null;
  return (entree * prix[0] + sortie * prix[1]) / 1_000_000;
}
