import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Demo",
  description: "Recorrido por todas las pantallas de Bootstrap con datos de ejemplo.",
};

const DEMO_VIEWS = [
  {
    href: "/demo/agente",
    title: "Resultados del agente",
    body: "Research, convocatorias con su encaje estimado, borradores de MVP, presupuesto y pitch. Con un selector para ver a Boti esperando, pensando y feliz.",
  },
  {
    href: "/demo/crear",
    title: "Crear un pasaporte",
    body: "El formulario de creación y lo que ocurre al enviarlo, sin necesidad de billetera.",
  },
  {
    href: "/demo/passport",
    title: "Un pasaporte con avances",
    body: "Avances verificados, sin verificar y con verificación anulada. Cambia entre visitante, creador del proyecto y validador, y usa los botones de verdad.",
  },
  {
    href: "/demo/reporte",
    title: "Reporte para financiadores",
    body: "El paso de pago (simulado) y el reporte que se desbloquea con un micropago.",
  },
];

const REAL_VIEWS = [
  { href: "/", title: "Portada y agente real", body: "Necesita la clave de IA del servidor para investigar de verdad." },
  { href: "/glosario", title: "Glosario", body: "Los términos técnicos explicados sin jerga." },
  { href: "/passport/9999", title: "Pasaporte que no existe", body: "El estado \"no encontrado\" contra la cadena real." },
  { href: "/passport/new", title: "Crear pasaporte (real)", body: "Pide billetera y la red HSK de prueba." },
];

export default function DemoIndex() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-5 pb-12 pt-8">
      <div className="space-y-3">
        <h1 className="display text-[40px] sm:text-[52px]">Recorre toda la app</h1>
        <p className="max-w-[62ch] text-[17px] text-muted">
          Estas pantallas usan datos de ejemplo para que veas cada sección sin necesitar billetera, claves ni fondos. Los
          componentes son los mismos de la app real.
        </p>
      </div>

      <section className="space-y-4" aria-labelledby="demo-h">
        <h2 id="demo-h" className="display text-[28px]">Con datos de ejemplo</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {DEMO_VIEWS.map((v) => (
            <li key={v.href}>
              <Link href={v.href} className="card block h-full transition-transform hover:-translate-y-0.5">
                <h3 className="text-[19px] font-bold">{v.title}</h3>
                <p className="mt-1 text-muted">{v.body}</p>
                <span className="link mt-3 inline-block">Abrir</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4" aria-labelledby="real-h">
        <h2 id="real-h" className="display text-[28px]">Pantallas reales</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {REAL_VIEWS.map((v) => (
            <li key={v.href}>
              <Link href={v.href} className="card-flat block h-full hover:bg-paper-2">
                <h3 className="text-[17px] font-bold">{v.title}</h3>
                <p className="mt-1 text-[14.5px] text-muted">{v.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
