"use client";

import type { ReactNode } from "react";
import { useConnection, useSwitchChain } from "wagmi";
import { hskTestnet } from "@/lib/chains";
import { contractsConfigured } from "@/lib/contracts";
import { WalletButton } from "./WalletButton";

/** Exige contratos configurados, wallet conectada y red HSK testnet antes de mostrar a los hijos. */
export function NetworkGuard({ children }: { children: ReactNode }) {
  const { isConnected, chainId } = useConnection();
  const { switchChain, isPending, error } = useSwitchChain();

  if (!contractsConfigured) {
    return (
      <p className="notice">
        Contratos no configurados: faltan NEXT_PUBLIC_PASSPORT_ADDRESS y NEXT_PUBLIC_MILESTONES_ADDRESS.
      </p>
    );
  }
  if (!isConnected) {
    return (
      <div className="flex flex-wrap items-center gap-4 border-y border-rule py-4">
        <p className="text-muted">Para firmar en la cadena necesitas conectar tu wallet.</p>
        <WalletButton />
      </div>
    );
  }
  if (chainId !== hskTestnet.id) {
    return (
      <div className="space-y-2 border-y border-rule py-4">
        <p className="text-muted">
          Tu wallet está en otra red. Los contratos viven en {hskTestnet.name} (chain {hskTestnet.id}).
        </p>
        <button className="btn" disabled={isPending} onClick={() => switchChain({ chainId: hskTestnet.id })}>
          {isPending ? "Confirma en tu wallet…" : `Cambiar a ${hskTestnet.name}`}
        </button>
        {error && <p role="alert" className="text-xs text-danger">{error.message.slice(0, 120)}</p>}
      </div>
    );
  }
  return <>{children}</>;
}
