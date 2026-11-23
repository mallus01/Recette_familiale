import { creerClientNavigateur } from "@/lib/supabase/client";

export type ListeCreee = { id: number; nom: string };

// US-53 : nom obligatoire, 60 caractères au plus, unique pour le membre (sans tenir
// compte des majuscules). Le membre est celui de la session (valeur par défaut en base).
export async function creerListe(
  nom: string,
): Promise<{ liste: ListeCreee } | { erreur: string }> {
  const propre = nom.trim();
  if (!propre) return { erreur: "Donne un nom à la liste." };
  const { data, error } = await creerClientNavigateur()
    .from("liste_membre")
    .insert({ nom: propre })
    .select("id, nom")
    .single();
  if (error?.code === "23505")
    return { erreur: "Tu as déjà une liste qui porte ce nom." };
  if (error || !data)
    return {
      erreur:
        "La liste n’a pas pu être créée. Vérifie ta connexion et réessaie.",
    };
  return { liste: data as ListeCreee };
}

export async function renommerListe(id: number, nom: string) {
  const propre = nom.trim();
  if (!propre) return "Donne un nom à la liste.";
  const { error } = await creerClientNavigateur()
    .from("liste_membre")
    .update({ nom: propre })
    .eq("id", id);
  if (error?.code === "23505") return "Tu as déjà une liste qui porte ce nom.";
  if (error)
    return "Le nom n’a pas pu être changé. Vérifie ta connexion et réessaie.";
  return null;
}
