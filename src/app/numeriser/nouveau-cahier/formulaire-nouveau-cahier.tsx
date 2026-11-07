"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { compresserPhoto } from "@/lib/images";
import { creerClientNavigateur } from "@/lib/supabase/client";

type Etape = "nom" | "couverture";

export function FormulaireNouveauCahier({ membreId }: { membreId: string }) {
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>("nom");
  const [nom, setNom] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => () => (apercu ? URL.revokeObjectURL(apercu) : undefined), [apercu]);

  async function choisirPhoto(fichier: File | undefined) {
    if (!fichier) return;
    setErreur(null);
    setOccupe("Préparation de la photo…");
    try {
      const compressee = await compresserPhoto(fichier);
      setPhoto(compressee);
      setApercu(URL.createObjectURL(compressee));
    } catch {
      setErreur("Cette photo n’a pas pu être préparée. Essayez d’en prendre une autre.");
    } finally {
      setOccupe(null);
    }
  }

  async function creerCahier() {
    if (!photo) return;
    setErreur(null);
    setOccupe("Création du cahier…");
    const supabase = creerClientNavigateur();

    const { data: cahier, error } = await supabase
      .from("cahier")
      .insert({ nom: nom.trim(), cree_par: membreId })
      .select("id")
      .single();
    if (error || !cahier) {
      setOccupe(null);
      setErreur("Le cahier n’a pas pu être créé. Vérifiez votre connexion et réessayez.");
      return;
    }

    // La couverture sert d'image dans les menus ; elle n'est jamais envoyée à l'IA.
    const chemin = `cahiers/${cahier.id}/couverture.jpg`;
    const envoi = await supabase.storage.from("images").upload(chemin, photo, { contentType: "image/jpeg", upsert: true });
    const maj = envoi.error
      ? envoi
      : await supabase.from("cahier").update({ couverture_chemin: chemin }).eq("id", cahier.id);
    if (maj.error) {
      await supabase.from("cahier").delete().eq("id", cahier.id);
      setOccupe(null);
      setErreur("La couverture n’a pas pu être envoyée. Vérifiez votre connexion et réessayez.");
      return;
    }

    // On enchaîne directement sur la photo des pages.
    router.replace(`/numeriser/cahiers/${cahier.id}/capture`);
    router.refresh();
  }

  if (etape === "nom") {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (nom.trim()) setEtape("couverture");
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="font-medium">Nom du cahier</span>
          <input
            required
            autoFocus
            maxLength={120}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Par exemple : le cahier de mamie Jeanne"
            className="rounded-xl border border-ardoise/30 px-4 py-3 text-base outline-none placeholder:text-ardoise/40 focus:border-ardoise"
          />
        </label>
        <button type="submit" className="rounded-xl bg-ardoise px-5 py-3.5 font-semibold text-white disabled:opacity-60" disabled={!nom.trim()}>
          Continuer
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="leading-relaxed">
        Photographiez la couverture de <strong className="font-semibold">{nom.trim()}</strong>. Elle servira
        d’image pour retrouver le cahier.
      </p>

      {apercu ? (
        // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob)
        <img src={apercu} alt="Aperçu de la couverture" className="aspect-[3/4] w-full rounded-2xl bg-jaune/40 object-cover" />
      ) : (
        <div className="flex aspect-[3/4] w-full items-center justify-center rounded-2xl bg-jaune/40 p-6 text-center text-taupe">
          Aucune photo pour l’instant
        </div>
      )}

      <label
        className={
          photo
            ? "self-start text-sm font-medium underline decoration-ciel decoration-2 underline-offset-4"
            : "rounded-xl bg-ardoise px-5 py-3.5 text-center font-semibold text-white"
        }
      >
        {photo ? "Reprendre la photo" : "Photographier la couverture"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            choisirPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

      {erreur ? (
        <p role="alert" className="rounded-xl border border-peche bg-peche/15 px-4 py-3 text-sm">
          {erreur}
        </p>
      ) : null}
      {occupe ? <p className="text-sm text-taupe">{occupe}</p> : null}

      {photo ? (
        <button
          type="button"
          onClick={creerCahier}
          disabled={occupe !== null}
          className="rounded-xl bg-ardoise px-5 py-3.5 font-semibold text-white disabled:opacity-60"
        >
          Créer le cahier
        </button>
      ) : null}
      <button type="button" onClick={() => setEtape("nom")} className="self-start text-sm text-taupe underline underline-offset-4">
        Changer le nom
      </button>
    </div>
  );
}
