"use client";

import { useEffect, useState } from "react";
import { Ligne } from "@/components/cartes";
import { IconeOccasion, IconeTypeRepas } from "@/components/icones";
import {
  enCartes,
  type CarteRecette,
  type RecetteResume,
} from "@/lib/recettes";
import { creerClientNavigateur } from "@/lib/supabase/client";

type Valeur = { id: number; nom: string; image?: string };
type Panneau = "type" | "occasion" | null;

// US-26 et US-27 : recherche (nom ou ingrédient) et filtres par tags. Tant que rien
// n'est cherché ni filtré, l'accueil affiche ses rangées (children).
export function Recherche({
  typesRepas,
  occasions,
  children,
}: {
  typesRepas: Valeur[];
  occasions: Valeur[];
  children: React.ReactNode;
}) {
  const [texte, setTexte] = useState("");
  const [typeId, setTypeId] = useState<number | null>(null);
  const [occasionId, setOccasionId] = useState<number | null>(null);
  const [classique, setClassique] = useState(false);
  const [panneau, setPanneau] = useState<Panneau>(null);
  const [resultats, setResultats] = useState<CarteRecette[] | null>(null);
  const actif =
    texte.trim() !== "" || typeId !== null || occasionId !== null || classique;

  useEffect(() => {
    if (!actif) return;
    let annule = false;
    const minuteur = setTimeout(async () => {
      const supabase = creerClientNavigateur();
      const { data } = await supabase.rpc("chercher_recettes", {
        p_texte: texte.trim() || null,
        p_type_repas_id: typeId,
        p_occasion_id: occasionId,
        p_classique: classique,
      });
      const recettes = (data ?? []) as RecetteResume[];
      const chemins = recettes.flatMap((r) =>
        r.vignette_chemin ? [r.vignette_chemin] : [],
      );
      const urls = new Map<string, string>();
      if (chemins.length > 0) {
        const { data: signees } = await supabase.storage
          .from("images")
          .createSignedUrls(chemins, 3600);
        for (const s of signees ?? [])
          if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
      }
      if (!annule) setResultats(enCartes(recettes, urls));
    }, 250);
    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
  }, [actif, texte, typeId, occasionId, classique]);

  // Le panneau de filtres se referme dès qu'on fait défiler la page.
  useEffect(() => {
    if (!panneau) return;
    const fermer = () => setPanneau(null);
    window.addEventListener("scroll", fermer, { passive: true });
    return () => window.removeEventListener("scroll", fermer);
  }, [panneau]);

  const nomType = typesRepas.find((t) => t.id === typeId)?.nom;
  const nomOccasion = occasions.find((o) => o.id === occasionId)?.nom;

  return (
    <>
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 rounded-full border border-ardoise/25 px-4 py-3 focus-within:border-ardoise">
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <span className="sr-only">Chercher une recette</span>
          <input
            type="search"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Une recette, un ingrédient"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ardoise/50"
          />
        </label>

        <div className="-mx-6 flex gap-2 overflow-x-auto px-6 text-sm font-medium whitespace-nowrap">
          <BoutonFiltre
            libelle={nomType ?? "Type de repas"}
            ouvert={panneau === "type"}
            choisi={typeId !== null}
            onClick={() => setPanneau(panneau === "type" ? null : "type")}
          />
          <BoutonFiltre
            libelle={nomOccasion ?? "Occasion"}
            ouvert={panneau === "occasion"}
            choisi={occasionId !== null}
            onClick={() =>
              setPanneau(panneau === "occasion" ? null : "occasion")
            }
          />
          <button
            type="button"
            aria-pressed={classique}
            onClick={() => setClassique(!classique)}
            className={`rounded-full border px-2.5 py-2 ${
              classique
                ? "border-ardoise bg-ardoise text-white"
                : "border-ardoise/25"
            }`}
          >
            ★ Classiques
          </button>
        </div>

        {panneau === "type" ? (
          <Vignettes
            valeurs={typesRepas}
            choisie={typeId}
            icone={<IconeTypeRepas className="h-7 w-7" />}
            couleur="bg-ciel/30"
            onChoix={(id) => {
              setTypeId(id === typeId ? null : id);
              setPanneau(null);
            }}
          />
        ) : null}
        {panneau === "occasion" ? (
          <Vignettes
            valeurs={occasions}
            choisie={occasionId}
            icone={<IconeOccasion className="h-7 w-7" />}
            couleur="bg-jaune/50"
            onChoix={(id) => {
              setOccasionId(id === occasionId ? null : id);
              setPanneau(null);
            }}
          />
        ) : null}
      </div>

      {actif ? (
        <section className="flex flex-col gap-2" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {resultats === null
                ? "Recherche…"
                : resultats.length === 0
                  ? "Aucune recette trouvée"
                  : `${resultats.length} ${resultats.length > 1 ? "recettes" : "recette"}`}
            </h2>
            <button
              type="button"
              onClick={() => {
                setTexte("");
                setTypeId(null);
                setOccasionId(null);
                setClassique(false);
                setResultats(null);
              }}
              className="text-sm text-taupe underline underline-offset-4"
            >
              Tout effacer
            </button>
          </div>
          <ul className="flex flex-col divide-y divide-ardoise/10 md:grid md:grid-cols-2 md:gap-x-10 md:divide-y-0">
            {(resultats ?? []).map((r) => (
              <li key={r.id}>
                <Ligne recette={r} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        children
      )}
    </>
  );
}

function BoutonFiltre({
  libelle,
  ouvert,
  choisi,
  onClick,
}: {
  libelle: string;
  ouvert: boolean;
  choisi: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={ouvert}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-2 ${
        ouvert
          ? "border-2 border-ardoise"
          : choisi
            ? "border-ardoise bg-ardoise/10"
            : "border-ardoise/25"
      }`}
    >
      {libelle}
      <span aria-hidden className="text-xs">
        {ouvert ? "▲" : "▼"}
      </span>
    </button>
  );
}

function Vignettes({
  valeurs,
  choisie,
  icone,
  couleur,
  onChoix,
}: {
  valeurs: Valeur[];
  choisie: number | null;
  icone: React.ReactNode;
  couleur: string;
  onChoix: (id: number) => void;
}) {
  if (valeurs.length === 0)
    return (
      <p className="text-sm text-taupe">Aucune valeur dans cette liste.</p>
    );
  return (
    <ul className="grid grid-cols-3 gap-2 md:grid-cols-5">
      {valeurs.map((v) => (
        <li key={v.id}>
          <button
            type="button"
            aria-pressed={v.id === choisie}
            onClick={() => onChoix(v.id)}
            className={`flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl p-2 text-center text-sm ${couleur} ${
              v.id === choisie ? "ring-2 ring-ardoise" : ""
            }`}
          >
            {v.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL signée d'un bucket privé
              <img
                src={v.image}
                alt=""
                className="h-10 w-14 rounded-lg object-cover"
              />
            ) : (
              icone
            )}
            <span className="line-clamp-2 leading-tight">{v.nom}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
