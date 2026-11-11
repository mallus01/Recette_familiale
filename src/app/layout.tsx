import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { BarreOnglets } from "@/components/barre-onglets";
import { membreConnecte, peutNumeriser } from "@/lib/membre";
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
    <html lang="fr" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
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
  return <BarreOnglets numeriser={peutNumeriser(membre.role)} />;
}
