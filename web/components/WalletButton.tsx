"use client";

import { useConnect, useConnection, useConnectors, useDisconnect } from "wagmi";

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function WalletButton() {
  const { address, isConnected } = useConnection();
  const { connect, isPending, error } = useConnect();
  const connectors = useConnectors();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        className="btn btn-quiet mono group"
        onClick={() => disconnect()}
        title="Desconectar billetera"
        aria-label={`Billetera ${address}. Desconectar`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-verified" aria-hidden />
        <span className="group-hover:hidden">{short(address)}</span>
        <span className="hidden group-hover:inline">Desconectar</span>
      </button>
    );
  }
  return (
    <div className="flex flex-col items-end">
      <button
        className="btn btn-quiet"
        disabled={isPending || !connectors.length}
        onClick={() => connect({ connector: connectors[0] })}
      >
        {isPending ? "Esperando a tu billetera…" : "Conectar billetera"}
      </button>
      {!connectors.length && <span className="mt-1 text-xs text-muted">No encuentro una billetera en tu navegador. Instala MetaMask.</span>}
      {error && <span role="alert" className="mt-1 max-w-56 text-right text-xs text-danger">{error.message.slice(0, 90)}</span>}
    </div>
  );
}
