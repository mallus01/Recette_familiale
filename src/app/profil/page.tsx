import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Page } from "@/components/mise-en-page";
import { LIBELLES_ROLE, membreConnecte } from "@/lib/membre";
import { creerClientServeur } from "@/lib/supabase/serveur";
import type { Taille } from "@/lib/affichage";
import { AideInstallation } from "../aide-installation";
import { BoutonDeconnexion } from "../deconnexion";
import { ReglagesAffichage } from "./reglages-affichage";

export const metadata: Metadata = { title: "Profil · Recettes familiales" };

// US-32 : onglet Profil (compte, installation, accès à l'administration).
export default function Profil() {
  return (
    <Page>
      <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu />
      </Suspense>
      <AideInstallation />
    </Page>
  );
}

async function Contenu() {
  const membre = await membreConnecte();
  if (!membre) redirect("/connexion");
  // US-39 : nombre de photos proposées en attente, pour l'administrateur.
  const { count: aValider } =
    membre.role === "admin"
      ? await (await creerClientServeur())
          .from("photo")
          .select("id", { count: "exact", head: true })
          .eq("statut", "en_attente")
      : { count: 0 };
  // US-56 et US-57 : réglages d'affichage (colonnes ajoutées par la migration affichage).
  const { data: affichage } = await (await creerClientServeur())
    .from("membre")
    .select("taille_texte, contraste_renforce")
    .eq("id", membre.id)
    .maybeSingle<{ taille_texte: Taille; contraste_renforce: boolean }>();
  return (
    <>
      <section className="flex flex-col gap-1">
        {membre.prenom ? (
          <p className="text-lg font-medium">{membre.prenom}</p>
        ) : null}
        <p className="text-taupe">{membre.email}</p>
        <p className="text-sm text-taupe">{LIBELLES_ROLE[membre.role]}</p>
      </section>
      <ReglagesAffichage
        initial={{
          taille: affichage?.taille_texte ?? "normale",
          contraste: affichage?.contraste_renforce ?? false,
        }}
      />
      {membre.role === "admin" ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Administration</h2>
          <Link
            href="/profil/admin"
            className="self-start underline decoration-ciel decoration-2 underline-offset-4"
          >
            Inviter et gérer les membres
          </Link>
          <Link
            href="/profil/photos"
            className="self-start underline decoration-ciel decoration-2 underline-offset-4"
          >
            Valider les photos proposées
            {aValider ? (
              <span className="ml-2 rounded-full bg-peche px-2 py-0.5 text-sm font-semibold no-underline">
                {aValider}
              </span>
            ) : null}
          </Link>
          <Link
            href="/profil/test-cartes"
            className="self-start underline decoration-ciel decoration-2 underline-offset-4"
          >
            Test des cartes À cuisiner
          </Link>
          <Link
            href="/numeriser/listes"
            className="self-start underline decoration-ciel decoration-2 underline-offset-4"
          >
            Gérer les listes de tags
          </Link>
        </section>
      ) : null}
      <BoutonDeconnexion />
    </>
  );
}
