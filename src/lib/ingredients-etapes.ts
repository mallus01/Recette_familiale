// US-35 et US-36 : ingrédients utilisés à chaque étape, repérés quand leur mot principal
// apparaît dans le texte de l'étape (« Mélanger la farine et les œufs » → farine, œufs).

const MOTS_VIDES = new Set([
  "de",
  "du",
  "des",
  "d",
  "la",
  "le",
  "les",
  "l",
  "un",
  "une",
  "et",
  "en",
  "a",
  "au",
  "aux",
  "pour",
  "avec",
  "sans",
  "ou",
  "gros",
  "grosse",
  "petit",
  "petite",
  "petits",
  "petites",
  "bon",
  "bonne",
  "beau",
  "belle",
  "demi",
  "moitie",
  "quelques",
  "pincee",
  "cuillere",
  "cuilleree",
  "verre",
  "tasse",
  "livre",
  "once",
  "pot",
  "sachet",
  "morceau",
  "tranche",
  "noix",
  "botte",
  "brin",
  "gousse",
  "zeste",
]);

const normaliser = (t: string) =>
  t
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// Singulier approximatif : « oeufs » → « oeuf », « choux » → « chou ».
const racine = (mot: string) =>
  mot.length > 3 ? mot.replace(/[sx]$/, "") : mot;

const mots = (t: string) =>
  normaliser(t)
    .split(/[^a-z]+/)
    .filter(Boolean);

// Mot principal d'un ingrédient : le premier mot qui n'est ni un article, ni une mesure,
// ni un adjectif courant (« gousse d'ail » → ail, « farine de blé » → farine).
export function motPrincipal(nom: string) {
  const m = mots(nom).find((x) => x.length >= 2 && !MOTS_VIDES.has(x));
  return m ? racine(m) : null;
}

export function ingredientsParEtape(
  ingredients: { id: number; nom: string }[],
  etapes: string[],
): number[][] {
  const principaux = ingredients.flatMap((i) => {
    const m = motPrincipal(i.nom);
    return m ? [{ id: i.id, m }] : [];
  });
  return etapes.map((texte) => {
    const presents = new Set(mots(texte).map(racine));
    return principaux.filter((p) => presents.has(p.m)).map((p) => p.id);
  });
}
