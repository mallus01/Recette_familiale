// Adaptation des quantités au nombre de personnes (US-24) et liste de courses (US-25).
import { nombre } from "./mesures";

export type IngredientQuantifie = {
  quantite: number | null;
  unite: string | null;
  nom: string;
  texte_origine: string | null;
};

const pas = (valeur: number, pas: number) =>
  Math.max(pas, Math.round(valeur / pas) * pas);

// Arrondi à la valeur pratique la plus proche : 1,33 œuf donne 1 œuf, 133 g donnent 135 g.
export function arrondiPratique(valeur: number, unite: string | null) {
  const u = (unite ?? "").trim().toLowerCase();
  if (["g", "ml", "mg"].includes(u)) return paliers(valeur);
  if (u === "cl" || u === "dl") return valeur < 10 ? pas(valeur, 0.5) : pas(valeur, 1);
  if (["kg", "l"].includes(u)) return paliers(valeur * 1000) / 1000;
  if (!u) return valeur < 1 ? pas(valeur, 0.5) : Math.round(valeur);
  // Cuillères, pincées, verres… : au demi près.
  return pas(valeur, 0.5);
}

function paliers(valeur: number) {
  if (valeur < 20) return pas(valeur, 1);
  if (valeur < 250) return pas(valeur, 5);
  if (valeur < 1000) return pas(valeur, 10);
  return pas(valeur, 50);
}

export function quantiteAdaptee(
  quantite: number,
  unite: string | null,
  facteur: number,
) {
  return facteur === 1 ? quantite : arrondiPratique(quantite * facteur, unite);
}

const commenceParVoyelle = (mot: string) =>
  /^[aeiouyhàâäéèêëîïôöûüœ]/i.test(mot);

// Libellé d'un ingrédient avec sa quantité moderne adaptée : « 135 g de lardons »,
// « 1 oignon ». Un ingrédient sans quantité chiffrée garde son texte d'origine.
export function libelleAdapte(i: IngredientQuantifie, facteur: number) {
  const nom = i.nom.trim();
  if (i.quantite === null) return i.texte_origine?.trim() || nom;
  const q = nombre(quantiteAdaptee(i.quantite, i.unite, facteur));
  const unite = i.unite?.trim();
  if (!unite) return `${q} ${nom}`;
  if (/^(de |d’|d'|du |des )/i.test(nom)) return `${q} ${unite} ${nom}`;
  return `${q} ${unite} ${commenceParVoyelle(nom) ? "d’" : "de "}${nom}`;
}

export const personnes = (n: number) =>
  `${n} ${n > 1 ? "personnes" : "personne"}`;

// Texte copié pour la liste de courses : nom de la recette et nombre de personnes,
// puis les ingrédients en liste à tirets.
export function texteCourses(
  titre: string,
  nombrePersonnes: number | null,
  ingredients: IngredientQuantifie[],
  facteur: number,
) {
  const entete = nombrePersonnes
    ? `${titre} (${personnes(nombrePersonnes)})`
    : titre;
  return [
    entete,
    ...ingredients.map((i) => `- ${libelleAdapte(i, facteur)}`),
  ].join("\n");
}

// Nombre de personnes passé dans l'adresse (?personnes=6), entre 1 et 50.
export function personnesChoisies(valeur: string | string[] | undefined) {
  const n = Number(Array.isArray(valeur) ? valeur[0] : valeur);
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : null;
}
