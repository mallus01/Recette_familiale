import { createBrowserClient } from "@supabase/ssr";
import { dureeSession, OPTIONS_COOKIE, SUPABASE_CLE, SUPABASE_URL } from "./config";

export function creerClientNavigateur() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_CLE, {
    cookieOptions: OPTIONS_COOKIE,
    cookies: {
      getAll: () =>
        document.cookie
          .split("; ")
          .filter(Boolean)
          .map((paire) => {
            const i = paire.indexOf("=");
            return { name: paire.slice(0, i), value: decodeURIComponent(paire.slice(i + 1)) };
          }),
      setAll: (aPoser) => {
        aPoser.forEach(({ name, value, options }) => {
          const o = dureeSession(options);
          const morceaux = [`${name}=${encodeURIComponent(value)}`, `Path=${o.path ?? "/"}`, `Max-Age=${o.maxAge}`];
          if (o.sameSite) morceaux.push(`SameSite=${o.sameSite}`);
          if (location.protocol === "https:") morceaux.push("Secure");
          document.cookie = morceaux.join("; ");
        });
      },
    },
  });
}
