import type { Metadata } from "next";
import { Suspense } from "react";
import { EnTete, Page } from "@/components/mise-en-page";
import { nomAffiche } from "@/lib/invitations";
import { membreConnecte, type Role } from "@/lib/membre";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { Administration } from "./administration";

export const metadata: Metadata = {
  title: "Administration · Recettes familiales",
};

// US-33 : inviter des membres, suivre les invitations, gérer les rôles.
export default function PageAdministration() {
  return (
    <Page large>
      <EnTete titre="Membres" retour={{ href: "/profil", libelle: "Profil" }} />
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </Page>
  );
}

async function Contenu() {
  const moi = await membreConnecte();
  if (moi?.role !== "admin") {
    return (
      <p className="rounded-2xl bg-ciel/15 p-5 leading-relaxed">
        L’administration est réservée à l’administrateur.
      </p>
    );
  }
  const supabase = await creerClientServeur();
  const [{ data: invitations }, { data: membres }] = await Promise.all([
    supabase
      .from("invitation")
      .select("id, email, role, envoyee_le")
      .is("acceptee_le", null)
      .order("envoyee_le", { ascending: false }),
    supabase
      .from("membre")
      .select("id, email, prenom, nom, role")
      .order("cree_le"),
  ]);
  const enAttente = new Set(
    (invitations ?? []).map((i) => i.email.toLowerCase()),
  );

  return (
    <Administration
      moiId={moi.id}
      invitations={
        (invitations ?? []) as {
          id: number;
          email: string;
          role: Role;
          envoyee_le: string;
        }[]
      }
      membres={(membres ?? [])
        .filter((m) => !enAttente.has(m.email.toLowerCase()))
        .map((m) => ({
          id: m.id as string,
          nom: nomAffiche(m),
          email: m.email as string,
          role: m.role as Role,
        }))}
    />
  );
}
