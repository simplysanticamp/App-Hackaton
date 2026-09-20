import { hskTestnet } from "@/lib/chains";

type Props = {
  hash?: `0x${string}`;
  /** Esperando firma en la wallet. */
  signing?: boolean;
  /** Tx enviada, esperando confirmación en bloque. */
  confirming?: boolean;
  confirmed?: boolean;
  error?: Error | null;
};

const errorText = (e: Error) => (("shortMessage" in e && (e.shortMessage as string)) || e.message).slice(0, 220);

/** Estados de una tx: firma → confirmando → confirmada / fallida, con link al explorer si hay uno. */
export function TxStatus({ hash, signing, confirming, confirmed, error }: Props) {
  const explorer = hskTestnet.blockExplorers?.default.url;
  if (!signing && !confirming && !confirmed && !error && !hash) return null;
  return (
    <div className="space-y-1 text-[13px]" aria-live="polite">
      {signing && <p className="working">Aprueba la acción en tu billetera…</p>}
      {confirming && <p className="working">Enviado. Esperando a que la red lo confirme…</p>}
      {confirmed && <p className="text-verified">¡Listo! Quedó guardado onchain.</p>}
      {error && <p role="alert" className="text-danger">No se pudo: {errorText(error)}</p>}
      {hash && (
        <p className="mono break-all text-muted">
          {explorer ? (
            <a className="link" href={`${explorer}/tx/${hash}`} target="_blank" rel="noreferrer noopener">
              {hash}
            </a>
          ) : (
            hash
          )}
        </p>
      )}
    </div>
  );
}
