"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { envoyerImage, supprimerImage } from "@/lib/photos";
import { creerClientNavigateur } from "@/lib/supabase/client";

export type PhotoFiche = { id: number; chemin: string; url?: string };

// US-38 et US-40 : photos validées du plat (avant le scan, qu'on fait défiler) et
// proposition d'une nouvelle photo, visible après validation par l'administrateur.
export function Photos({
  recetteId,
  photos,
  enAttente,
  admin,
}: {
  recetteId: number;
  photos: PhotoFiche[];
  enAttente: number;
  admin: boolean;
}) {
  const router = useRouter();
  const [courante, setCourante] = useState(0);
  const [etat, setEtat] = useState<
    "envoi" | "envoyee" | "ajoutee" | "erreur" | null
  >(null);
  const [aSupprimer, setASupprimer] = useState<number | null>(null);
  const defilement = useRef<HTMLUListElement | null>(null);

  async function proposer(fichier: File | undefined) {
    if (!fichier) return;
    setEtat("envoi");
    let chemin: string | null = null;
    try {
      chemin = await envoyerImage(fichier, `photos/${recetteId}`);
      // L'administrateur ajoute directement une photo validée.
      const { error } = await creerClientNavigateur()
        .from("photo")
        .insert({
          recette_id: recetteId,
          image_chemin: chemin,
          ...(admin
            ? { statut: "validee", validee_le: new Date().toISOString() }
            : {}),
        });
      if (error) throw new Error(error.message);
      setEtat(admin ? "ajoutee" : "envoyee");
      router.refresh();
    } catch {
      if (chemin && admin) await supprimerImage(chemin);
      setEtat("erreur");
    }
  }

  async function supprimer(p: PhotoFiche) {
    const { error } = await creerClientNavigateur()
      .from("photo")
      .delete()
      .eq("id", p.id);
    if (error) return setEtat("erreur");
    await supprimerImage(p.chemin);
    setASupprimer(null);
    setCourante(0);
    defilement.current?.scrollTo({ left: 0 });
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Photos du plat">
      {photos.length > 0 ? (
        <div className="flex flex-col gap-2">
          <ul
            ref={defilement}
            onScroll={(e) => {
              const el = e.currentTarget;
              setCourante(Math.round(el.scrollLeft / el.clientWidth));
            }}
            className="-mx-6 flex snap-x snap-mandatory overflow-x-auto"
          >
            {photos.map((p, k) => (
              <li key={p.id} className="w-full shrink-0 snap-center px-6">
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL signée d'un bucket privé
                  <img
                    src={p.url}
                    alt={`Photo du plat ${k + 1} sur ${photos.length}`}
                    className="aspect-[4/3] w-full rounded-2xl bg-jaune/40 object-cover"
                  />
                ) : (
                  <div className="aspect-[4/3] w-full rounded-2xl bg-jaune/40" />
                )}
              </li>
            ))}
          </ul>
          {photos.length > 1 ? (
            <p className="text-center text-sm text-taupe" aria-live="polite">
              Photo {Math.min(courante, photos.length - 1) + 1} sur{" "}
              {photos.length}
            </p>
          ) : null}
          {admin ? (
            aSupprimer === photos[courante]?.id ? (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-xl border border-peche bg-peche/15 p-3 text-sm"
              >
                <p>Supprimer cette photo de la recette ?</p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => supprimer(photos[courante])}
                    className="font-semibold underline underline-offset-4"
                  >
                    Supprimer
                  </button>
                  <button type="button" onClick={() => setASupprimer(null)}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setASupprimer(photos[courante]?.id ?? null)}
                className="self-start text-sm font-medium underline decoration-peche decoration-2 underline-offset-4"
              >
                Supprimer cette photo
              </button>
            )
          ) : null}
        </div>
      ) : null}

      <label
        className={`self-start rounded-full border border-ardoise/25 px-4 py-2.5 text-sm font-medium ${
          etat === "envoi" ? "opacity-60" : "cursor-pointer"
        }`}
      >
        {etat === "envoi"
          ? "Envoi de la photo…"
          : admin
            ? "Ajouter une photo du plat"
            : "Proposer une photo du plat"}
        <input
          type="file"
          accept="image/*"
          disabled={etat === "envoi"}
          onChange={(e) => {
            void proposer(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="sr-only"
        />
      </label>
      <p role="status" className="text-sm text-taupe empty:hidden">
        {etat === "envoyee"
          ? "Merci, ta photo sera visible après validation par l’administrateur."
          : etat === "ajoutee"
            ? "Photo ajoutée."
            : etat === "erreur"
              ? "La photo n’a pas pu être envoyée. Réessaie."
              : enAttente > 0
                ? enAttente === 1
                  ? "Ta photo attend la validation de l’administrateur."
                  : `Tes ${enAttente} photos attendent la validation de l’administrateur.`
                : ""}
      </p>
    </section>
  );
}
