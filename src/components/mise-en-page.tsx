import Link from "next/link";

// Mobile first ; sur grand écran (US-47), la page s'élargit, davantage pour les écrans
// à plusieurs colonnes (large).
export function Page({ children, large = false }: { children: React.ReactNode; large?: boolean }) {
  return (
    <main
      className={`mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] md:px-10 ${
        large ? "md:max-w-5xl" : "md:max-w-2xl"
      }`}
    >
      {children}
    </main>
  );
}

export function EnTete({ titre, retour }: { titre: string; retour?: { href: string; libelle: string } }) {
  return (
    <header className="flex flex-col gap-3">
      {retour ? (
        <Link href={retour.href} className="self-start text-sm text-taupe underline underline-offset-4">
          ← {retour.libelle}
        </Link>
      ) : null}
      <h1 className="text-2xl font-semibold tracking-tight">{titre}</h1>
    </header>
  );
}

export function ReserveAuxContributeurs() {
  return (
    <p className="rounded-2xl bg-ciel/15 p-5 leading-relaxed">
      La numérisation est réservée aux contributeurs et à l’administrateur.
    </p>
  );
}
