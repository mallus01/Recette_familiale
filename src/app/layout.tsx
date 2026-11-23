import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { BarreOnglets } from "@/components/barre-onglets";
import { SynchroAffichage } from "@/components/synchro-affichage";
import { SCRIPT_AFFICHAGE, type Taille } from "@/lib/affichage";
import { membreConnecte, peutNumeriser } from "@/lib/membre";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { EnregistrementServiceWorker } from "./enregistrement-service-worker";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Recettes familiales",
  description: "Les recettes de la famille et ses cahiers manuscrits",
  applicationName: "Recettes familiales",
  appleWebApp: {
    capable: true,
    title: "Recettes",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#5C707D",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-taille et data-contraste sont posés avant l'hydratation (US-56, US-57).
    <html
      lang="fr"
      className={`${geist.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_AFFICHAGE }} />
      </head>
      <body className="flex min-h-full flex-col font-sans md:flex-row">
        {children}
        <Suspense>
          <Onglets />
        </Suspense>
        <EnregistrementServiceWorker />
      </body>
    </html>
  );
}

async function Onglets() {
  const membre = await membreConnecte();
  if (!membre) return null;
  // Réglage d'affichage du membre, peut-être choisi sur un autre appareil.
  const { data } = await (await creerClientServeur())
    .from("membre")
    .select("taille_texte, contraste_renforce")
    .eq("id", membre.id)
    .maybeSingle<{ taille_texte: Taille; contraste_renforce: boolean }>();
  return (
    <>
      <BarreOnglets numeriser={peutNumeriser(membre.role)} />
      {data ? (
        <SynchroAffichage
          taille={data.taille_texte}
          contraste={data.contraste_renforce}
        />
      ) : null}
    </>
  );
}
