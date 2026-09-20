import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Figtree, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "WONK"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

const description = "Convertimos ideas en proyectos financiables, certificados onchain.";

export const metadata: Metadata = {
  title: { default: "Bootstrap", template: "%s · Bootstrap" },
  description,
  openGraph: { title: "Bootstrap", description, type: "website", locale: "es_CO" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff6e5" },
    { media: "(prefers-color-scheme: dark)", color: "#17130f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${figtree.variable} ${fraunces.variable} ${plexMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <Header />
          <div className="flex-1">{children}</div>
          <footer className="mx-auto w-full max-w-5xl px-5 pb-8 pt-4">
            <div className="card-flat space-y-2 text-[14px] text-muted">
              <p>
                <strong className="text-ink">Ten en cuenta:</strong> lo que sugiere Boti es una estimación hecha con IA,
                no una garantía de que cumplas los requisitos. Verifica siempre en el link oficial de cada convocatoria.
              </p>
              <p>
                El pasaporte certifica que existe evidencia de un avance, no quién eres. Todo ocurre en redes de prueba:
                no se mueve dinero real. ¿Una palabra rara? Mira el{" "}
                <Link href="/glosario" className="link">glosario</Link>.
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
