import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Page } from "@/components/mise-en-page";
import { LIBELLES_ROLE, type Role } from "@/lib/membre";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { FormulaireBienvenue } from "./formulaire";

export const metadata: Metadata = { title: "Bienvenue · Recettes familiales" };

// US-33 : page d'arrivée de l'invité, ouverte par le lien de l'e-mail d'invitation.
export default function Bienvenue() {
  return (
    <Page>
      <h1 className="text-2xl font-semibold tracking-tight">Bienvenue</h1>
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </Page>
  );
}

async function Contenu() {
  const supabase = await creerClientServeur();
  const { data } = await supabase.rpc("mon_invitation");
  const invitation = (
    data as { email: string; role: Role; invite_par: string | null }[] | null
  )?.[0];
  if (!invitation) redirect("/connexion");
  return (
    <>
      <p className="-mt-2 leading-relaxed">
        {invitation.invite_par ?? "L’administrateur"} vous invite à rejoindre
        Recettes familiales en tant que{" "}
        <strong className="font-semibold">
          {LIBELLES_ROLE[invitation.role].toLowerCase()}
        </strong>
        .
      </p>
      <FormulaireBienvenue email={invitation.email} />
    </>
  );
}
