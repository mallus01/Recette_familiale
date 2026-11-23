// Audit sécurité (durcissement D1) : les routes API qui lancent une lecture par l'IA
// n'acceptent que du JSON envoyé depuis l'appli elle-même. Les cookies SameSite=Lax
// bloquent déjà les requêtes d'un autre site ; ce contrôle est une seconde barrière.
export function requeteDeLAppli(requete: Request) {
  const type = requete.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) return false;
  const origine = requete.headers.get("origin");
  if (!origine) return true; // hors navigateur : sans cookie de session, rien ne passe
  const hote = requete.headers.get("x-forwarded-host") ?? requete.headers.get("host");
  try {
    return new URL(origine).host === hote;
  } catch {
    return false;
  }
}
