import type { Metadata } from "next";
import { GLOSSARY } from "@/lib/glossary";

export const metadata: Metadata = {
  title: "Glosario",
  description: "Las palabras técnicas de Bootstrap, explicadas sin jerga.",
};

export default function GlossaryPage() {
  const entries = Object.entries(GLOSSARY).sort((a, b) => a[1].label.localeCompare(b[1].label, "es"));
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-12 pt-10">
      <h1 className="display text-[40px] sm:text-[52px]">Glosario</h1>
      <p className="mt-3 max-w-[60ch] text-[17px] text-muted">
        Si algo suena a otro idioma, aquí está en cristiano. También puedes pasar el cursor (o tocar) cualquier palabra
        con subrayado punteado en la app para ver su explicación.
      </p>
      <dl className="mt-8 space-y-4">
        {entries.map(([key, e]) => (
          <div key={key} id={key} className="card-flat">
            <dt className="display text-[24px]">{e.label}</dt>
            <dd className="mt-1 font-semibold">{e.short}</dd>
            <dd className="mt-2 text-muted">{e.long}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
