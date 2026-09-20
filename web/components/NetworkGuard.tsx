"use client";

import type { ReactNode } from "react";
import { useConnection, useSwitchChain } from "wagmi";
import { hskTestnet } from "@/lib/chains";
import { contractsConfigured } from "@/lib/contracts";
import { Term } from "./Term";
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
      <div className="card-flat flex flex-wrap items-center gap-4">
        <p className="text-muted">
          Para guardar esto en la cadena necesitas conectar tu <Term k="wallet" />; te pedirá <Term k="firmar" /> para aprobarlo.
        </p>
        <WalletButton />
      </div>
    );
  }
  if (chainId !== hskTestnet.id) {
    return (
      <div className="card-flat space-y-2">
        <p className="text-muted">
          Tu billetera está conectada a otra red. Esto vive en {hskTestnet.name} (una <Term k="testnet" />, chain {hskTestnet.id}).
        </p>
        <button className="btn" disabled={isPending} onClick={() => switchChain({ chainId: hskTestnet.id })}>
          {isPending ? "Confirma en tu billetera…" : `Cambiar a ${hskTestnet.name}`}
        </button>
        {error && <p role="alert" className="text-xs text-danger">{error.message.slice(0, 120)}</p>}
      </div>
    );
  }
  return <>{children}</>;
}
