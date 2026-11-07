"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { enLecture, libelleEtat, type StatutPage } from "@/lib/lecture/etat";
import { lancerLecture } from "@/lib/lecture/lancer";

export type PageARelire = {
  id: number;
  numero: number;
  url?: string;
  statut: StatutPage;
  nb_mots_douteux: number;
  titres: string[];
};
export type CahierARelire = { id: number; nom: string; pages: PageARelire[] };

export function FileARelire({ cahiers }: { cahiers: CahierARelire[] }) {
  const router = useRouter();
  const [relancees, setRelancees] = useState<Set<number>>(new Set());
  const toutes = cahiers.flatMap((c) => c.pages);
  const enCours = toutes.some((p) => enLecture(p.statut));
  const pretes = toutes.filter((p) => p.statut === "prete").length;

  // Tant que l'IA lit des pages, on rafraîchit la file.
  useEffect(() => {
    if (!enCours) return;
    const minuteur = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(minuteur);
  }, [enCours, router]);

  async function relancer(id: number) {
    setRelancees((s) => new Set([...s, id]));
    await lancerLecture(id);
    router.refresh();
  }

  if (toutes.length === 0) {
    return (
      <p className="rounded-2xl bg-ciel/15 p-5 leading-relaxed">
        Aucune page à relire. Les pages photographiées apparaissent ici pendant leur lecture par l’IA.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-taupe">
        {toutes.length === 1 ? "1 page" : `${toutes.length} pages`}, dont{" "}
        {pretes === 1 ? "1 prête" : `${pretes} prêtes`} à relire.
      </p>
      {cahiers.map((c) => (
        <section key={c.id} className="flex flex-col gap-3">
          <h2 className="font-semibold">
            <Link href={`/numeriser/cahiers/${c.id}`} className="underline-offset-4 hover:underline">
              {c.nom}
            </Link>
          </h2>
          <ul className="flex flex-col divide-y divide-ardoise/10 rounded-2xl border border-ardoise/15">
            {c.pages.map((p) => (
              <li key={p.id} className="flex items-center gap-4 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL signée d'un bucket privé */}
                <img src={p.url} alt={`Page ${p.numero}`} className="h-16 w-12 shrink-0 rounded-md bg-jaune/40 object-cover" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium">Page {p.numero}</span>
                  {p.titres.length > 0 ? <span className="truncate text-sm">{p.titres.join(" · ")}</span> : null}
                  <span className="text-sm text-taupe">
                    {p.statut === "prete" && p.titres.length === 0 ? "Aucune recette trouvée" : libelleEtat(p.statut, p.nb_mots_douteux)}
                  </span>
                </div>
                <Pastille statut={p.statut} douteux={p.nb_mots_douteux} />
                {p.statut === "en_echec" && !relancees.has(p.id) ? (
                  <button
                    type="button"
                    onClick={() => relancer(p.id)}
                    className="text-sm font-medium underline decoration-peche decoration-2 underline-offset-4"
                  >
                    Relancer
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// Repère visuel de l'état (couleur de fond, jamais de texte clair sur blanc).
function Pastille({ statut, douteux }: { statut: StatutPage; douteux: number }) {
  const couleur =
    statut === "prete" ? (douteux > 0 ? "bg-peche" : "bg-ciel") : statut === "en_echec" ? "bg-ardoise" : "bg-jaune";
  return <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${couleur}`} />;
}
