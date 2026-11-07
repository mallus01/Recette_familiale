"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ResultatLecture } from "@/lib/lecture/resultat";
import { creerClientNavigateur } from "@/lib/supabase/client";

export type Essai = {
  id: number;
  fournisseur: string;
  modele: string | null;
  statut: "en_cours" | "terminee" | "en_echec";
  resultat: ResultatLecture | null;
  erreur: string | null;
  duree_ms: number | null;
  jetons_entree: number | null;
  jetons_sortie: number | null;
  cout_dollars: number | null;
  nb_erreurs: number | null;
};
export type PageComparee = { id: number; numero: number; cahier: string; url?: string; essais: Essai[] };

const NOMS: Record<string, string> = { claude: "Claude", gemini: "Gemini", simulee: "IA simulée" };
const OBJECTIF = 10; // pages réelles à comparer (US-11)

const dollars = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} $`;
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
const secondes = (ms: number) => `${(ms / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`;

export function ComparaisonModeles({ pages }: { pages: PageComparee[] }) {
  const router = useRouter();
  const [lancees, setLancees] = useState<Set<number>>(new Set());
  const enCours = pages.some((p) => p.essais.some((e) => e.statut === "en_cours"));

  useEffect(() => {
    if (!enCours) return;
    const minuteur = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(minuteur);
  }, [enCours, router]);

  async function comparer(pageId: number) {
    setLancees((s) => new Set([...s, pageId]));
    await fetch("/api/comparaison", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageId }),
    }).catch(() => undefined);
    router.refresh();
  }

  if (pages.length === 0) {
    return <p className="rounded-2xl bg-ciel/15 p-5 leading-relaxed">Photographiez d’abord quelques pages d’un cahier.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="leading-relaxed">
        Lancez la comparaison sur {OBJECTIF} pages variées, puis relevez pour chaque modèle le nombre d’erreurs par rapport
        au scan : mot mal lu, quantité fausse, ingrédient ou étape manquant ou inventé.
      </p>
      <Bilan pages={pages} />
      <ul className="flex flex-col gap-4">
        {pages.map((p) => (
          <li key={p.id} className="flex flex-col gap-3 rounded-2xl border border-ardoise/15 p-4">
            <div className="flex items-center gap-3">
              <a href={p.url} target="_blank" rel="noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL signée d'un bucket privé */}
                <img src={p.url} alt={`Page ${p.numero}`} className="h-20 w-15 rounded-md bg-jaune/40 object-cover" />
              </a>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">Page {p.numero}</span>
                <span className="truncate text-sm text-taupe">{p.cahier}</span>
              </div>
              {lancees.has(p.id) && p.essais.length === 0 ? (
                <span className="text-sm text-taupe">Lancement…</span>
              ) : p.essais.some((e) => e.statut === "en_cours") ? (
                <span className="text-sm text-taupe">Lecture en cours…</span>
              ) : (
                <button
                  type="button"
                  onClick={() => comparer(p.id)}
                  className={
                    p.essais.length > 0
                      ? "text-sm font-medium underline decoration-ciel decoration-2 underline-offset-4"
                      : "rounded-xl bg-ardoise px-4 py-2 text-sm font-semibold text-white"
                  }
                >
                  {p.essais.length > 0 ? "Relancer" : "Comparer"}
                </button>
              )}
            </div>
            {p.essais.map((e) => (
              <EssaiModele key={e.id} essai={e} onNote={() => router.refresh()} />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bilan({ pages }: { pages: PageComparee[] }) {
  const essais = pages.flatMap((p) => p.essais);
  const fournisseurs = [...new Set(essais.map((e) => e.fournisseur))].sort();
  if (fournisseurs.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-jaune/40 p-4">
      <h2 className="font-semibold">Bilan</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-taupe">
            <th className="py-1 font-medium">Modèle</th>
            <th className="py-1 font-medium">Pages notées</th>
            <th className="py-1 font-medium">Erreurs / page</th>
            <th className="py-1 font-medium">Coût / page</th>
            <th className="py-1 font-medium">Durée</th>
          </tr>
        </thead>
        <tbody>
          {fournisseurs.map((f) => {
            const faits = essais.filter((e) => e.fournisseur === f && e.statut === "terminee");
            const notes = faits.filter((e) => e.nb_erreurs !== null);
            const couts = faits.filter((e) => e.cout_dollars !== null);
            const echecs = essais.filter((e) => e.fournisseur === f && e.statut === "en_echec").length;
            const moyenne = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
            return (
              <tr key={f} className="border-t border-ardoise/10 align-top">
                <td className="py-1.5 font-medium">
                  {NOMS[f] ?? f}
                  {echecs > 0 ? <span className="block text-xs font-normal text-taupe">{echecs} en échec</span> : null}
                </td>
                <td className="py-1.5">
                  {notes.length} / {faits.length}
                </td>
                <td className="py-1.5">
                  {notes.length > 0
                    ? moyenne(notes.map((e) => e.nb_erreurs!)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })
                    : "–"}
                </td>
                <td className="py-1.5">{couts.length > 0 ? dollars(moyenne(couts.map((e) => Number(e.cout_dollars)))) : "inconnu"}</td>
                <td className="py-1.5">{faits.length > 0 ? secondes(moyenne(faits.map((e) => e.duree_ms ?? 0))) : "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function EssaiModele({ essai, onNote }: { essai: Essai; onNote: () => void }) {
  const [valeur, setValeur] = useState(essai.nb_erreurs?.toString() ?? "");
  const [enregistre, setEnregistre] = useState(false);

  async function noter(texte: string) {
    setValeur(texte);
    setEnregistre(false);
    const nombre = texte === "" ? null : Number(texte);
    if (nombre !== null && (!Number.isInteger(nombre) || nombre < 0)) return;
    const { error } = await creerClientNavigateur()
      .from("comparaison_lecture")
      .update({ nb_erreurs: nombre })
      .eq("id", essai.id);
    if (!error) {
      setEnregistre(true);
      onNote();
    }
  }

  return (
    <details className="rounded-xl bg-ardoise/5 p-3">
      <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-semibold">{NOMS[essai.fournisseur] ?? essai.fournisseur}</span>
        <span className="text-taupe">
          {essai.statut === "en_cours"
            ? "lecture en cours"
            : essai.statut === "en_echec"
              ? "en échec"
              : [
                  essai.duree_ms !== null ? secondes(essai.duree_ms) : null,
                  essai.cout_dollars !== null ? dollars(Number(essai.cout_dollars)) : null,
                  pluriel(essai.resultat?.mots_douteux.length ?? 0, "mot douteux", "mots douteux"),
                  essai.nb_erreurs !== null ? pluriel(essai.nb_erreurs, "erreur relevée", "erreurs relevées") : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
        </span>
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-sm">
        {essai.statut === "en_echec" ? <p>{essai.erreur}</p> : null}
        {essai.resultat ? <Resultat resultat={essai.resultat} /> : null}
        {essai.statut === "terminee" ? (
          <label className="flex items-center gap-3">
            <span className="font-medium">Erreurs relevées</span>
            <input
              inputMode="numeric"
              value={valeur}
              onChange={(e) => noter(e.target.value.replace(/\D/g, ""))}
              className="w-16 rounded-lg border border-ardoise/30 px-2 py-1 text-center text-base outline-none focus:border-ardoise"
            />
            {enregistre ? <span className="text-taupe">Enregistré</span> : null}
          </label>
        ) : null}
        {essai.modele ? (
          <p className="text-xs text-taupe">
            {essai.modele} · {essai.jetons_entree ?? 0} jetons en entrée, {essai.jetons_sortie ?? 0} en sortie
          </p>
        ) : null}
      </div>
    </details>
  );
}

function Resultat({ resultat }: { resultat: ResultatLecture }) {
  return (
    <div className="flex flex-col gap-3">
      {resultat.recettes.length === 0 ? <p className="text-taupe">Aucune recette trouvée.</p> : null}
      {resultat.recettes.map((r, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <p className="font-semibold">
            {r.titre}
            {r.portions ? <span className="font-normal text-taupe"> · {r.portions} personnes</span> : null}
          </p>
          {r.groupes.map((g, j) => (
            <div key={j}>
              {g.nom ? <p className="font-medium">{g.nom}</p> : null}
              <ul className="list-disc pl-5">
                {g.ingredients.map((ing, k) => (
                  <li key={k}>
                    {ing.texte_origine}
                    <span className="text-taupe">
                      {" "}
                      → {[ing.quantite, ing.unite, ing.nom].filter((x) => x !== null && x !== "").join(" ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <ol className="list-decimal pl-5">
            {r.etapes.map((e, j) => (
              <li key={j}>{e}</li>
            ))}
          </ol>
          {r.notes.map((n, j) => (
            <p key={j} className="italic text-taupe">
              {n}
            </p>
          ))}
        </div>
      ))}
      {resultat.mots_douteux.length > 0 ? (
        <p>
          <span className="font-medium">Mots douteux : </span>
          {resultat.mots_douteux.map((m) => m.mot).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
