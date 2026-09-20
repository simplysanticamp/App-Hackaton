// Piezas de presentación del pasaporte (sin lectura de cadena): las usan la vista real y la de demo.
import Link from "next/link";
import type { ReactNode } from "react";
import { APPLICATION_STATUS } from "@/lib/contracts";
import { date, shortHash, Status } from "./ledger";
import { Term } from "./Term";

export type MilestoneView = {
  id: number;
  description: string;
  evidenceHash: string;
  createdAt: number;
  verifiedAt: number | null;
  revokedAt: number | null;
  author: string;
};

export type ApplicationView = { opportunityName: string; status: number; recordedAt: number };

export function PassportHeader({
  id, founder, uri, total, verified, reportHref,
}: {
  id: string; founder: string; uri: string; total: number; verified: number; reportHref: string;
}) {
  return (
    <header className="card grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div>
        <p className="label">Pasaporte de proyecto</p>
        <h1 className="display text-[64px] sm:text-[84px]">Nº {id}</h1>
      </div>
      <dl className="space-y-4 self-end">
        <div>
          <dt className="label">Creado por (billetera)</dt>
          <dd className="mono break-all">{founder}</dd>
        </div>
        <div>
          <dt className="label">Descripción guardada en <Term k="ipfs" /></dt>
          <dd className="mono break-all">{uri}</dd>
        </div>
        <div>
          <dt className="label">Avances</dt>
          <dd>{total} anotados · {verified} verificados</dd>
        </div>
      </dl>
      <p className="text-[13px] lg:col-span-2">
        <Link className="link" href={reportHref}>Ver el reporte para financiadores</Link>
      </p>
      <p className="text-[13px] text-muted lg:col-span-2">
        Este pasaporte es <Term k="soulbound" />: no se puede transferir. Certifica evidencia, no identidad. Un avance
        solo cuenta como verificado cuando lo confirma un <Term k="validador" /> distinto de quien lo anotó.
      </p>
    </header>
  );
}

export function MilestoneList({
  milestones, founder, loading, failed, actions,
}: {
  milestones: MilestoneView[];
  founder: string;
  loading?: boolean;
  failed?: boolean;
  /** Botones extra por avance (p. ej. verificar/revocar en modo validador). */
  actions?: (m: MilestoneView, index: number) => ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-3 border-b border-rule pb-2">
        <h2 className="display text-[28px]">Avances del proyecto</h2>
      </div>
      {loading && <p className="working label py-3">Leyendo los avances…</p>}
      {failed && <p className="notice notice-error">No se pudieron leer los avances.</p>}
      {!loading && !failed && milestones.length === 0 && (
        <p className="py-4 text-muted">Este pasaporte todavía no tiene avances. El primero es el más importante.</p>
      )}
      <ol className="space-y-3">
        {milestones.map((m, i) => {
          const revoked = m.revokedAt !== null;
          const verified = m.verifiedAt !== null && !revoked;
          const byFounder = m.author.toLowerCase() === founder.toLowerCase();
          const extra = actions?.(m, i);
          return (
            <li key={m.id} className="card-flat grid grid-cols-[2.25rem_1fr] gap-x-3 gap-y-1 sm:grid-cols-[3rem_1fr_auto]">
              <span className="mono pt-0.5 text-muted">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 space-y-1">
                <p className={`text-[16px] font-medium ${revoked ? "text-muted line-through" : ""}`}>{m.description}</p>
                <p className="mono break-all text-muted" title={m.evidenceHash}>
                  <span className="label mr-2"><Term k="hash">huella</Term></span>
                  {shortHash(m.evidenceHash)}
                </p>
                <p className="text-[12.5px] text-muted">
                  Anotado el {date(m.createdAt)} por {byFounder ? "quien creó el proyecto" : "un validador"}
                  {m.verifiedAt !== null && ` · verificado el ${date(m.verifiedAt)}`}
                  {m.revokedAt !== null && ` · revocado el ${date(m.revokedAt)}`}
                </p>
              </div>
              <p className="col-start-2 text-[13px] font-medium sm:col-start-3 sm:text-right">
                <Status verified={verified} revoked={revoked} />
              </p>
              {extra && <div className="col-start-2 mt-1 sm:col-start-3 sm:mt-0 sm:text-right">{extra}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function ApplicationList({ applications }: { applications: ApplicationView[] }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-3 border-b border-rule pb-2">
        <h2 className="display text-[28px]">Aplicaciones a fondos</h2>
      </div>
      {applications.length === 0 && <p className="py-4 text-muted">Sin aplicaciones registradas.</p>}
      <ul className="space-y-2">
        {applications.map((a, i) => (
          <li key={i} className="card-flat flex flex-wrap items-baseline justify-between gap-x-4 !py-3">
            <span className="font-medium">{a.opportunityName}</span>
            <span className="text-[13px] text-muted">
              {APPLICATION_STATUS[a.status] ?? `Estado ${a.status}`} · {date(a.recordedAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
