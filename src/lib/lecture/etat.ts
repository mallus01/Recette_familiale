export type StatutPage = "en_attente" | "lecture_en_cours" | "prete" | "en_echec";

// Libellé de l'état d'une page, avec le nombre de mots douteux quand elle est prête.
export function libelleEtat(statut: StatutPage, nbMotsDouteux: number) {
  if (statut === "en_attente") return "En attente";
  if (statut === "lecture_en_cours") return "Lecture en cours";
  if (statut === "en_echec") return "En échec";
  if (nbMotsDouteux === 0) return "Prête";
  return `Prête · ${nbMotsDouteux} ${nbMotsDouteux === 1 ? "mot douteux" : "mots douteux"}`;
}

export const enLecture = (statut: StatutPage) => statut === "en_attente" || statut === "lecture_en_cours";
