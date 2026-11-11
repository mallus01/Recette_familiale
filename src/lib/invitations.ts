import type { Role } from "./roles";

// Une invitation est valable 15 minutes, comme les liens de connexion.
export const DUREE_INVITATION_MS = 15 * 60 * 1000;

export const ROLES: Role[] = ["lecteur", "contributeur", "admin"];

export function expireLe(envoyeeLe: string) {
  return new Date(envoyeeLe).getTime() + DUREE_INVITATION_MS;
}

// « Claire D. » : seule l'initiale du nom de famille est affichée.
export function nomAffiche(m: {
  prenom: string | null;
  nom: string | null;
  email: string;
}) {
  const prenom = m.prenom?.trim();
  if (!prenom) return m.email;
  const initiale = m.nom?.trim().charAt(0);
  return initiale ? `${prenom} ${initiale.toUpperCase()}.` : prenom;
}
