import { AgentRunner } from "@/components/AgentRunner";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Convierte tu idea en un proyecto financiable</h1>
        <p className="mt-1 text-sm opacity-70">
          No buscamos financiación para startups que ya existen: convertimos ideas en proyectos financiables y
          certificamos cada paso onchain para que cualquier financiador pueda verificarlo.
        </p>
      </div>
      <AgentRunner />
    </main>
  );
}
