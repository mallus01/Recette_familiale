import Link from "next/link";

export function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
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
