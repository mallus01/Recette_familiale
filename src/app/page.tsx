import { AideInstallation } from "./aide-installation";

export default function Accueil() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Recettes familiales</h1>
        <p className="text-taupe leading-relaxed">
          Les recettes de la famille, et les cahiers manuscrits qui les ont gardées.
        </p>
      </header>

      <section className="rounded-2xl bg-jaune/40 p-5 leading-relaxed">
        <p>L’appli est en construction. La connexion arrive bientôt.</p>
      </section>

      <AideInstallation />
    </main>
  );
}
