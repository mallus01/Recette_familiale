"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// US-32 : barre d'onglets en bas de l'écran ; US-44 : barre latérale à gauche sur grand
// écran (à partir de 768 px : tablette et ordinateur). Masquée sur les écrans de détail qui ont
// leur propre barre d'actions (fiche, mode cuisine, relecture, capture) et hors connexion.
const MASQUEE = [
  /^\/connexion/,
  /^\/auth\//,
  /^\/recettes\//,
  /^\/numeriser\/relire\//,
  /^\/numeriser\/cahiers\/[^/]+\/capture/,
];

const ONGLETS = [
  {
    href: "/",
    libelle: "Accueil",
    icone: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
    actif: (c: string) => c === "/" || c.startsWith("/cahiers"),
  },
  {
    href: "/listes",
    libelle: "Mes listes",
    icone:
      "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
    actif: (c: string) => c.startsWith("/listes"),
  },
  {
    href: "/numeriser",
    libelle: "Numériser",
    icone:
      "M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
    actif: (c: string) => c.startsWith("/numeriser"),
    contributeurs: true,
  },
  {
    href: "/profil",
    libelle: "Profil",
    icone: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
    actif: (c: string) => c.startsWith("/profil"),
  },
];

export function BarreOnglets({ numeriser }: { numeriser: boolean }) {
  const chemin = usePathname();
  if (MASQUEE.some((m) => m.test(chemin))) return null;
  return (
    <nav
      aria-label="Navigation principale"
      className="sticky bottom-0 z-20 border-t border-ardoise/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:top-0 md:order-first md:h-dvh md:w-56 md:shrink-0 md:border-t-0 md:border-r md:pt-[max(2rem,env(safe-area-inset-top))]"
    >
      <p className="hidden px-6 pb-6 text-lg font-semibold tracking-tight md:block">
        Recettes familiales
      </p>
      <ul className="mx-auto flex max-w-md md:flex-col md:gap-1 md:px-3">
        {ONGLETS.filter((o) => numeriser || !o.contributeurs).map((o) => {
          const actif = o.actif(chemin);
          return (
            <li key={o.href} className="flex-1">
              <Link
                href={o.href}
                aria-current={actif ? "page" : undefined}
                className={`flex flex-col items-center gap-1 pt-2.5 pb-2 text-xs md:flex-row md:gap-3 md:rounded-xl md:px-3 md:py-2.5 md:text-base ${
                  actif
                    ? "font-semibold text-ardoise md:bg-ardoise/10"
                    : "text-ardoise/60 md:hover:bg-ardoise/5"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-6 w-6"
                  fill={actif ? "currentColor" : "none"}
                  fillOpacity={actif ? 0.15 : undefined}
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                >
                  <path d={o.icone} />
                </svg>
                {o.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
