import { hskTestnet } from "@/lib/chains";

export function TxStatus({ hash, pending, error }: { hash?: `0x${string}`; pending: boolean; error?: Error | null }) {
  const explorer = hskTestnet.blockExplorers?.default.url;
  return (
    <div className="text-xs">
      {pending && <p className="opacity-70">Esperando confirmación…</p>}
      {error && <p className="text-red-500">{(("shortMessage" in error && error.shortMessage) || error.message).toString().slice(0, 200)}</p>}
      {hash && (
        <p className="break-all opacity-70">
          tx:{" "}
          {explorer ? (
            <a className="underline" href={`${explorer}/tx/${hash}`} target="_blank" rel="noreferrer">{hash}</a>
          ) : (
            hash
          )}
        </p>
      )}
    </div>
  );
}
