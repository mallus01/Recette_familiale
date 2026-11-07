import { Suspense } from "react";
import Link from "next/link";
import { LIBELLES_ROLE, membreConnecte, peutNumeriser } from "@/lib/membre";
import { AideInstallation } from "./aide-installation";
import { BoutonDeconnexion } from "./deconnexion";

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
  const membre = await membreConnecte();
  if (!membre) return null;
  return (
    <>
      <p className="text-sm text-taupe">
        Connecté avec {membre.email} · {LIBELLES_ROLE[membre.role]}
      </p>
      {peutNumeriser(membre.role) ? (
        <Link href="/numeriser" className="rounded-xl bg-ardoise px-5 py-3 text-center font-semibold text-white">
          Numériser un cahier
        </Link>
      ) : null}
      <BoutonDeconnexion />
    </>
  );
}
