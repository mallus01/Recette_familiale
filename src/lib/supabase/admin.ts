import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// Client Supabase avec la clé secrète, pour les invitations (US-33). Uniquement côté
// serveur : la clé vient de la variable d'environnement SUPABASE_SECRET_KEY (Vercel),
// jamais du code ni du navigateur.
export function creerClientAdmin() {
  const cle = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!cle) throw new Error("SUPABASE_SECRET_KEY manquante dans Vercel");
  return createClient(SUPABASE_URL, cle, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
