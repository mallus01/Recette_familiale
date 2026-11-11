"use server";

import { revalidatePath } from "next/cache";
import { membreConnecte, type Role } from "@/lib/membre";
import { ROLES } from "@/lib/invitations";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { creerClientServeur } from "@/lib/supabase/serveur";

type Resultat = { erreur?: string };

async function verifierAdmin() {
  const membre = await membreConnecte();
  if (membre?.role !== "admin") throw new Error("Réservé à l’administrateur");
  return membre;
}

function messageEnvoi(message: string) {
  if (/secret_key/i.test(message))
    return "La clé SUPABASE_SECRET_KEY manque dans Vercel.";
  if (/rate|limit/i.test(message))
    return "Trop d’e-mails envoyés d’un coup. Réessaie dans quelques minutes.";
  return "L’invitation n’a pas pu être envoyée. Réessaie.";
}

// Envoie l'e-mail d'invitation natif de Supabase (le compte est créé à l'envoi, avec le
// rôle prévu par l'invitation : voir creer_membre).
async function envoyer(email: string) {
  try {
    const { error } =
      await creerClientAdmin().auth.admin.inviteUserByEmail(email);
    return error ? messageEnvoi(error.message) : null;
  } catch (e) {
    return messageEnvoi(e instanceof Error ? e.message : "");
  }
}

// Supprime le compte créé par une invitation non acceptée (ses listes partent avec).
async function supprimerCompte(email: string) {
  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("membre")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (!data) return;
  const { error } = await creerClientAdmin().auth.admin.deleteUser(data.id);
  if (error) throw new Error(error.message);
}

export async function inviter(email: string, role: Role): Promise<Resultat> {
  const admin = await verifierAdmin();
  const adresse = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse))
    return { erreur: "Cette adresse e-mail n’est pas valide." };
  if (!ROLES.includes(role)) return { erreur: "Rôle inconnu." };

  const supabase = await creerClientServeur();
  const [{ data: membre }, { data: enAttente }] = await Promise.all([
    supabase.from("membre").select("id").eq("email", adresse).maybeSingle(),
    supabase
      .from("invitation")
      .select("id")
      .eq("email", adresse)
      .is("acceptee_le", null)
      .maybeSingle(),
  ]);
  if (enAttente)
    return {
      erreur:
        "Cette personne a déjà une invitation en cours. Renvoie-la depuis la liste.",
    };
  if (membre) return { erreur: "Cette personne est déjà membre." };

  const { data: invitation, error } = await supabase
    .from("invitation")
    .insert({ email: adresse, role, invite_par: admin.id })
    .select("id")
    .single();
  if (error || !invitation)
    return { erreur: "L’invitation n’a pas pu être enregistrée." };

  const echec = await envoyer(adresse);
  if (echec) {
    await supabase.from("invitation").delete().eq("id", invitation.id);
    return { erreur: echec };
  }
  revalidatePath("/profil/admin");
  return {};
}

// Invitation expirée : le compte en attente est recréé et un nouvel e-mail part.
export async function renvoyer(id: number): Promise<Resultat> {
  await verifierAdmin();
  const supabase = await creerClientServeur();
  const { data: invitation } = await supabase
    .from("invitation")
    .select("email")
    .eq("id", id)
    .is("acceptee_le", null)
    .maybeSingle();
  if (!invitation) return { erreur: "Cette invitation n’existe plus." };
  try {
    await supprimerCompte(invitation.email);
  } catch (e) {
    return { erreur: messageEnvoi(e instanceof Error ? e.message : "") };
  }
  await supabase
    .from("invitation")
    .update({ envoyee_le: new Date().toISOString() })
    .eq("id", id);
  const echec = await envoyer(invitation.email);
  revalidatePath("/profil/admin");
  return echec ? { erreur: echec } : {};
}

export async function annuler(id: number): Promise<Resultat> {
  await verifierAdmin();
  const supabase = await creerClientServeur();
  const { data: invitation } = await supabase
    .from("invitation")
    .select("email")
    .eq("id", id)
    .is("acceptee_le", null)
    .maybeSingle();
  if (!invitation) return { erreur: "Cette invitation n’existe plus." };
  try {
    await supprimerCompte(invitation.email);
  } catch (e) {
    return { erreur: messageEnvoi(e instanceof Error ? e.message : "") };
  }
  await supabase.from("invitation").delete().eq("id", id);
  revalidatePath("/profil/admin");
  return {};
}

export async function changerRole(
  membreId: string,
  role: Role,
): Promise<Resultat> {
  const admin = await verifierAdmin();
  if (membreId === admin.id)
    return { erreur: "Tu ne peux pas changer ton propre rôle." };
  if (!ROLES.includes(role)) return { erreur: "Rôle inconnu." };
  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("membre")
    .update({ role })
    .eq("id", membreId);
  if (error) return { erreur: "Le rôle n’a pas pu être changé." };
  revalidatePath("/profil/admin");
  return {};
}

// US-34 : retire un membre. Son compte est supprimé, ses listes privées partent avec ;
// les recettes et cahiers qu'il a créés restent (auteur affiché « Ancien membre »).
export async function retirer(membreId: string): Promise<Resultat> {
  const admin = await verifierAdmin();
  if (membreId === admin.id)
    return { erreur: "Tu ne peux pas te retirer toi-même." };
  const supabase = await creerClientServeur();
  const { data: membre } = await supabase
    .from("membre")
    .select("email")
    .eq("id", membreId)
    .maybeSingle();
  if (!membre) return { erreur: "Ce membre n’existe plus." };
  try {
    const { error } = await creerClientAdmin().auth.admin.deleteUser(membreId);
    if (error) throw new Error(error.message);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    return {
      erreur: /secret_key/i.test(message)
        ? "La clé SUPABASE_SECRET_KEY manque dans Vercel."
        : "Le membre n’a pas pu être retiré. Réessaie.",
    };
  }
  await supabase.from("invitation").delete().eq("email", membre.email);
  revalidatePath("/profil/admin");
  return {};
}
