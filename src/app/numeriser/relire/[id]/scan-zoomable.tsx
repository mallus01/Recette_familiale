"use client";

import { useEffect, useRef, useState } from "react";
import type { Zone } from "@/lib/lecture/resultat";

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const borner = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

// Scan de la page, zoomable au pincement, au double toucher ou avec les boutons, avec
// les mots douteux encadrés quand l'IA a su les situer.
export function ScanZoomable({
  url,
  alt,
  zones,
}: {
  url?: string;
  alt: string;
  zones: Zone[];
}) {
  const cadre = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const zoomCourant = useRef(1);

  // Change le zoom en gardant fixe le point visé (centre du cadre par défaut).
  function zoomer(nouveau: number, point?: { x: number; y: number }) {
    const el = cadre.current;
    const z = borner(nouveau);
    if (!el) return;
    const ancien = zoomCourant.current;
    const px = point?.x ?? el.clientWidth / 2;
    const py = point?.y ?? el.clientHeight / 2;
    const cx = (el.scrollLeft + px) / ancien;
    const cy = (el.scrollTop + py) / ancien;
    zoomCourant.current = z;
    setZoom(z);
    requestAnimationFrame(() => {
      el.scrollLeft = cx * z - px;
      el.scrollTop = cy * z - py;
    });
  }

  // Pincement à deux doigts (écouteurs non passifs, pour bloquer le zoom de la page).
  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    let depart: { distance: number; zoom: number } | null = null;
    const distance = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const milieu = (t: TouchList) => {
      const r = el.getBoundingClientRect();
      return {
        x: (t[0].clientX + t[1].clientX) / 2 - r.left,
        y: (t[0].clientY + t[1].clientY) / 2 - r.top,
      };
    };
    const debut = (e: TouchEvent) => {
      if (e.touches.length === 2)
        depart = { distance: distance(e.touches), zoom: zoomCourant.current };
    };
    const mouvement = (e: TouchEvent) => {
      if (!depart || e.touches.length !== 2) return;
      e.preventDefault();
      zoomer(
        (depart.zoom * distance(e.touches)) / depart.distance,
        milieu(e.touches),
      );
    };
    const fin = (e: TouchEvent) => {
      if (e.touches.length < 2) depart = null;
    };
    el.addEventListener("touchstart", debut, { passive: true });
    el.addEventListener("touchmove", mouvement, { passive: false });
    el.addEventListener("touchend", fin);
    el.addEventListener("touchcancel", fin);
    return () => {
      el.removeEventListener("touchstart", debut);
      el.removeEventListener("touchmove", mouvement);
      el.removeEventListener("touchend", fin);
      el.removeEventListener("touchcancel", fin);
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={cadre}
        className="h-[38svh] touch-pan-x touch-pan-y overflow-auto rounded-2xl bg-jaune/40"
        onDoubleClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          zoomer(zoom > 1 ? 1 : 2.5, {
            x: e.clientX - r.left,
            y: e.clientY - r.top,
          });
        }}
      >
        <div className="relative" style={{ width: `${zoom * 100}%` }}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL signée d'un bucket privé
            <img
              src={url}
              alt={alt}
              className="block w-full select-none"
              draggable={false}
            />
          ) : (
            <p className="p-5 text-sm text-taupe">Scan indisponible</p>
          )}
          {url
            ? zones.map((z, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="absolute rounded-sm border-2 border-peche bg-peche/30"
                  style={{
                    left: `${z.x * 100}%`,
                    top: `${z.y * 100}%`,
                    width: `${z.largeur * 100}%`,
                    height: `${z.hauteur * 100}%`,
                  }}
                />
              ))
            : null}
        </div>
      </div>
      <div className="absolute right-2 bottom-2 flex gap-1">
        <BoutonZoom
          libelle="Dézoomer"
          onClick={() => zoomer(zoom / 1.5)}
          disabled={zoom <= ZOOM_MIN}
        >
          −
        </BoutonZoom>
        <BoutonZoom
          libelle="Zoomer"
          onClick={() => zoomer(zoom * 1.5)}
          disabled={zoom >= ZOOM_MAX}
        >
          +
        </BoutonZoom>
      </div>
    </div>
  );
}

function BoutonZoom({
  libelle,
  onClick,
  disabled,
  children,
}: {
  libelle: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={libelle}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-ardoise text-xl font-semibold text-white shadow disabled:opacity-40"
    >
      {children}
    </button>
  );
}
