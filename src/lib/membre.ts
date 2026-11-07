import { creerClientServeur } from "@/lib/supabase/serveur";

export type Role = "admin" | "contributeur" | "lecteur";

export const LIBELLES_ROLE: Record<Role, string> = {
  admin: "Administrateur",
  contributeur: "Contributeur",
  lecteur: "Lecteur",
};

// Membre connecté (null si pas de session ou pas de fiche membre).
export async function membreConnecte() {
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: membre } = await supabase
    .from("membre")
    .select("id, email, prenom, role")
    .eq("id", claims.sub)
    .maybeSingle();
  return membre as { id: string; email: string; prenom: string | null; role: Role } | null;
}

export function peutNumeriser(role: Role | undefined) {
  return role === "admin" || role === "contributeur";
}
