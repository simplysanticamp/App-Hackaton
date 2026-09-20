"use client";

import Link from "next/link";
import { useState } from "react";
import { AgentRunner } from "./AgentRunner";
import { Mascot } from "./Mascot";
import type { Mood } from "./Mascot3D";
import { Term } from "./Term";

const BUBBLE: Record<Mood, string> = {
  idle: "¡Hola! Soy Boti. Cuéntame tu idea y yo me encargo de investigar.",
  thinking: "Estoy investigando… dame un momentito.",
  happy: "¡Listo! Mira lo que encontré para ti.",
};

const STEPS = [
  {
    n: "1",
    title: "Cuéntanos tu idea",
    body: "Escríbela con tus palabras, sin formatos. No hace falta que ya tengas empresa.",
  },
  {
    n: "2",
    title: "Boti investiga por ti",
    body: "Estudia tu mercado, busca convocatorias reales donde podrías aplicar y te deja borradores de MVP, presupuesto y pitch para pulir.",
  },
  {
    n: "3",
    title: "Crea tu pasaporte",
    body: "Es un registro público de tu proyecto, atado a tu billetera, que nadie puede vender ni alterar.",
  },
  {
    n: "4",
    title: "Suma avances y que los verifiquen",
    body: "Cada avance queda anotado con la huella de tu evidencia. Un validador independiente lo revisa y lo confirma.",
  },
];

export function HomeClient() {
  const [mood, setMood] = useState<Mood>("idle");
  return (
    <main className="mx-auto w-full max-w-5xl space-y-14 px-5 pb-12 pt-8">
      <section className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <p className="tag border-ink bg-sun text-[#26211a]">Para quien tiene una idea y aún no tiene financiación</p>
          <h1 className="display text-[40px] sm:text-[56px]">
            Convierte tu idea en un proyecto que sí puede recibir financiación
          </h1>
          <p className="max-w-[54ch] text-[18px] text-muted">
            No buscamos dinero para startups que ya existen: te ayudamos a que una idea se vuelva un proyecto financiable.
            Y cada paso que das queda registrado <Term k="onchain" /> (en un libro público que nadie puede editar) para que
            quien quiera financiarte lo compruebe por sí mismo, sin fiarse solo de tu palabra.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="card-sun arrive relative mb-2 text-[16px] font-semibold" aria-live="polite">
            {BUBBLE[mood]}
            <span
              aria-hidden
              className="absolute -bottom-[11px] left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-ink bg-sun"
            />
          </div>
          <Mascot mood={mood} className="h-[300px] w-full sm:h-[340px]" />
        </div>
      </section>

      <AgentRunner onMood={setMood} />

      <section aria-labelledby="como" className="space-y-5">
        <h2 id="como" className="display text-[32px] sm:text-[40px]">¿Cómo funciona?</h2>
        <ol className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((s) => (
            <li key={s.n} className="card flex gap-4">
              <span className="display flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun text-[22px] text-[#26211a]">
                {s.n}
              </span>
              <div>
                <h3 className="text-[18px] font-bold">{s.title}</h3>
                <p className="mt-1 text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card-flat grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-1">
          <h2 className="display text-[26px]">¿Quieres financiar un proyecto?</h2>
          <p className="max-w-[60ch] text-muted">
            Cada pasaporte tiene un reporte con sus avances y cuáles fueron verificados por alguien independiente. Lo
            desbloqueas con un <Term k="micropago" /> (centavos, sin crear cuenta) usando USDC de prueba. Busca el número
            del pasaporte arriba, donde dice &ldquo;Buscar pasaporte Nº&rdquo;.
          </p>
        </div>
        <Link href="/glosario" className="btn btn-quiet">Entender los términos</Link>
      </section>
    </main>
  );
}
