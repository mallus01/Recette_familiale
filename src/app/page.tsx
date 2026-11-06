import { Suspense } from "react";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { AideInstallation } from "./aide-installation";
import { BoutonDeconnexion } from "./deconnexion";

const LIBELLES_ROLE: Record<string, string> = {
  admin: "Administrateur",
  contributeur: "Contributeur",
  lecteur: "Lecteur",
};

export default function Accueil() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Recettes familiales</h1>
        <p className="text-taupe leading-relaxed">
          Les recettes de la famille, et les cahiers manuscrits qui les ont gardées.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl bg-jaune/40 p-5 leading-relaxed">
        <p>L’appli est en construction.</p>
        <Suspense>
          <MembreConnecte />
        </Suspense>
      </section>

      <AideInstallation />
    </main>
  );
}

async function MembreConnecte() {
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.email) return null;
  const { data: membre } = await supabase.from("membre").select("role").eq("id", claims.sub).maybeSingle();
  const role = membre ? LIBELLES_ROLE[membre.role] : null;
  return (
    <>
      <p className="text-sm text-taupe">
        Connecté avec {claims.email}
        {role ? ` · ${role}` : ""}
      </p>
      <BoutonDeconnexion />
    </>
  );
}
