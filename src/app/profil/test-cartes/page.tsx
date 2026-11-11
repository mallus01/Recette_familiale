import type { Metadata } from "next";
import { Suspense } from "react";
import { EnTete, Page } from "@/components/mise-en-page";
import { membreConnecte } from "@/lib/membre";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { TEST_CARTES, type VarianteCartes } from "@/lib/test-ab";
import { Pilotage, type Resultat } from "./pilotage";

export const metadata: Metadata = {
  title: "Test des cartes À cuisiner · Recettes familiales",
};

// US-50 : résultats du test A/B des grandes cartes À cuisiner, et sa conclusion.
export default function PageTestCartes() {
  return (
    <Page large>
      <EnTete
        titre="Test des cartes À cuisiner"
        retour={{ href: "/profil", libelle: "Profil" }}
      />
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
        Le test des cartes est réservé à l’administrateur.
      </p>
    );
  }
  const supabase = await creerClientServeur();
  const [{ data: test }, { data: resultats }, { data: maVariante }] =
    await Promise.all([
      supabase
        .from("test_ab")
        .select("statut, gagnante, commence_le, termine_le")
        .eq("code", TEST_CARTES)
        .maybeSingle(),
      supabase.rpc("resultats_ab", { p_test: TEST_CARTES }),
      supabase.rpc("variante_ab", { p_test: TEST_CARTES }),
    ]);
  if (!test) {
    return (
      <p className="rounded-2xl bg-ciel/15 p-5 leading-relaxed">
        Le test n’est pas encore installé : colle la migration du test A/B dans
        SQL Editor.
      </p>
    );
  }
  return (
    <Pilotage
      statut={test.statut as "en_cours" | "termine"}
      gagnante={test.gagnante as VarianteCartes | null}
      commenceLe={test.commence_le as string}
      termineLe={test.termine_le as string | null}
      maVariante={maVariante as VarianteCartes | null}
      resultats={((resultats ?? []) as Resultat[]).map((r) => ({
        variante: r.variante,
        membres: Number(r.membres),
        jours_vus: Number(r.jours_vus),
        ouvertures: Number(r.ouvertures),
        cuisinees: Number(r.cuisinees),
      }))}
    />
  );
}
