// Rôles des membres, utilisables aussi dans les composants client.
export type Role = "admin" | "contributeur" | "lecteur";

export const LIBELLES_ROLE: Record<Role, string> = {
  admin: "Administrateur",
  contributeur: "Contributeur",
  lecteur: "Lecteur",
};
