// Affichage des quantités sur la fiche recette (US-18).

export const nombre = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export function quantiteModerne(quantite: number | null, unite: string | null) {
  if (quantite === null) return null;
  return unite ? `${nombre(quantite)} ${unite}` : nombre(quantite);
}

// Équivalence moderne d'une mesure d'époque : affichée seulement quand le texte du
// cahier ne donne pas déjà ce nombre (« 1/2 livre de farine » → « ≈ 250 g »).
export function equivalence(
  texteOrigine: string | null,
  quantite: number | null,
  unite: string | null,
) {
  const moderne = quantiteModerne(quantite, unite);
  if (!moderne || !texteOrigine || quantite === null) return null;
  const chiffres = [nombre(quantite), String(quantite)];
  return chiffres.some((c) =>
    new RegExp(`(^|[^\\d,.])${c.replace(/[.,]/g, "[.,]")}($|[^\\d,.])`).test(
      texteOrigine,
    ),
  )
    ? null
    : `≈ ${moderne}`;
}

export function duree(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}
