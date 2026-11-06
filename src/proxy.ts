import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { dureeSession, OPTIONS_COOKIE, SUPABASE_CLE, SUPABASE_URL } from "@/lib/supabase/config";

// Pages accessibles sans être connecté
const PAGES_PUBLIQUES = ["/connexion", "/auth/confirm"];

export async function proxy(requete: NextRequest) {
  let reponse = NextResponse.next({ request: requete });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_CLE, {
    cookieOptions: OPTIONS_COOKIE,
    cookies: {
      getAll: () => requete.cookies.getAll(),
      setAll: (aPoser, entetes) => {
        aPoser.forEach(({ name, value }) => requete.cookies.set(name, value));
        reponse = NextResponse.next({ request: requete });
        aPoser.forEach(({ name, value, options }) => reponse.cookies.set(name, value, dureeSession(options)));
        Object.entries(entetes ?? {}).forEach(([cle, valeur]) => reponse.headers.set(cle, valeur));
      },
    },
  });

  // Rafraîchit la session si besoin et vérifie le jeton auprès de Supabase.
  const { data } = await supabase.auth.getClaims();
  const connecte = Boolean(data?.claims);
  const chemin = requete.nextUrl.pathname;
  const publique = PAGES_PUBLIQUES.some((p) => chemin === p || chemin.startsWith(`${p}/`));

  if (!connecte && !publique) return rediriger(requete, reponse, "/connexion");
  if (connecte && chemin === "/connexion") return rediriger(requete, reponse, "/");
  return reponse;
}

function rediriger(requete: NextRequest, reponse: NextResponse, chemin: string) {
  const redirection = NextResponse.redirect(new URL(chemin, requete.url));
  reponse.cookies.getAll().forEach((c) => redirection.cookies.set(c));
  return redirection;
}

export const config = {
  // Tout sauf les fichiers statiques, les icônes, le manifeste et le service worker.
  matcher: [
    "/((?!_next/static|_next/image|icons/|icon.png|apple-icon.png|manifest.webmanifest|sw.js|hors-ligne.html).*)",
  ],
};
