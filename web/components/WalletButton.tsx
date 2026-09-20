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
      <button className="rounded border border-foreground/20 px-3 py-1 text-sm" onClick={() => disconnect()}>
        {short(address)} · Salir
      </button>
    );
  }
  return (
    <div className="flex flex-col items-end">
      <button
        className="rounded bg-foreground px-3 py-1 text-sm text-background disabled:opacity-50"
        disabled={isPending || !connectors.length}
        onClick={() => connect({ connector: connectors[0] })}
      >
        {isPending ? "Conectando…" : "Conectar wallet"}
      </button>
      {error && <span className="mt-1 text-xs text-red-500">{error.message.slice(0, 80)}</span>}
    </div>
  );
}
