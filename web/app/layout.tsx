import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const description = "Convertimos ideas en proyectos financiables, certificados onchain.";

export const metadata: Metadata = {
  title: { default: "Bootstrap", template: "%s · Bootstrap" },
  description,
  openGraph: { title: "Bootstrap", description, type: "website", locale: "es_CO" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#111311" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <Header />
          <div className="flex-1">{children}</div>
          <footer className="mx-auto w-full max-w-5xl px-5 py-6">
            <p className="label border-t border-rule pt-4">
              Los datos de estimación no son garantía · El passport certifica evidencia, no identidad · HSK Chain testnet
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
