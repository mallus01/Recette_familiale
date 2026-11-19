// Préparation des photos avant envoi (cahier des charges : environ 300 Ko par image,
// texte toujours lisible au zoom). Réduit la taille puis la qualité JPEG jusqu'à passer
// sous le plafond. Les pages sont d'abord recadrées sur la feuille détectée.
//
// Photos noires : sur téléphone (Safari iOS surtout), une photo pouvait sortir
// entièrement noire. Trois causes sont traitées ici :
// - la mémoire des canvas : Safari limite la mémoire totale des canvas et ne la rend
//   qu'au ramasse-miettes ; au-delà, il dessine du noir. On réutilise un seul canvas
//   par photo et on le vide (largeur et hauteur à 0) dès qu'on a fini ;
// - le décodage par createImageBitmap, qui rend parfois une image noire pour les
//   grandes photos d'iPhone : on vérifie le résultat et, s'il est noir, on décode à
//   nouveau par un élément <img> ;
// - la transparence (PNG, captures) : le JPEG n'a pas de transparence et la remplace
//   par du noir. On peint un fond blanc avant de dessiner.
// Si la photo reste noire malgré tout, on refuse de l'envoyer plutôt que d'enregistrer
// une image vide.

import { detecterPage, type Cadre } from "./detection-page";

const PLAFOND_OCTETS = 300 * 1024;
const COTE_MAX = 2000; // pixels sur le plus grand côté : l'écriture reste lisible au zoom
const COTE_ANALYSE = 256; // taille de la version réduite servant à détecter la page
const COTE_CONTROLE = 32; // taille de la vignette servant à repérer une image noire
const LUMIERE_MIN = 12; // en dessous (0 à 255) sur toute la vignette, l'image est noire

const MESSAGE_PHOTO_ILLISIBLE =
  "La photo n'a pas pu être lue. Réessayez, ou fermez d'autres applications pour libérer de la mémoire.";

type Source = {
  dessin: CanvasImageSource;
  largeur: number;
  hauteur: number;
  liberer: () => void;
};

// Couverture : photo entière, compressée.
export async function compresserPhoto(fichier: File): Promise<Blob> {
  return avecSource(fichier, (source) =>
    compresser(source, {
      x: 0,
      y: 0,
      largeur: source.largeur,
      hauteur: source.hauteur,
    }),
  );
}

// Page d'un cahier : recadrée sur la feuille quand elle se distingue du fond, puis compressée.
export async function preparerPage(
  fichier: File,
): Promise<{ blob: Blob; recadree: boolean }> {
  return avecSource(fichier, async (source) => {
    const cadre = cadrePage(source);
    const entier = {
      x: 0,
      y: 0,
      largeur: source.largeur,
      hauteur: source.hauteur,
    };
    return {
      blob: await compresser(source, cadre ?? entier),
      recadree: cadre !== null,
    };
  });
}

// Décode la photo, vérifie qu'elle n'est pas noire, puis libère la mémoire quoi qu'il arrive.
async function avecSource<T>(
  fichier: File,
  traiter: (source: Source) => Promise<T>,
): Promise<T> {
  const source = await decoder(fichier);
  try {
    return await traiter(source);
  } finally {
    source.liberer();
  }
}

async function decoder(fichier: File): Promise<Source> {
  // 1er essai : createImageBitmap, rapide et respectueux de l'orientation EXIF.
  try {
    const bitmap = await createImageBitmap(fichier, {
      imageOrientation: "from-image",
    });
    const source: Source = {
      dessin: bitmap,
      largeur: bitmap.width,
      hauteur: bitmap.height,
      liberer: () => bitmap.close(),
    };
    if (!estNoire(source)) return source;
    source.liberer();
  } catch {
    // Format non pris en charge par createImageBitmap : on essaie avec <img>.
  }

  // 2e essai : élément <img> (les navigateurs appliquent aussi l'orientation EXIF).
  const url = URL.createObjectURL(fichier);
  const img = new Image();
  try {
    img.src = url;
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(MESSAGE_PHOTO_ILLISIBLE);
  }
  const source: Source = {
    dessin: img,
    largeur: img.naturalWidth,
    hauteur: img.naturalHeight,
    liberer: () => {
      img.src = "";
      URL.revokeObjectURL(url);
    },
  };
  if (source.largeur === 0 || source.hauteur === 0 || estNoire(source)) {
    source.liberer();
    throw new Error(MESSAGE_PHOTO_ILLISIBLE);
  }
  return source;
}

