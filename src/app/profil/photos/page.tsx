import type { Metadata } from "next";
import { Suspense } from "react";
import { EnTete, Page } from "@/components/mise-en-page";
import { nomAffiche } from "@/lib/invitations";
import { membreConnecte } from "@/lib/membre";
import { urlsSignees } from "@/lib/supabase/images";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { FilePhotos } from "./file-photos";

export const metadata: Metadata = {
  title: "Photos à valider · Recettes familiales",
};

// US-39 : file des photos proposées par les membres.
export default function PagePhotos() {
  return (
    <Page>
      <EnTete
        titre="Photos à valider"
        retour={{ href: "/profil", libelle: "Profil" }}
      />
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </Page>
  );
}

type Ligne = {
  id: number;
  image_chemin: string;
  proposee_le: string;
  recette: { id: number; titre: string } | null;
  membre: { prenom: string | null; nom: string | null; email: string } | null;
};

async function Contenu() {
  const moi = await membreConnecte();
  if (moi?.role !== "admin") {
    return (
      <p className="rounded-2xl bg-ciel/15 p-5 leading-relaxed">
        La validation des photos est réservée à l’administrateur.
      </p>
    );
  }
  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("photo")
    .select(
      "id, image_chemin, proposee_le, recette(id, titre), membre(prenom, nom, email)",
    )
    .eq("statut", "en_attente")
    .order("proposee_le")
    .returns<Ligne[]>();
  const photos = data ?? [];
  const urls = await urlsSignees(photos.map((p) => p.image_chemin));

  return (
    <FilePhotos
      photos={photos.map((p) => ({
        id: p.id,
        chemin: p.image_chemin,
        url: urls.get(p.image_chemin),
        recetteId: p.recette?.id ?? null,
        titre: p.recette?.titre ?? "Recette supprimée",
        auteur: p.membre ? nomAffiche(p.membre) : "Ancien membre",
      }))}
    />
  );
}
