"use client";

import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";

export function BoutonDeconnexion() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await creerClientNavigateur().auth.signOut({ scope: "local" });
        router.replace("/connexion");
        router.refresh();
      }}
      className="self-start text-sm text-taupe underline underline-offset-4"
    >
      Se déconnecter
    </button>
  );
}
