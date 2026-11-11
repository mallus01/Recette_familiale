import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Ligne } from "@/components/cartes";
import { Couverture } from "@/components/couverture";
import { EnTete, Page } from "@/components/mise-en-page";
import { membreConnecte } from "@/lib/membre";
import { COLONNES_RESUME, enCartes, type RecetteResume } from "@/lib/recettes";
import { urlsSignees } from "@/lib/supabase/images";
import { creerClientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Cahier · Recettes familiales" };

// US-31 : feuilleter un cahier, ses recettes publiées dans l'ordre de ses pages.
export default function FeuilleterCahier({
  params,
}: PageProps<"/cahiers/[id]">) {
  return (
    <Page>
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu params={params} />
      </Suspense>
    </Page>
  );
}

async function Contenu({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const membre = await membreConnecte();
  if (!membre) redirect("/connexion");

  const supabase = await creerClientServeur();
  const [{ data: cahier }, { data: brut }] = await Promise.all([
    supabase
      .from("cahier")
      .select("id, nom, description, couverture_chemin")
      .eq("id", Number(id))
      .maybeSingle(),
    supabase
      .from("recette_resume")
      .select(COLONNES_RESUME)
      .eq("cahier_id", Number(id))
      .eq("statut", "publiee")
      .order("page_numero")
      .order("id"),
  ]);
  if (!cahier) notFound();
  const recettes = (brut ?? []) as RecetteResume[];
  const urls = await urlsSignees([
    ...(cahier.couverture_chemin ? [cahier.couverture_chemin] : []),
    ...recettes.flatMap((r) => (r.vignette_chemin ? [r.vignette_chemin] : [])),
  ]);

  return (
    <>
      <EnTete titre={cahier.nom} retour={{ href: "/", libelle: "Accueil" }} />
      <div className="flex items-start gap-4">
        <div className="w-24 shrink-0">
          <Couverture
            url={
              cahier.couverture_chemin
                ? urls.get(cahier.couverture_chemin)
                : undefined
            }
            nom={cahier.nom}
          />
        </div>
        <div className="flex flex-col gap-1">
          {cahier.description ? (
            <p className="leading-relaxed">{cahier.description}</p>
          ) : null}
          <p className="text-sm text-taupe">
            {recettes.length}{" "}
            {recettes.length > 1 ? "recettes publiées" : "recette publiée"}
          </p>
        </div>
      </div>
      {recettes.length === 0 ? (
        <p className="leading-relaxed text-taupe">
          Aucune recette de ce cahier n’est encore publiée.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-ardoise/10">
          {enCartes(recettes, urls).map((r) => (
            <li key={r.id}>
              <Ligne
                recette={r}
                detail={r.pageNumero ? `Page ${r.pageNumero}` : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
