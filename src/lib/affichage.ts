// US-56 et US-57 : taille du texte et contraste renforcé. Le réglage est gardé avec le
// membre (tous ses appareils) et copié sur l'appareil, pour s'appliquer avant l'affichage.

export type Taille = "normale" | "grande" | "tres_grande";
export type Affichage = { taille: Taille; contraste: boolean };

export const TAILLES: { valeur: Taille; libelle: string }[] = [
  { valeur: "normale", libelle: "Normale" },
  { valeur: "grande", libelle: "Grande" },
  { valeur: "tres_grande", libelle: "Très grande" },
];

const CLE = "affichage";

export function appliquerAffichage(a: Affichage) {
  const html = document.documentElement;
  html.dataset.taille = a.taille;
  if (a.contraste) html.dataset.contraste = "renforce";
  else delete html.dataset.contraste;
  try {
    localStorage.setItem(CLE, JSON.stringify(a));
  } catch {
    // Stockage indisponible (navigation privée) : le réglage vaut pour cette visite.
  }
}

// Exécuté dans <head> avant le premier affichage, pour éviter un saut de taille.
export const SCRIPT_AFFICHAGE = `try{var a=JSON.parse(localStorage.getItem("${CLE}")||"null");if(a){var h=document.documentElement;h.dataset.taille=a.taille;if(a.contraste)h.dataset.contraste="renforce"}}catch(e){}`;
