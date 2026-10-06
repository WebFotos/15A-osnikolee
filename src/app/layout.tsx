import type { Metadata, Viewport } from "next";
import { Playfair_Display, Lato, Great_Vibes } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const lato = Lato({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-lato" });
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: ["400"], variable: "--font-vibes" });

export const viewport: Viewport = {
  themeColor: "#123B2A", // forest-deep
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Recuerdo de mis 15 años",
  description: "Cámara y álbum de los 15 años de Nikolee Valezka.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${playfair.variable} ${lato.variable} ${greatVibes.variable} font-sans bg-forest-deep text-cream min-h-[100dvh] safe-area-pt pb-safe flex flex-col overscroll-none`}>
        <div className="forest-bg" />
        {children}
      </body>
    </html>
  );
}
