import { creerClientServeur } from "./serveur";

const DUREE_URL = 60 * 60; // secondes

// URL signées (bucket privé) pour afficher des images côté serveur.
export async function urlsSignees(chemins: string[]) {
  const valides = chemins.filter(Boolean);
  if (valides.length === 0) return new Map<string, string>();
  const supabase = await creerClientServeur();
  const { data } = await supabase.storage.from("images").createSignedUrls(valides, DUREE_URL);
  const urls = new Map<string, string>();
  for (const d of data ?? []) if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl);
  return urls;
}
