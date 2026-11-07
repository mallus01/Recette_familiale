// Repérage des mots douteux dans un texte, pour les surligner dans les champs (US-12).

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Expression qui trouve chaque mot douteux comme mot entier, sans tenir compte de la casse.
export function motifDouteux(mots: string[]): RegExp | null {
  const uniques = [...new Set(mots.map((m) => m.trim()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (uniques.length === 0) return null;
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${uniques.map(echapper).join("|")})(?![\\p{L}\\p{N}])`,
    "giu",
  );
}

// Découpe un texte en morceaux, surlignés ou non.
export function decouper(
  texte: string,
  motif: RegExp | null,
): { texte: string; douteux: boolean }[] {
  if (!motif || !texte) return [{ texte, douteux: false }];
  const morceaux: { texte: string; douteux: boolean }[] = [];
  let debut = 0;
  for (const m of texte.matchAll(motif)) {
    if (m.index > debut)
      morceaux.push({ texte: texte.slice(debut, m.index), douteux: false });
    morceaux.push({ texte: m[0], douteux: true });
    debut = m.index + m[0].length;
  }
  if (debut < texte.length)
    morceaux.push({ texte: texte.slice(debut), douteux: false });
  return morceaux;
}

export function contientDouteux(texte: string, motif: RegExp | null) {
  if (!motif) return false;
  motif.lastIndex = 0;
  const trouve = motif.test(texte);
  motif.lastIndex = 0;
  return trouve;
}
