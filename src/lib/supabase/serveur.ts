import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { dureeSession, OPTIONS_COOKIE, SUPABASE_CLE, SUPABASE_URL } from "./config";

export async function creerClientServeur() {
  const magasin = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_CLE, {
    cookieOptions: OPTIONS_COOKIE,
    cookies: {
      getAll: () => magasin.getAll(),
      setAll: (aPoser) => {
        try {
          aPoser.forEach(({ name, value, options }) => magasin.set(name, value, dureeSession(options)));
        } catch {
          // Appelé depuis un composant serveur : le proxy se charge du rafraîchissement.
        }
      },
    },
  });
}
