import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Page } from "@/components/mise-en-page";
import { LIBELLES_ROLE, membreConnecte } from "@/lib/membre";
import { AideInstallation } from "../aide-installation";
import { BoutonDeconnexion } from "../deconnexion";

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
  return (
    <>
      <section className="flex flex-col gap-1">
        {membre.prenom ? (
          <p className="text-lg font-medium">{membre.prenom}</p>
        ) : null}
        <p className="text-taupe">{membre.email}</p>
        <p className="text-sm text-taupe">{LIBELLES_ROLE[membre.role]}</p>
      </section>
      {membre.role === "admin" ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Administration</h2>
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
