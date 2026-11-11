// V3 : test A/B des grandes cartes de la rangée À cuisiner (US-48 à US-50).
export const TEST_CARTES = "cartes_a_cuisiner";

export type VarianteCartes = "standard" | "grandes";

export const LIBELLES_VARIANTE: Record<VarianteCartes, string> = {
  standard: "Cartes standard",
  grandes: "Grandes cartes",
};

export type MesureAb = "affichage" | "ouverture" | "cuisinee";
