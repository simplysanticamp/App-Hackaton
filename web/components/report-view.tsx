// Cabecera y cuerpo del reporte para financiadores (sin lógica de pago): los usan la vista real y la de demo.
import Link from "next/link";
import { date, shortHash, Status } from "./ledger";
import { Term } from "./Term";

export type Report = {
  tokenId: string;
  milestoneTotal: number;
  founder: string;
  metadataURI: string;
  milestones: {
    id: number; description: string; evidenceHash: string; createdAt: number;
    verified: boolean; verifiedAt: number | null; revoked: boolean; revokedAt: number | null; author: string;
  }[];
};

export function ReportHeader({ id, passportHref }: { id: string; passportHref: string }) {
  return (
    <header className="card grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div>
        <p className="label">Reporte para financiadores</p>
        <h1 className="display text-[44px] sm:text-[56px]">Pasaporte Nº {id}</h1>
      </div>
      <div className="space-y-2 self-end text-[13px] text-muted">
        <p>
          Aquí ves qué avances de este proyecto fueron verificados por alguien independiente, sin crear cuenta. Se
          desbloquea con un <Term k="micropago" /> en <Term k="usdcPrueba" /> sobre la red Base Sepolia.
        </p>
        <p>
          Los datos ya son públicos <Term k="onchain" />: el pago es por comodidad (te los dejamos ordenados), no porque
          sean secretos. El pasaporte certifica evidencia, no identidad.
        </p>
        <p>
          <Link className="link" href={passportHref}>Ver el pasaporte completo</Link>
        </p>
      </div>
    </header>
  );
}

export function ReportBody({ report, settleTx, settleHref }: { report: Report; settleTx: string | null; settleHref?: string }) {
  return (
    <section className="arrive space-y-6">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="label">Creado por (billetera)</dt>
          <dd className="mono break-all">{report.founder}</dd>
        </div>
        <div>
          <dt className="label">Descripción guardada en <Term k="ipfs" /></dt>
          <dd className="mono break-all">{report.metadataURI}</dd>
        </div>
        <div>
          <dt className="label">Avances verificados</dt>
          <dd>{report.milestones.filter((m) => m.verified).length} de {report.milestoneTotal}</dd>
        </div>
      </dl>
      {report.milestoneTotal > report.milestones.length && (
        <p className="notice">Se muestran los últimos {report.milestones.length} de {report.milestoneTotal} avances.</p>
      )}
      {report.milestones.length === 0 && <p className="text-muted">Este pasaporte todavía no tiene avances.</p>}
      <ol className="space-y-3">
        {report.milestones.map((m) => (
          <li key={m.id} className="card-flat grid grid-cols-[2.25rem_1fr] gap-x-3 gap-y-1 sm:grid-cols-[3rem_1fr_auto]">
            <span className="mono pt-0.5 text-muted">{String(m.id + 1).padStart(2, "0")}</span>
            <div className="min-w-0 space-y-1">
              <p className={`text-[16px] font-medium ${m.revoked ? "text-muted line-through" : ""}`}>{m.description}</p>
              <p className="mono break-all text-muted" title={m.evidenceHash}>
                <span className="label mr-2"><Term k="hash">huella</Term></span>
                {shortHash(m.evidenceHash)}
              </p>
              <p className="text-[12.5px] text-muted">
                Anotado el {date(m.createdAt)} por {m.author.toLowerCase() === report.founder.toLowerCase() ? "quien creó el proyecto" : "un validador"}
                {m.verifiedAt !== null && ` · verificado el ${date(m.verifiedAt)}`}
                {m.revokedAt !== null && ` · revocado el ${date(m.revokedAt)}`}
              </p>
            </div>
            <p className="col-start-2 text-[13px] font-medium sm:col-start-3 sm:text-right">
              <Status verified={m.verified} revoked={m.revoked} />
            </p>
          </li>
        ))}
      </ol>
      {settleTx && (
        <p className="mono break-all text-[12px] text-muted">
          Comprobante del pago (Base Sepolia):{" "}
          {settleHref ? (
            <a className="link" href={settleHref} target="_blank" rel="noreferrer noopener">{settleTx}</a>
          ) : (
            settleTx
          )}
        </p>
      )}
    </section>
  );
}
