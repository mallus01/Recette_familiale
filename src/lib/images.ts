// Préparation des photos avant envoi (cahier des charges : environ 300 Ko par image,
// texte toujours lisible au zoom). Réduit la taille puis la qualité JPEG jusqu'à passer
// sous le plafond. Les pages sont d'abord recadrées sur la feuille détectée.

import { detecterPage, type Cadre } from "./detection-page";

const PLAFOND_OCTETS = 300 * 1024;
const COTE_MAX = 2000; // pixels sur le plus grand côté : l'écriture reste lisible au zoom
const COTE_ANALYSE = 256; // taille de la version réduite servant à détecter la page

// Couverture : photo entière, compressée.
export async function compresserPhoto(fichier: File): Promise<Blob> {
  const image = await createImageBitmap(fichier, {
    imageOrientation: "from-image",
  });
  try {
    return await compresser(image, {
      x: 0,
      y: 0,
      largeur: image.width,
      hauteur: image.height,
    });
  } finally {
    image.close();
  }
}

// Page d'un cahier : recadrée sur la feuille quand elle se distingue du fond, puis compressée.
export async function preparerPage(
  fichier: File,
): Promise<{ blob: Blob; recadree: boolean }> {
  const image = await createImageBitmap(fichier, {
    imageOrientation: "from-image",
  });
  try {
    const cadre = cadrePage(image);
    const entier = { x: 0, y: 0, largeur: image.width, hauteur: image.height };
    return {
      blob: await compresser(image, cadre ?? entier),
      recadree: cadre !== null,
    };
  } finally {
    image.close();
  }
}

function cadrePage(image: ImageBitmap): Cadre | null {
  const echelle = COTE_ANALYSE / Math.max(image.width, image.height);
  const l = Math.max(1, Math.round(image.width * echelle));
  const h = Math.max(1, Math.round(image.height * echelle));
  const canvas = document.createElement("canvas");
  canvas.width = l;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, l, h);
  const pixels = ctx.getImageData(0, 0, l, h).data;
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
  const fx = image.width / l;
  const fy = image.height / h;
  return {
    x: Math.round(cadre.x * fx),
    y: Math.round(cadre.y * fy),
    largeur: Math.min(image.width, Math.round(cadre.largeur * fx)),
    hauteur: Math.min(image.height, Math.round(cadre.hauteur * fy)),
  };
}

async function compresser(image: ImageBitmap, cadre: Cadre): Promise<Blob> {
  let cote = Math.min(COTE_MAX, Math.max(cadre.largeur, cadre.hauteur));

  for (let essai = 0; essai < 6; essai++) {
    const echelle = cote / Math.max(cadre.largeur, cadre.hauteur);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cadre.largeur * echelle);
    canvas.height = Math.round(cadre.hauteur * echelle);
    canvas
      .getContext("2d")!
      .drawImage(
        image,
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
  throw new Error("Photo impossible à compresser sous 300 Ko");
}
