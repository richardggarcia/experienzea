import type { Metadata } from "next";
import { Syne, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/Providers";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ExperienZea | RWA Lending Protocol",
  description: "Tu Activo Real = Liquidez Inmediata. Protocolo DeFi para el Agro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${syne.variable} ${manrope.variable} antialiased bg-[#051c14] text-[#f0fdf4] font-sans`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
