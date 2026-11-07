export function Couverture({ url, nom }: { url?: string; nom: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- URL signée d'un bucket privé
    <img src={url} alt={`Couverture de ${nom}`} className="aspect-[3/4] w-full rounded-xl bg-jaune/40 object-cover" />
  ) : (
    <div className="aspect-[3/4] w-full rounded-xl bg-jaune/40" />
  );
}
