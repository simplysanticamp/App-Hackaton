"use client";

import type { ReactNode } from "react";
import { useConnection, useSwitchChain } from "wagmi";
import { hskTestnet } from "@/lib/chains";
import { contractsConfigured } from "@/lib/contracts";
import { WalletButton } from "./WalletButton";

/** Exige contratos configurados, wallet conectada y red HSK testnet antes de mostrar a los hijos. */
export function NetworkGuard({ children }: { children: ReactNode }) {
  const { isConnected, chainId } = useConnection();
  const { switchChain, isPending } = useSwitchChain();

  if (!contractsConfigured) {
    return (
      <p className="rounded border border-amber-500/50 p-3 text-sm">
        Contratos no configurados: faltan NEXT_PUBLIC_PASSPORT_ADDRESS y NEXT_PUBLIC_MILESTONES_ADDRESS.
      </p>
    );
  }
  if (!isConnected) {
    return (
      <div className="space-y-2">
        <p className="text-sm opacity-70">Conecta tu wallet para continuar.</p>
        <WalletButton />
      </div>
    );
  }
  if (chainId !== hskTestnet.id) {
    return (
      <button
        className="rounded bg-foreground px-3 py-2 text-sm text-background disabled:opacity-50"
        disabled={isPending}
        onClick={() => switchChain({ chainId: hskTestnet.id })}
      >
        Cambiar a HSK Chain testnet (133)
      </button>
    );
  }
  return <>{children}</>;
}
