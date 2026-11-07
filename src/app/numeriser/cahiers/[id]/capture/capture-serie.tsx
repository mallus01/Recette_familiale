"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { preparerPage } from "@/lib/images";
import { creerClientNavigateur } from "@/lib/supabase/client";

type Etat = "preparation" | "envoi" | "envoyee" | "echec";
type Prise = {
  numero: number;
  apercu?: string;
  etat: Etat;
  fichier: File;
  recadree?: boolean;
};

const LIBELLES: Record<Etat, string> = {
  preparation: "Recadrage…",
  envoi: "Envoi…",
  envoyee: "Envoyée",
  echec: "Échec de l’envoi",
};

export function CaptureSerie({
  cahierId,
  prochainNumero,
  derniere,
}: {
  cahierId: number;
  prochainNumero: number;
  derniere: { numero: number; url?: string } | null;
}) {
  const router = useRouter();
  const [prises, setPrises] = useState<Prise[]>([]);
  const [prochain, setProchain] = useState(prochainNumero);
  const file = useRef<Promise<void>>(Promise.resolve());
  const apercus = useRef<string[]>([]);

  const enCours = prises.filter(
    (p) => p.etat === "preparation" || p.etat === "envoi",
  ).length;
  const envoyees = new Set(
    prises.filter((p) => p.etat === "envoyee").map((p) => p.numero),
  ).size;
  const derniereVue = prises.at(-1);

  // Libère les aperçus en mémoire en quittant l'écran.
  useEffect(
    () => () => apercus.current.forEach((u) => URL.revokeObjectURL(u)),
    [],
  );

  // Prévient avant de quitter si des pages sont encore en route.
  useEffect(() => {
    if (enCours === 0) return;
    const avertir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [enCours]);

  function majPrise(numero: number, maj: Partial<Prise>) {
    setPrises((ps) =>
      ps.map((p) => (p.numero === numero ? { ...p, ...maj } : p)),
    );
  }

  async function traiter(numero: number, fichier: File) {
    majPrise(numero, { etat: "preparation" });
    try {
      const { blob, recadree } = await preparerPage(fichier);
      const apercu = URL.createObjectURL(blob);
      apercus.current.push(apercu);
      majPrise(numero, { apercu, recadree, etat: "envoi" });

      const supabase = creerClientNavigateur();
      const chemin = `cahiers/${cahierId}/pages/${numero}.jpg`;
      const envoi = await supabase.storage
        .from("images")
        .upload(chemin, blob, { contentType: "image/jpeg", upsert: true });
      if (envoi.error) throw envoi.error;
      // Une page reprise repart en attente de lecture par l'IA.
      const { error } = await supabase
        .from("page_scannee")
        .upsert(
          {
            cahier_id: cahierId,
            numero,
            image_chemin: chemin,
            statut: "en_attente",
            nb_mots_douteux: 0,
          },
          { onConflict: "cahier_id,numero" },
        );
      if (error) throw error;
      majPrise(numero, { etat: "envoyee" });
    } catch {
      majPrise(numero, { etat: "echec" });
    }
  }

  // Les pages sont traitées une à une, pendant qu'on photographie la suivante.
  function mettreEnFile(numero: number, fichier: File) {
    file.current = file.current.then(() => traiter(numero, fichier));
  }

  function photographier(fichier: File | undefined, numero: number) {
    if (!fichier) return;
    setPrises((ps) => [
      ...ps.filter((p) => p.numero !== numero),
      { numero, fichier, etat: "preparation" },
    ]);
    if (numero === prochain) setProchain(numero + 1);
    mettreEnFile(numero, fichier);
  }

  const echecs = prises.filter((p) => p.etat === "echec");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 rounded-2xl bg-jaune/40 p-4">
        {derniereVue?.apercu || (!derniereVue && derniere?.url) ? (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu local ou URL signée
          <img
            src={derniereVue?.apercu ?? derniere?.url}
            alt={`Dernière photo, page ${derniereVue?.numero ?? derniere?.numero}`}
            className="h-28 w-20 shrink-0 rounded-lg bg-white object-cover shadow-sm"
          />
        ) : (
          <div className="h-28 w-20 shrink-0 rounded-lg bg-white/70" />
        )}
        <div className="flex flex-col gap-1 text-sm">
          {derniereVue ? (
            <>
              <span className="font-semibold">Page {derniereVue.numero}</span>
              <span className="text-taupe">
                {LIBELLES[derniereVue.etat]}
                {derniereVue.etat === "envoyee" &&
                derniereVue.recadree === false
                  ? " · non recadrée"
                  : ""}
              </span>
              {derniereVue.etat === "envoyee" ||
              derniereVue.etat === "echec" ? (
                <ChoixPhoto
                  className="mt-1 self-start font-medium underline decoration-ciel decoration-2 underline-offset-4"
                  onPhoto={(f) => photographier(f, derniereVue.numero)}
                >
                  Reprendre cette photo
                </ChoixPhoto>
              ) : null}
            </>
          ) : derniere ? (
            <>
              <span className="font-semibold">Page {derniere.numero}</span>
              <span className="text-taupe">
                Dernière page déjà photographiée
              </span>
            </>
          ) : (
            <span className="text-taupe">Aucune page pour l’instant</span>
          )}
        </div>
      </div>

      <ChoixPhoto
        className="rounded-xl bg-ardoise px-5 py-4 text-center text-lg font-semibold text-white"
        onPhoto={(f) => photographier(f, prochain)}
      >
        Photographier la page {prochain}
      </ChoixPhoto>
      <p className="text-sm leading-relaxed text-taupe">
        Posez la page à plat sur un fond plus sombre, bien éclairée : elle sera
        recadrée automatiquement.
      </p>

      {echecs.length > 0 ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-peche bg-peche/15 px-4 py-3 text-sm"
        >
          <span>
            {echecs.length === 1
              ? "Une page n’a pas pu être envoyée."
              : `${echecs.length} pages n’ont pas pu être envoyées.`}{" "}
            Vérifiez votre connexion.
          </span>
          <button
            type="button"
            className="self-start font-medium underline underline-offset-4"
            onClick={() =>
              echecs.forEach((p) => {
                majPrise(p.numero, { etat: "preparation" });
                mettreEnFile(p.numero, p.fichier);
              })
            }
          >
            Réessayer
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {envoyees > 0 ? (
          <p className="text-sm">
            {envoyees === 1 ? "1 page envoyée" : `${envoyees} pages envoyées`}{" "}
            pendant cette séance.
          </p>
        ) : null}
        <button
          type="button"
          disabled={enCours > 0}
          onClick={() => {
            router.push(`/numeriser/cahiers/${cahierId}`);
            router.refresh();
          }}
          className="rounded-xl border border-ardoise px-5 py-3.5 font-semibold text-ardoise disabled:opacity-60"
        >
          {enCours > 0 ? `Envoi en cours (${enCours})…` : "Terminer"}
        </button>
      </div>
    </div>
  );
}

function ChoixPhoto({
  className,
  onPhoto,
  children,
}: {
  className: string;
  onPhoto: (fichier: File | undefined) => void;
  children: React.ReactNode;
}) {
  return (
    <label className={`cursor-pointer ${className}`}>
      {children}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          onPhoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}
