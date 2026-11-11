// Icônes par défaut des valeurs des listes fermées (US-15). Les images choisies par
// l'administrateur arrivent en V2.

export function IconeTypeRepas({
  className = "h-6 w-6",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="13" r="6.5" />
      <circle cx="12" cy="13" r="3.5" />
      <path d="M3 4v5.5M1.8 4v3.5c0 1 .5 2 1.2 2s1.2-1 1.2-2V4M3 9.5V21M21 4c-1.4 0-2 2-2 4.5S20 12 21 12m0-8v17" />
    </svg>
  );
}

export function IconeOccasion({
  className = "h-6 w-6",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="m12 11.8 1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z" />
    </svg>
  );
}
