"""Génère les icônes de l'appli (PWA, iOS, favicon) aux couleurs de la palette.

Usage : python3 scripts/generer-icones.py  (nécessite Pillow)
"""

from pathlib import Path

from PIL import Image, ImageDraw

ARDOISE = "#5C707D"
JAUNE = "#FCDC8D"
PECHE = "#FCA86E"
TAUPE = "#7D735C"

RACINE = Path(__file__).resolve().parent.parent


def dessiner(taille: int, marge: float) -> Image.Image:
    """Un cahier ouvert jaune pâle, avec des lignes et un marque-page pêche.

    `marge` est la part de l'icône laissée vide autour du dessin
    (plus grande pour l'icône « maskable », que les systèmes recadrent).
    """
    echelle = 4  # dessin en haute résolution puis réduction, pour lisser les bords
    t = taille * echelle
    img = Image.new("RGB", (t, t), ARDOISE)
    d = ImageDraw.Draw(img)

    zone = t * (1 - 2 * marge)
    x0 = t * marge
    y0 = t * marge + zone * 0.12
    largeur = zone
    hauteur = zone * 0.76
    milieu = x0 + largeur / 2
    rayon = zone * 0.05

    # Deux pages
    d.rounded_rectangle(
        [x0, y0, milieu - zone * 0.015, y0 + hauteur], rayon, fill=JAUNE
    )
    d.rounded_rectangle(
        [milieu + zone * 0.015, y0, x0 + largeur, y0 + hauteur], rayon, fill=JAUNE
    )

    # Lignes d'écriture
    epaisseur = max(1, int(zone * 0.035))
    for i in range(4):
        y = y0 + hauteur * (0.25 + i * 0.17)
        d.line(
            [x0 + zone * 0.08, y, milieu - zone * 0.08, y], fill=TAUPE, width=epaisseur
        )
        fin = x0 + largeur - zone * (0.08 if i < 3 else 0.2)
        d.line([milieu + zone * 0.08, y, fin, y], fill=TAUPE, width=epaisseur)

    # Marque-page
    mx = x0 + largeur * 0.74
    mw = zone * 0.1
    my = y0 - zone * 0.06
    d.polygon(
        [
            (mx, my),
            (mx + mw, my),
            (mx + mw, my + zone * 0.32),
            (mx + mw / 2, my + zone * 0.26),
            (mx, my + zone * 0.32),
        ],
        fill=PECHE,
    )

    return img.resize((taille, taille), Image.LANCZOS)


def main() -> None:
    public = RACINE / "public" / "icons"
    public.mkdir(parents=True, exist_ok=True)
    dessiner(192, 0.14).save(public / "icon-192.png")
    dessiner(512, 0.14).save(public / "icon-512.png")
    dessiner(512, 0.24).save(public / "icon-maskable-512.png")

    app = RACINE / "src" / "app"
    dessiner(180, 0.14).save(app / "apple-icon.png")  # icône de l'écran d'accueil iOS
    dessiner(64, 0.1).save(app / "icon.png")  # favicon


if __name__ == "__main__":
    main()
