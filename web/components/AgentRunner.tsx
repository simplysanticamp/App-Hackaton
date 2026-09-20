"use client";

import Link from "next/link";
import { useState } from "react";

type Source = { title: string; url: string };
type Opportunity = {
  id: string; name: string; funder: string; type: string; region: string; focus: string;
  eligibility_summary: string; official_url: string; is_demo: boolean;
};
type Research = { summary: string; sources: Source[]; premiumSourceUsed: boolean; disclaimer: string };
type Match = { id: string; fit_score: number; rationale: string; gaps: string[]; opportunity: Opportunity };
type Draft = { opportunity_id: string; mvp: string; budget: { item: string; amount_usd: number }[]; pitch: string };

// El contenido de convocatorias y del LLM es dato no confiable: solo se enlazan URLs http(s).
const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : undefined);

const ERRORS: Record<string, string> = {
  not_configured: "El agente no está configurado.",
  refusal: "El modelo rechazó la solicitud.",
  bad_output: "El modelo devolvió una respuesta inválida. Intenta de nuevo.",
  upstream: "Falló un servicio externo. Intenta de nuevo.",
};

const STAGE_LABEL: Record<string, string> = {
  research: "Investigando el mercado…",
  matching: "Cruzando con convocatorias…",
  pitch: "Redactando borradores…",
};

export function AgentRunner() {
  const [idea, setIdea] = useState("");
  const [research, setResearch] = useState<Research | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = stage !== null;

  async function run() {
    setStage("research");
    setError(null);
    setResearch(null);
    setMatches(null);
    setDrafts(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Error del agente");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const handle = (line: string) => {
        const ev = JSON.parse(line);
        if (ev.error) throw new Error(ERRORS[ev.error] ?? "Error del agente");
        if (ev.stage === "research") { setResearch(ev.data); setStage("matching"); }
        if (ev.stage === "matching") { setMatches(ev.data.matches); setStage("pitch"); }
        if (ev.stage === "pitch") setDrafts(ev.data.drafts);
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        lines.filter((l) => l.trim()).forEach(handle);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setStage(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <textarea
          className="w-full rounded border border-foreground/20 bg-transparent p-3"
          rows={4}
          maxLength={2000}
          placeholder="Describe tu idea (mínimo 10 caracteres)"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
        />
        <button
          className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
          disabled={loading || idea.trim().length < 10}
          onClick={run}
        >
          {loading ? (STAGE_LABEL[stage] ?? "Trabajando…") : "Investigar idea"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </section>

      {research && (
        <p className="rounded border border-amber-500/50 p-3 text-sm">{research.disclaimer}</p>
      )}

      {research && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Research</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{research.summary}</p>
          {research.sources.length > 0 && (
            <ul className="list-disc pl-5 text-xs opacity-80">
              {research.sources.map((s) => (
                <li key={s.url}>
                  {safeUrl(s.url) ? (
                    <a className="underline" href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a>
                  ) : (
                    s.title
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {matches && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">2. Oportunidades</h2>
          {matches.length === 0 && <p className="text-sm opacity-70">No se encontraron oportunidades compatibles.</p>}
          {matches.map((m) => {
            const draft = drafts?.find((d) => d.opportunity_id === m.id);
            const url = safeUrl(m.opportunity.official_url);
            return (
              <article key={m.id} className="space-y-2 rounded border border-foreground/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{m.opportunity.name}</h3>
                  <span className="text-xs opacity-70">
                    {m.opportunity.funder} · {m.opportunity.type} · {m.opportunity.region}
                  </span>
                  {m.opportunity.is_demo && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs">DEMO DATA</span>
                  )}
                  <span className="ml-auto text-sm">Afinidad estimada: {m.fit_score}/100</span>
                </div>
                <p className="text-sm">{m.rationale}</p>
                {m.gaps.length > 0 && <p className="text-xs opacity-80">Faltaría: {m.gaps.join("; ")}</p>}
                {url ? (
                  <a className="text-xs underline" href={url} target="_blank" rel="noreferrer noopener">Fuente oficial</a>
                ) : (
                  <span className="text-xs opacity-60">Sin link oficial verificado</span>
                )}
                {draft && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">Borrador (MVP, presupuesto y pitch)</summary>
                    <div className="mt-2 space-y-2">
                      <p className="whitespace-pre-wrap"><b>MVP:</b> {draft.mvp}</p>
                      <table className="w-full text-xs">
                        <tbody>
                          {draft.budget.map((b, i) => (
                            <tr key={i} className="border-t border-foreground/10">
                              <td className="py-1">{b.item}</td>
                              <td className="py-1 text-right">USD {b.amount_usd.toLocaleString("en-US")}</td>
                            </tr>
                          ))}
                          <tr className="border-t border-foreground/30 font-medium">
                            <td className="py-1">Total estimado</td>
                            <td className="py-1 text-right">
                              USD {draft.budget.reduce((s, b) => s + b.amount_usd, 0).toLocaleString("en-US")}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="whitespace-pre-wrap"><b>Pitch:</b> {draft.pitch}</p>
                      <p className="text-xs opacity-60">Borrador: no es una aplicación enviable.</p>
                    </div>
                  </details>
                )}
              </article>
            );
          })}
        </section>
      )}

      {drafts && (
        <section className="rounded border border-foreground/20 p-4">
          <h2 className="mb-1 text-lg font-semibold">3. Certifica tu proyecto</h2>
          <p className="mb-3 text-sm opacity-80">
            Crea un Project Passport onchain para que un financiador pueda verificar tu avance sin confiar en tu palabra.
          </p>
          <Link className="inline-block rounded bg-foreground px-4 py-2 text-sm text-background" href="/passport/new">
            Crear Passport
          </Link>
        </section>
      )}
    </div>
  );
}
