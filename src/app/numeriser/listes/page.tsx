import type { Metadata } from "next";
import { Suspense } from "react";
import { EnTete, Page } from "@/components/mise-en-page";
import { membreConnecte } from "@/lib/membre";
import { urlsSignees } from "@/lib/supabase/images";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { ListeFermee } from "./liste-fermee";

export const metadata: Metadata = {
  title: "Listes de tags · Recettes familiales",
};

// US-15 : l'administrateur gère les valeurs des listes fermées.
export default function PageListes() {
  return (
    <Page>
      <EnTete
        titre="Listes de tags"
        retour={{ href: "/numeriser", libelle: "Numériser" }}
      />
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </Page>
  );
}

type Ligne = {
  id: number;
  nom: string;
  image_chemin: string | null;
  nb: { count: number }[];
};

async function Contenu() {
  const membre = await membreConnecte();
  if (membre?.role !== "admin") {
    return (
      <p className="rounded-2xl bg-ciel/15 p-5 leading-relaxed">
        La gestion des listes de tags est réservée à l’administrateur.
      </p>
    );
  }

  const supabase = await creerClientServeur();
  const [{ data: types }, { data: occasions }] = await Promise.all([
    supabase
      .from("type_repas")
      .select("id, nom, image_chemin, nb:recette(count)")
      .order("nom")
      .returns<Ligne[]>(),
    supabase
      .from("occasion")
      .select("id, nom, image_chemin, nb:recette_occasion(count)")
      .order("nom")
      .returns<Ligne[]>(),
  ]);
  const urls = await urlsSignees(
    [...(types ?? []), ...(occasions ?? [])].flatMap((v) =>
      v.image_chemin ? [v.image_chemin] : [],
    ),
  );
  const valeurs = (l: Ligne[] | null) =>
    (l ?? []).map((v) => ({
      id: v.id,
      nom: v.nom,
      nbRecettes: v.nb[0]?.count ?? 0,
      imageChemin: v.image_chemin,
      image: v.image_chemin ? urls.get(v.image_chemin) : undefined,
    }));

  return (
    <div className="flex flex-col gap-8">
      <ListeFermee
        table="type_repas"
        titre="Types de repas"
        valeurs={valeurs(types)}
      />
      <ListeFermee
        table="occasion"
        titre="Occasions"
        valeurs={valeurs(occasions)}
      />
    </div>
  );
}
