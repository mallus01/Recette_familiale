"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supprimerImage } from "@/lib/photos";
import { creerClientNavigateur } from "@/lib/supabase/client";

type Photo = {
  id: number;
  chemin: string;
  url?: string;
  recetteId: number | null;
  titre: string;
  auteur: string;
};

// US-39 : Valider rend la photo visible sur la fiche ; Refuser la supprime.
export function FilePhotos({ photos }: { photos: Photo[] }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<number | null>(null);
  const [traitees, setTraitees] = useState<number[]>([]);
  const restantes = photos.filter((p) => !traitees.includes(p.id));
  const [message, setMessage] = useState<{
    texte: string;
    erreur: boolean;
  } | null>(null);

  async function decider(p: Photo, valider: boolean) {
    setEnCours(p.id);
    setMessage(null);
    const supabase = creerClientNavigateur();
    const { error } = valider
      ? await supabase
          .from("photo")
          .update({ statut: "validee", validee_le: new Date().toISOString() })
          .eq("id", p.id)
      : await supabase.from("photo").delete().eq("id", p.id);
    if (!error && !valider) await supprimerImage(p.chemin);
    setEnCours(null);
    setMessage(
      error
        ? { texte: "L’opération a échoué. Réessaie.", erreur: true }
        : {
            texte: valider
              ? `Photo de « ${p.titre} » validée.`
              : `Photo de « ${p.titre} » refusée et supprimée.`,
            erreur: false,
          },
    );
    if (!error) {
      setTraitees((t) => [...t, p.id]);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {message ? (
        <p
          role={message.erreur ? "alert" : "status"}
          className="rounded-xl bg-ciel/15 px-4 py-3 text-sm"
        >
          {message.texte}
        </p>
      ) : null}
      {restantes.length === 0 ? (
        <p className="text-taupe">Aucune photo à valider.</p>
      ) : null}
      <ul className="flex flex-col gap-6">
        {restantes.map((p) => (
          <li key={p.id} className="flex flex-col gap-3">
            {p.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL signée d'un bucket privé
              <img
                src={p.url}
                alt={`Photo proposée pour ${p.titre}`}
                className="aspect-[4/3] w-full rounded-2xl bg-jaune/40 object-cover"
              />
            ) : (
              <div className="aspect-[4/3] w-full rounded-2xl bg-jaune/40" />
            )}
            <div className="flex flex-col gap-0.5">
              {p.recetteId ? (
                <Link
                  href={`/recettes/${p.recetteId}`}
                  className="font-medium underline decoration-ciel decoration-2 underline-offset-4"
                >
                  {p.titre}
                </Link>
              ) : (
                <span className="font-medium">{p.titre}</span>
              )}
              <span className="text-sm text-taupe">
                Proposée par {p.auteur}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={enCours === p.id}
                onClick={() => decider(p, false)}
                className="flex-1 rounded-xl border border-ardoise/25 py-3 font-medium disabled:opacity-50"
              >
                Refuser
              </button>
              <button
                type="button"
                disabled={enCours === p.id}
                onClick={() => decider(p, true)}
                className="flex-[2] rounded-xl bg-ardoise py-3 font-semibold text-white disabled:opacity-60"
              >
                Valider
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
