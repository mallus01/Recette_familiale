"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { libelleEtat, type StatutPage } from "@/lib/lecture/etat";
import { lancerLecture } from "@/lib/lecture/lancer";

export type PageAffichee = {
  id: number;
  numero: number;
  url?: string;
  statut: StatutPage;
  nb_mots_douteux: number;
};

export function PagesDuCahier({ pages }: { pages: PageAffichee[] }) {
  const router = useRouter();
  const [relancees, setRelancees] = useState<Set<number>>(new Set());
  const enCours = pages.some((p) => p.statut === "en_attente" || p.statut === "lecture_en_cours");
  const enAttente = pages.filter((p) => p.statut === "en_attente" && !relancees.has(p.id));

  // Tant que des pages sont en lecture, on rafraîchit leur état.
  useEffect(() => {
    if (!enCours) return;
    const minuteur = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(minuteur);
  }, [enCours, router]);

  async function relancer(ids: number[]) {
    setRelancees((s) => new Set([...s, ...ids]));
    await Promise.all(ids.map((id) => lancerLecture(id)));
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">{pages.length === 1 ? "1 page" : `${pages.length} pages`}</h2>
      {enAttente.length > 0 ? (
        <button
          type="button"
          onClick={() => relancer(enAttente.map((p) => p.id))}
          className="self-start text-sm font-medium underline decoration-ciel decoration-2 underline-offset-4"
        >
          Lancer la lecture des pages en attente
        </button>
      ) : null}
      <ul className="grid grid-cols-3 gap-3">
        {pages.map((p) => (
          <li key={p.id} className="flex flex-col gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL signée d'un bucket privé */}
            <img src={p.url} alt={`Page ${p.numero}`} className="aspect-[3/4] w-full rounded-lg bg-jaune/40 object-cover" />
            <span className="text-center text-xs font-medium">Page {p.numero}</span>
            <span className={`text-center text-xs ${p.statut === "en_echec" ? "text-ardoise" : "text-taupe"}`}>
              {libelleEtat(p.statut, p.nb_mots_douteux)}
            </span>
            {p.statut === "en_echec" && !relancees.has(p.id) ? (
              <button
                type="button"
                onClick={() => relancer([p.id])}
                className="text-xs font-medium underline decoration-peche decoration-2 underline-offset-4"
              >
                Relancer
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
