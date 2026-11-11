import Link from "next/link";
import type { CarteRecette } from "@/lib/recettes";

// Vignette d'une recette : sa première photo validée, sinon un extrait du haut de son scan.
export function Vignette({
  url,
  photo = false,
  className = "",
}: {
  url?: string;
  photo?: boolean;
  className?: string;
}) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- URL signée d'un bucket privé
    <img
      src={url}
      alt=""
      loading="lazy"
      className={`bg-jaune/40 object-cover ${photo ? "" : "object-top"} ${className}`}
    />
  ) : (
    <div className={`bg-jaune/40 ${className}`} />
  );
}

// Carte d'une rangée de l'accueil.
export function Carte({ recette }: { recette: CarteRecette }) {
  return (
    <Link
      href={`/recettes/${recette.id}`}
      className="flex w-32 shrink-0 flex-col gap-2"
    >
      <Vignette
        url={recette.vignette}
        photo={recette.photo}
        className="aspect-[3/4] w-full rounded-xl"
      />
      <span className="line-clamp-2 text-sm leading-snug font-medium">
        {recette.classique ? <span aria-label="Classique">★ </span> : null}
        {recette.titre}
      </span>
    </Link>
  );
}

// US-48 : grande carte de la rangée À cuisiner (variante « grandes » du test A/B).
export function GrandeCarte({ recette }: { recette: CarteRecette }) {
  return (
    <Link
      href={`/recettes/${recette.id}`}
      className="flex w-[78%] max-w-80 shrink-0 snap-start flex-col gap-2.5"
    >
      <Vignette
        url={recette.vignette}
        photo={recette.photo}
        className="aspect-[4/3] w-full rounded-2xl"
      />
      <span className="line-clamp-2 text-base leading-snug font-semibold">
        {recette.classique ? <span aria-label="Classique">★ </span> : null}
        {recette.titre}
      </span>
    </Link>
  );
}

// Ligne d'une liste (Mes listes, recherche, cahier).
export function Ligne({
  recette,
  detail,
}: {
  recette: CarteRecette;
  detail?: string;
}) {
  return (
    <Link
      href={`/recettes/${recette.id}`}
      className="flex items-center gap-4 py-2"
    >
      <Vignette
        url={recette.vignette}
        photo={recette.photo}
        className="h-16 w-14 shrink-0 rounded-lg"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium leading-snug">
          {recette.classique ? <span aria-label="Classique">★ </span> : null}
          {recette.titre}
        </span>
        {detail ? <span className="text-sm text-taupe">{detail}</span> : null}
      </span>
    </Link>
  );
}

// Rangée défilant horizontalement.
export function Rangee({
  titre,
  action,
  aimantee = false,
  children,
}: {
  titre: string;
  action?: React.ReactNode;
  // Défilement qui s'arrête sur chaque carte (grandes cartes).
  aimantee?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{titre}</h2>
        {action}
      </div>
      <div
        className={`-mx-6 flex gap-3 overflow-x-auto px-6 pb-1 ${
          aimantee ? "snap-x snap-mandatory scroll-px-6" : ""
        }`}
      >
        {children}
      </div>
    </section>
  );
}
