import type { CookieOptions, CookieOptionsWithName } from "@supabase/ssr";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_CLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Session de 30 jours par appareil (cahier des charges, Comptes et accès).
const TRENTE_JOURS = 60 * 60 * 24 * 30;

export const OPTIONS_COOKIE: CookieOptionsWithName = { sameSite: "lax", path: "/" };

// @supabase/ssr impose 400 jours aux cookies de session : on ramène la durée à 30 jours
// à chaque écriture (une suppression garde son maxAge à 0).
export function dureeSession(options: CookieOptions): CookieOptions {
  return options.maxAge === 0 ? options : { ...options, maxAge: TRENTE_JOURS };
}
