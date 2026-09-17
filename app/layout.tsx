import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sinistria-VV",
  description: "Calcul de la valeur vénale des véhicules sinistrés",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
