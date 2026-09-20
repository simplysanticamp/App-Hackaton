// Piezas compartidas del libro de hitos (vista del founder y reporte del financiador).
export const date = (ts: bigint | number) =>
  new Date(Number(ts) * 1000).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
export const shortHash = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

export function Status({ verified, revoked }: { verified: boolean; revoked: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1.5 text-verified">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 7.5 5.5 11 12 3" />
        </svg>
        Verificado por un validador
      </span>
    );
  }
  if (revoked) {
    return (
      <span className="inline-flex items-center gap-1.5 text-danger">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3l8 8M11 3l-8 8" />
        </svg>
        Verificación anulada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="7" r="4.5" />
      </svg>
      Aún sin verificar
    </span>
  );
}

