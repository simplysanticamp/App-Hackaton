import { AgentRunner } from "@/components/AgentRunner";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:pt-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <h1 className="display text-[38px] sm:text-[46px]">
            Convierte tu idea en un proyecto financiable
          </h1>
          <p className="mt-5 max-w-[42ch] text-muted">
            No buscamos financiación para startups que ya existen: convertimos ideas en proyectos financiables y
            certificamos cada paso onchain para que cualquier financiador pueda verificarlo.
          </p>
        </div>
        <AgentRunner />
      </div>
    </main>
  );
}
