"use client";

import { useLayoutEffect, useRef } from "react";
import { decouper } from "@/lib/mots-douteux";

// Zone de texte dont les mots douteux sont surlignés : un calque identique, placé
// derrière le texte transparent, porte le surlignage. Elle grandit avec son contenu.
export function ChampSurligne({
  valeur,
  onChange,
  motif,
  libelle,
  placeholder,
  className = "",
}: {
  valeur: string;
  onChange: (v: string) => void;
  motif: RegExp | null;
  libelle: string;
  placeholder?: string;
  className?: string;
}) {
  const zone = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = zone.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [valeur]);

  const commun =
    "col-start-1 row-start-1 w-full whitespace-pre-wrap break-words rounded-lg border px-3 py-2";
  return (
    <div className={`grid bg-white ${className}`}>
      <div
        aria-hidden
        className={`${commun} border-transparent text-transparent`}
      >
        {decouper(valeur, motif).map((m, i) =>
          m.douteux ? (
            <mark key={i} className="rounded-sm bg-peche/60 text-transparent">
              {m.texte}
            </mark>
          ) : (
            <span key={i}>{m.texte}</span>
          ),
        )}
        {/* Espace final : garde la même hauteur que la zone de texte après un retour à la ligne. */}{" "}
      </div>
      <textarea
        ref={zone}
        rows={1}
        value={valeur}
        aria-label={libelle}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${commun} resize-none overflow-hidden border-ardoise/25 bg-transparent focus:border-ardoise focus:outline-none`}
      />
    </div>
  );
}
