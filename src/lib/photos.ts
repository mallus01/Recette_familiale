"use client";

// Envoi d'une image compressée (~300 Ko) dans le bucket privé « images ».
import { compresserPhoto } from "./images";
import { creerClientNavigateur } from "./supabase/client";

export async function envoyerImage(fichier: File, dossier: string) {
  const blob = await compresserPhoto(fichier);
  const chemin = `${dossier}/${crypto.randomUUID()}.jpg`;
  const { error } = await creerClientNavigateur()
    .storage.from("images")
    .upload(chemin, blob, { contentType: "image/jpeg" });
  if (error) throw new Error(error.message);
  return chemin;
}

export async function supprimerImage(chemin: string | null | undefined) {
  if (!chemin) return;
  await creerClientNavigateur().storage.from("images").remove([chemin]);
}
