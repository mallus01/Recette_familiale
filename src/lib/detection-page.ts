// Détection automatique de la page sur une photo (cahier des charges : « la page est
// détectée et recadrée automatiquement »). Méthode légère, sans bibliothèque :
// sur une version réduite en niveaux de gris, on sépare le papier clair du fond
// (seuil d'Otsu), on bouche les lignes d'écriture (fermeture morphologique), puis on
// garde la plus grande zone claire. Le recadrage est rectangulaire, sans correction
// de perspective. Si la page ne se distingue pas nettement du fond, on ne recadre pas.

export type Cadre = { x: number; y: number; largeur: number; hauteur: number };

const ECART_MIN = 40; // écart minimal de luminosité entre papier et fond (0 à 255)
const SURFACE_MIN = 0.15; // la page occupe au moins 15 % de la photo
const COUVERTURE_MAX = 0.97; // au-delà, la page remplit déjà la photo
const MARGE = 0.015; // marge gardée autour de la page, en part du côté

export function detecterPage(
  gris: Uint8ClampedArray,
  largeur: number,
  hauteur: number,
): Cadre | null {
  const n = largeur * hauteur;
  const { seuil, ecart } = otsu(gris);
  if (ecart < ECART_MIN) return null;

  let masque = new Uint8Array(n);
  for (let i = 0; i < n; i++) masque[i] = gris[i] > seuil ? 1 : 0;

  // Fermeture : dilatation puis érosion, pour relier le papier coupé par l'écriture.
  const rayon = Math.max(1, Math.round(Math.max(largeur, hauteur) / 100));
  masque = eroder(
    dilater(masque, largeur, hauteur, rayon),
    largeur,
    hauteur,
    rayon,
  );

  const zone = plusGrandeZone(masque, largeur, hauteur);
  if (!zone || zone.surface < n * SURFACE_MIN) return null;
  if (
    zone.largeur > largeur * COUVERTURE_MAX &&
    zone.hauteur > hauteur * COUVERTURE_MAX
  )
    return null;

  const mx = Math.round(largeur * MARGE);
  const my = Math.round(hauteur * MARGE);
  const x = Math.max(0, zone.x - mx);
  const y = Math.max(0, zone.y - my);
  return {
    x,
    y,
    largeur: Math.min(largeur, zone.x + zone.largeur + mx) - x,
    hauteur: Math.min(hauteur, zone.y + zone.hauteur + my) - y,
  };
}

function otsu(gris: Uint8ClampedArray) {
  const histo = new Array<number>(256).fill(0);
  for (const v of gris) histo[v]++;
  const total = gris.length;
  let somme = 0;
  for (let v = 0; v < 256; v++) somme += v * histo[v];

  let sommeFond = 0;
  let poidsFond = 0;
  let meilleur = { seuil: 127, variance: -1, ecart: 0 };
  for (let v = 0; v < 256; v++) {
    poidsFond += histo[v];
    if (poidsFond === 0) continue;
    const poidsPapier = total - poidsFond;
    if (poidsPapier === 0) break;
    sommeFond += v * histo[v];
    const moyFond = sommeFond / poidsFond;
    const moyPapier = (somme - sommeFond) / poidsPapier;
    const variance = poidsFond * poidsPapier * (moyFond - moyPapier) ** 2;
    if (variance > meilleur.variance)
      meilleur = { seuil: v, variance, ecart: moyPapier - moyFond };
  }
  return meilleur;
}

// Filtres max (dilatation) et min (érosion) carrés, appliqués en deux passes.
function dilater(m: Uint8Array, l: number, h: number, r: number) {
  return filtre(filtre(m, l, h, r, true, true), l, h, r, false, true);
}
function eroder(m: Uint8Array, l: number, h: number, r: number) {
  return filtre(filtre(m, l, h, r, true, false), l, h, r, false, false);
}
function filtre(
  m: Uint8Array,
  l: number,
  h: number,
  r: number,
  horizontal: boolean,
  max: boolean,
) {
  const sortie = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      let v = max ? 0 : 1;
      for (let d = -r; d <= r; d++) {
        const xx = horizontal ? x + d : x;
        const yy = horizontal ? y : y + d;
        // Hors de l'image : neutre pour la dilatation, « fond » pour l'érosion.
        const p =
          xx < 0 || yy < 0 || xx >= l || yy >= h
            ? max
              ? 0
              : 1
            : m[yy * l + xx];
        if (max ? p === 1 : p === 0) {
          v = max ? 1 : 0;
          break;
        }
      }
      sortie[y * l + x] = v;
    }
  }
  return sortie;
}

function plusGrandeZone(m: Uint8Array, l: number, h: number) {
  const vu = new Uint8Array(m.length);
  const pile = new Int32Array(m.length);
  let meilleure: (Cadre & { surface: number }) | null = null;

  for (let depart = 0; depart < m.length; depart++) {
    if (!m[depart] || vu[depart]) continue;
    let haut = 0;
    pile[haut++] = depart;
    vu[depart] = 1;
    let surface = 0;
    let x0 = l,
      y0 = h,
      x1 = 0,
      y1 = 0;
    while (haut > 0) {
      const i = pile[--haut];
      const x = i % l;
      const y = (i - x) / l;
      surface++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const voisins = [
        x > 0 ? i - 1 : -1,
        x < l - 1 ? i + 1 : -1,
        y > 0 ? i - l : -1,
        y < h - 1 ? i + l : -1,
      ];
      for (const j of voisins) {
        if (j >= 0 && m[j] && !vu[j]) {
          vu[j] = 1;
          pile[haut++] = j;
        }
      }
    }
    if (!meilleure || surface > meilleure.surface) {
      meilleure = {
        x: x0,
        y: y0,
        largeur: x1 - x0 + 1,
        hauteur: y1 - y0 + 1,
        surface,
      };
    }
  }
  return meilleure;
}