// Dessine une vignette sur fond blanc : si tout est quasi noir, le décodage a échoué.
function estNoire(source: Source): boolean {
  const canvas = creerCanvas(COTE_CONTROLE, COTE_CONTROLE);
  try {
    const ctx = contexte(canvas, true);
    if (!ctx) return true;
    ctx.drawImage(source.dessin, 0, 0, COTE_CONTROLE, COTE_CONTROLE);
    const pixels = ctx.getImageData(0, 0, COTE_CONTROLE, COTE_CONTROLE).data;
    for (let i = 0; i < pixels.length; i += 4) {
      if (
        pixels[i] > LUMIERE_MIN ||
        pixels[i + 1] > LUMIERE_MIN ||
        pixels[i + 2] > LUMIERE_MIN
      )
        return false;
    }
    return true;
  } finally {
    viderCanvas(canvas);
  }
}

function cadrePage(source: Source): Cadre | null {
  const echelle = COTE_ANALYSE / Math.max(source.largeur, source.hauteur);
  const l = Math.max(1, Math.round(source.largeur * echelle));
  const h = Math.max(1, Math.round(source.hauteur * echelle));
  const canvas = creerCanvas(l, h);
  let pixels: Uint8ClampedArray;
  try {
    const ctx = contexte(canvas, true);
    if (!ctx) return null;
    ctx.drawImage(source.dessin, 0, 0, l, h);
    pixels = ctx.getImageData(0, 0, l, h).data;
  } finally {
    viderCanvas(canvas);
  }
  const gris = new Uint8ClampedArray(l * h);
  for (let i = 0; i < gris.length; i++) {
    gris[i] =
      0.299 * pixels[i * 4] +
      0.587 * pixels[i * 4 + 1] +
      0.114 * pixels[i * 4 + 2];
  }

  const cadre = detecterPage(gris, l, h);
  if (!cadre) return null;
  // Retour aux dimensions de la photo d'origine.
  const fx = source.largeur / l;
  const fy = source.hauteur / h;
  return {
    x: Math.round(cadre.x * fx),
    y: Math.round(cadre.y * fy),
    largeur: Math.min(source.largeur, Math.round(cadre.largeur * fx)),
    hauteur: Math.min(source.hauteur, Math.round(cadre.hauteur * fy)),
  };
}

async function compresser(source: Source, cadre: Cadre): Promise<Blob> {
  let cote = Math.min(COTE_MAX, Math.max(cadre.largeur, cadre.hauteur));
  // Un seul canvas pour tous les essais, vidé à la fin (mémoire limitée sur iPhone).
  const canvas = creerCanvas(1, 1);
  try {
    for (let essai = 0; essai < 6; essai++) {
      const echelle = cote / Math.max(cadre.largeur, cadre.hauteur);
      canvas.width = Math.max(1, Math.round(cadre.largeur * echelle));
      canvas.height = Math.max(1, Math.round(cadre.hauteur * echelle));
      const ctx = contexte(canvas, false);
      if (!ctx) throw new Error(MESSAGE_PHOTO_ILLISIBLE);
      ctx.drawImage(
        source.dessin,
        cadre.x,
        cadre.y,
        cadre.largeur,
        cadre.hauteur,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      for (const qualite of [0.82, 0.72, 0.62, 0.52]) {
        const blob = await new Promise<Blob | null>((ok) =>
          canvas.toBlob(ok, "image/jpeg", qualite),
        );
        if (blob && blob.size <= PLAFOND_OCTETS) return blob;
      }
      cote = Math.round(cote * 0.8);
    }
  } finally {
    viderCanvas(canvas);
  }
  throw new Error("Photo impossible à compresser sous 300 Ko");
}

function creerCanvas(largeur: number, hauteur: number) {
  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;
  return canvas;
}

// Contexte peint en blanc : les zones transparentes ne deviennent pas noires en JPEG.
function contexte(canvas: HTMLCanvasElement, lecture: boolean) {
  const ctx = canvas.getContext("2d", { willReadFrequently: lecture });
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

// Rend tout de suite la mémoire du canvas (Safari attend sinon le ramasse-miettes).
function viderCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}
