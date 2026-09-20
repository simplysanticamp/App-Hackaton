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
const usd = (n: number) => `USD ${n.toLocaleString("en-US")}`;

const ERRORS: Record<string, string> = {
  not_configured: "El agente no está configurado.",
  refusal: "El modelo rechazó la solicitud.",
  bad_output: "El modelo devolvió una respuesta inválida. Intenta de nuevo.",
  upstream: "Falló un servicio externo. Intenta de nuevo.",
};

const STEPS = [
  { key: "research", n: "01", label: "Research de mercado" },
  { key: "matching", n: "02", label: "Cruce con convocatorias" },
  { key: "pitch", n: "03", label: "Borradores por oportunidad" },
] as const;

export function AgentRunner() {
  const [idea, setIdea] = useState("");
  const [research, setResearch] = useState<Research | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = stage !== null;
  const started = loading || !!research || !!error;

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

  const done = { research: !!research, matching: !!matches, pitch: !!drafts };

  return (
    <div className="space-y-12">
      <section aria-label="Tu idea" className="space-y-3">
        <label htmlFor="idea" className="label block">Tu idea</label>
        <textarea
          id="idea"
          className="field"
          rows={5}
          maxLength={2000}
          placeholder="Describe tu idea (mínimo 10 caracteres)"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="mono text-muted">{idea.length}/2000</span>
          <button className="btn" disabled={loading || idea.trim().length < 10} onClick={run}>
            {loading ? "Trabajando…" : "Investigar idea"}
          </button>
        </div>
        {error && <p role="alert" className="notice notice-error">{error}</p>}
      </section>

      {started && (
        <ol aria-label="Progreso" className="grid gap-x-6 gap-y-1 border-y border-rule py-3 sm:grid-cols-3">
          {STEPS.map((s) => {
            const isDone = done[s.key];
            const active = stage === s.key;
            return (
              <li key={s.key} className={`flex items-baseline gap-2 text-[13px] ${isDone || active ? "" : "text-muted"}`}>
                <span className="mono">{s.n}</span>
                <span className={active ? "working" : ""}>{s.label}</span>
                <span className="mono ml-auto text-muted">{isDone ? "listo" : active ? "en curso" : "—"}</span>
              </li>
            );
          })}
        </ol>
      )}

      {research && (
        <section className="arrive space-y-4">
          <div className="flex items-baseline gap-3 border-b border-rule pb-2">
            <span className="mono text-muted">01</span>
            <h2 className="display text-[26px]">Research</h2>
          </div>
          <p className="notice">{research.disclaimer}</p>
          <p className="max-w-[68ch] whitespace-pre-wrap leading-relaxed">{research.summary}</p>
          {research.sources.length > 0 && (
            <div>
              <p className="label mb-1">Fuentes consultadas</p>
              <ul className="space-y-0.5 text-[13px]">
                {research.sources.map((s) => (
                  <li key={s.url}>
                    {safeUrl(s.url) ? (
                      <a className="link" href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a>
                    ) : (
                      s.title
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {matches && (
        <section className="arrive space-y-2">
          <div className="flex items-baseline gap-3 border-b border-rule pb-2">
            <span className="mono text-muted">02</span>
            <h2 className="display text-[26px]">Oportunidades</h2>
          </div>
          {matches.length === 0 && (
            <p className="py-4 text-muted">Ninguna de las convocatorias disponibles encaja con esta idea.</p>
          )}
          <ul>
            {matches.map((m) => {
              const draft = drafts?.find((d) => d.opportunity_id === m.id);
              const url = safeUrl(m.opportunity.official_url);
              return (
                <li key={m.id} className="grid grid-cols-[3.75rem_1fr] gap-x-4 border-b border-rule py-5 sm:grid-cols-[5.5rem_1fr]">
                  <div>
                    <p className="display text-[40px] leading-none">{m.fit_score}</p>
                    <p className="label mt-1 !text-[9.5px]">afinidad estimada</p>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="text-[17px] font-semibold">{m.opportunity.name}</h3>
                      {m.opportunity.is_demo && <span className="tag tag-demo">demo data</span>}
                    </div>
                    <p className="text-[13px] text-muted">
                      {m.opportunity.funder} · {m.opportunity.type} · {m.opportunity.region}
                    </p>
                    <p>{m.rationale}</p>
                    {m.gaps.length > 0 && (
                      <p className="text-[13px]">
                        <span className="label mr-2">Faltaría</span>
                        {m.gaps.join(" · ")}
                      </p>
                    )}
                    <p className="text-[13px]">
                      {url ? (
                        <a className="link" href={url} target="_blank" rel="noreferrer noopener">Fuente oficial</a>
                      ) : (
                        <span className="text-muted">Sin link oficial verificado</span>
                      )}
                    </p>

                    {draft ? (
                      <details className="group mt-3 border-t border-rule pt-3">
                        <summary className="label flex cursor-pointer list-none items-center gap-2 hover:text-ink">
                          <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>▸</span>
                          Borrador: MVP, presupuesto y pitch
                        </summary>
                        <div className="mt-3 space-y-4">
                          <div>
                            <p className="label mb-1">MVP</p>
                            <p className="whitespace-pre-wrap">{draft.mvp}</p>
                          </div>
                          <div>
                            <p className="label mb-1">Presupuesto estimado</p>
                            <table className="w-full text-[13px]">
                              <tbody>
                                {draft.budget.map((b, i) => (
                                  <tr key={i} className="border-t border-rule">
                                    <td className="py-1.5 pr-3">{b.item}</td>
                                    <td className="mono py-1.5 text-right">{usd(b.amount_usd)}</td>
                                  </tr>
                                ))}
                                <tr className="border-t" style={{ borderColor: "var(--rule-strong)" }}>
                                  <td className="py-1.5 pr-3 font-semibold">Total estimado</td>
                                  <td className="mono py-1.5 text-right font-medium">
                                    {usd(draft.budget.reduce((s, b) => s + b.amount_usd, 0))}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div>
                            <p className="label mb-1">Pitch</p>
                            <p className="whitespace-pre-wrap">{draft.pitch}</p>
                          </div>
                          <p className="text-[12px] text-muted">Borrador: no es una aplicación enviable.</p>
                        </div>
                      </details>
                    ) : (
                      loading && <p className="working label mt-2">Redactando borrador…</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {drafts && (
        <section className="arrive grid gap-4 border-t border-rule-strong pt-6 sm:grid-cols-[1fr_auto] sm:items-end" style={{ borderColor: "var(--rule-strong)" }}>
          <div className="space-y-1">
            <span className="mono text-muted">03</span>
            <h2 className="display text-[26px]">Certifica el proyecto</h2>
            <p className="max-w-[56ch] text-muted">
              Crea un Project Passport onchain para que un financiador pueda verificar tu avance sin confiar en tu palabra.
            </p>
          </div>
          <Link className="btn" href="/passport/new">Crear passport</Link>
        </section>
      )}
    </div>
  );
}
