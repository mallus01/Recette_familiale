// Compression des photos avant envoi (cahier des charges : environ 300 Ko par image,
// texte toujours lisible au zoom). Réduit la taille puis la qualité JPEG jusqu'à passer
// sous le plafond.

const PLAFOND_OCTETS = 300 * 1024;
const COTE_MAX = 2000; // pixels sur le plus grand côté : l'écriture reste lisible au zoom

export async function compresserPhoto(fichier: File): Promise<Blob> {
  const image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  let cote = Math.min(COTE_MAX, Math.max(image.width, image.height));

  for (let essai = 0; essai < 6; essai++) {
    const echelle = cote / Math.max(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * echelle);
    canvas.height = Math.round(image.height * echelle);
    canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const qualite of [0.82, 0.72, 0.62, 0.52]) {
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualite));
      if (blob && blob.size <= PLAFOND_OCTETS) {
        image.close();
        return blob;
      }
    }
    cote = Math.round(cote * 0.8);
  }
  image.close();
  throw new Error("Photo impossible à compresser sous 300 Ko");
}
