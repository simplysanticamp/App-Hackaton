// Resultados del agente (research, convocatorias, borradores): los usan el flujo real y la vista de demo.
import Link from "next/link";
import { Term } from "./Term";

export type Source = { title: string; url: string };
export type Opportunity = {
  id: string; name: string; funder: string; type: string; region: string; focus: string;
  eligibility_summary: string; official_url: string; is_demo: boolean;
};
export type Research = { summary: string; sources: Source[]; premiumSourceUsed: boolean; disclaimer: string };
export type Match = { id: string; fit_score: number; rationale: string; gaps: string[]; opportunity: Opportunity };
export type Draft = { opportunity_id: string; mvp: string; budget: { item: string; amount_usd: number }[]; pitch: string };

// El contenido de convocatorias y del LLM es dato no confiable: solo se enlazan URLs http(s).
const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : undefined);
const usd = (n: number) => `USD ${n.toLocaleString("en-US")}`;


export function AgentResults({
  research, matches, drafts, loading = false, createHref = "/passport/new",
}: {
  research: Research | null;
  matches: Match[] | null;
  drafts: Draft[] | null;
  loading?: boolean;
  createHref?: string;
}) {
  return (
    <>
      {research && (
        <section className="arrive card space-y-4">
          <h2 className="display text-[28px]">Lo que encontré de tu mercado</h2>
          <p className="notice">{research.disclaimer}</p>
          <p className="max-w-[70ch] whitespace-pre-wrap">{research.summary}</p>
          {research.sources.length > 0 && (
            <div>
              <p className="label mb-1">De dónde sale esta información</p>
              <ul className="list-disc space-y-0.5 pl-5 text-[14.5px]">
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
        <section className="arrive space-y-4">
          <div>
            <h2 className="display text-[28px]">Convocatorias donde podrías aplicar</h2>
            <p className="text-muted">El &ldquo;encaje&rdquo; es una estimación de Boti, no una garantía. Confirma los requisitos en el link oficial.</p>
          </div>
          {matches.length === 0 && (
            <p className="card-flat text-muted">Ninguna de las convocatorias disponibles encaja con esta idea por ahora.</p>
          )}
          <ul className="space-y-5">
            {matches.map((m) => {
              const draft = drafts?.find((d) => d.opportunity_id === m.id);
              const url = safeUrl(m.opportunity.official_url);
              return (
                <li key={m.id} className="card grid gap-x-5 gap-y-3 sm:grid-cols-[7rem_1fr]">
                  <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-0">
                    <p className="display text-[52px] leading-none">{m.fit_score}</p>
                    <p className="label sm:mt-1">de 100<br />encaje estimado</p>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="text-[20px] font-bold">{m.opportunity.name}</h3>
                      {m.opportunity.is_demo && <span className="tag tag-demo">datos de ejemplo</span>}
                    </div>
                    <p className="text-[14.5px] text-muted">
                      {m.opportunity.funder} · {m.opportunity.type} · {m.opportunity.region}
                    </p>
                    <p>{m.rationale}</p>
                    {m.gaps.length > 0 && (
                      <p className="rounded-xl bg-paper-2 px-3 py-2 text-[14.5px]">
                        <strong>Lo que te faltaría:</strong> {m.gaps.join(" · ")}
                      </p>
                    )}
                    <p className="text-[14.5px]">
                      {url ? (
                        <a className="link" href={url} target="_blank" rel="noreferrer noopener">Ver la convocatoria oficial</a>
                      ) : (
                        <span className="text-muted">Sin link oficial verificado</span>
                      )}
                    </p>

                    {draft ? (
                      <details className="group mt-2 rounded-xl border-2 border-ink bg-paper-2 p-3">
                        <summary className="flex cursor-pointer list-none items-center gap-2 font-bold">
                          <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>▸</span>
                          Borrador listo para pulir
                        </summary>
                        <div className="mt-3 space-y-4">
                          <div>
                            <p className="label mb-1">Tu <Term k="mvp" /> (la versión mínima para probar)</p>
                            <p className="whitespace-pre-wrap">{draft.mvp}</p>
                          </div>
                          <div>
                            <p className="label mb-1">Presupuesto estimado</p>
                            <table className="w-full text-[14.5px]">
                              <tbody>
                                {draft.budget.map((b, i) => (
                                  <tr key={i} className="border-t border-rule">
                                    <td className="py-1.5 pr-3">{b.item}</td>
                                    <td className="mono py-1.5 text-right">{usd(b.amount_usd)}</td>
                                  </tr>
                                ))}
                                <tr className="border-t-2 border-ink font-bold">
                                  <td className="py-1.5 pr-3">Total estimado</td>
                                  <td className="mono py-1.5 text-right">
                                    {usd(draft.budget.reduce((s, b) => s + b.amount_usd, 0))}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div>
                            <p className="label mb-1">Pitch (lo que dirías para convencer)</p>
                            <p className="whitespace-pre-wrap">{draft.pitch}</p>
                          </div>
                          <p className="text-[13px] text-muted">Es un borrador para que lo mejores: no es una aplicación lista para enviar.</p>
                        </div>
                      </details>
                    ) : (
                      loading && <p className="working label mt-2">Boti está escribiendo el borrador…</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {drafts && (
        <section className="arrive card-sun grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-1">
            <h2 className="display text-[28px]">Ahora, dale prueba a tu proyecto</h2>
            <p className="max-w-[56ch] font-medium">
              Crea tu pasaporte: un registro público de tus avances para que un financiador pueda verificarlos sin
              confiar solo en tu palabra.
            </p>
          </div>
          <Link className="btn" href={createHref}>Crear mi pasaporte</Link>
        </section>
      )}
    </>
  );
}
