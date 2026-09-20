"use client";

import { use, useEffect } from "react";
import type { Address } from "viem";
import { useConnection, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { NetworkGuard } from "@/components/NetworkGuard";
import { AddApplication, AddMilestone, EvidenceCheck } from "@/components/passport-forms";
import { ApplicationList, MilestoneList, PassportHeader, type MilestoneView } from "@/components/passport-view";
import { Term } from "@/components/Term";
import { TxStatus } from "@/components/TxStatus";
import {
  fundingRegistryAbi,
  fundingRegistryAddress,
  milestonesAbi,
  milestonesAddress,
  passportAbi,
  passportAddress,
  VALIDATOR_ROLE,
} from "@/lib/contracts";
import { hskTestnet } from "@/lib/chains";

export default function PassportPage({ params }: PageProps<"/passport/[id]">) {
  const { id } = use(params);
  const valid = /^\d{1,20}$/.test(id);
  const tokenId = valid ? BigInt(id) : 0n;
  const { address, chainId } = useConnection();
  const read = { chainId: hskTestnet.id, query: { enabled: valid } } as const;

  const owner = useReadContract({ address: passportAddress, abi: passportAbi, functionName: "ownerOf", args: [tokenId], ...read });
  const uri = useReadContract({ address: passportAddress, abi: passportAbi, functionName: "tokenURI", args: [tokenId], ...read });
  const milestones = useReadContract({ address: milestonesAddress, abi: milestonesAbi, functionName: "getMilestones", args: [tokenId], ...read });
  const apps = useReadContract({
    address: fundingRegistryAddress,
    abi: fundingRegistryAbi,
    functionName: "getApplications",
    args: [tokenId],
    chainId: hskTestnet.id,
    query: { enabled: valid && !!fundingRegistryAddress },
  });

  const role = useReadContract({
    address: milestonesAddress,
    abi: milestonesAbi,
    functionName: "hasRole",
    args: [VALIDATOR_ROLE, (address ?? "0x0000000000000000000000000000000000000000") as Address],
    chainId: hskTestnet.id,
    query: { enabled: !!address },
  });
  const isValidator = role.data === true;
  const onRightChain = chainId === hskTestnet.id;
  const act = useWriteContract();
  const actReceipt = useWaitForTransactionReceipt({ hash: act.data });
  const refetchMilestones = milestones.refetch;
  useEffect(() => {
    if (actReceipt.isSuccess) void refetchMilestones();
  }, [actReceipt.isSuccess, refetchMilestones]);
  const actBusy = act.isPending || actReceipt.isLoading;

  const shell = (children: React.ReactNode) => (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10">{children}</main>
  );

  if (!valid) return shell(<p className="notice notice-error">El id del passport debe ser un número.</p>);
  if (!passportAddress || !milestonesAddress) {
    return shell(<p className="notice">Contratos no configurados (NEXT_PUBLIC_PASSPORT_ADDRESS / NEXT_PUBLIC_MILESTONES_ADDRESS).</p>);
  }
  if (owner.isLoading) return shell(<p className="working label">Leyendo la cadena…</p>);
  if (owner.error || !owner.data) {
    return shell(
      <div className="space-y-2">
        <h1 className="display text-[38px]">Pasaporte Nº {id}</h1>
        <p className="text-muted">No existe en {hskTestnet.name}. Revisa el número o crea uno nuevo.</p>
      </div>,
    );
  }

  const ms: Address = milestonesAddress; // estrechado por la guarda de arriba; las closures no conservan el estrechamiento
  const founder = owner.data;
  const isOwner = !!address && address.toLowerCase() === founder.toLowerCase();
  const list: MilestoneView[] = (milestones.data ?? []).map((m, i) => ({
    id: i,
    description: m.description,
    evidenceHash: m.evidenceHash,
    createdAt: Number(m.createdAt),
    verifiedAt: m.verifiedAt !== 0n ? Number(m.verifiedAt) : null,
    revokedAt: m.revokedAt !== 0n ? Number(m.revokedAt) : null,
    author: m.author,
  }));
  const verifiedCount = list.filter((m) => m.verifiedAt !== null && m.revokedAt === null).length;

  return shell(
    <div className="space-y-10">
      <PassportHeader
        id={id}
        founder={founder}
        uri={uri.data ?? "…"}
        total={list.length}
        verified={verifiedCount}
        reportHref={`/passport/${id}/reporte`}
      />

      {isValidator && (
        <section className="card space-y-4">
          <div>
            <p className="label !text-verified">Modo validador</p>
            <p className="text-[13px] text-muted">
              Tu billetera tiene el rol de <Term k="validador" />. Verifica solo después de comparar la evidencia con su{" "}
              <Term k="hash" />. No puedes verificar un avance que tú mismo anotaste, y anular una verificación es
              definitivo: el historial conserva que fue verificado y luego invalidado.
            </p>
          </div>
          {!onRightChain && <p className="notice">Cambia tu billetera a {hskTestnet.name} para poder aprobar.</p>}
          <EvidenceCheck hashes={list.map((m) => m.evidenceHash as `0x${string}`)} />
          <TxStatus
            hash={act.data}
            signing={act.isPending}
            confirming={actReceipt.isLoading}
            confirmed={actReceipt.isSuccess}
            error={act.error ?? actReceipt.error}
          />
        </section>
      )}

      <MilestoneList
        milestones={list}
        founder={founder}
        loading={milestones.isLoading}
        failed={!!milestones.error}
        actions={(m, i) => {
          if (!isValidator || !onRightChain || m.revokedAt !== null) return null;
          const own = m.author.toLowerCase() === address?.toLowerCase();
          return m.verifiedAt === null ? (
            <button
              className="btn btn-quiet"
              disabled={actBusy || own}
              title={own ? "No puedes verificar un hito que tú registraste" : undefined}
              onClick={() => act.writeContract({ address: ms, abi: milestonesAbi, functionName: "verifyMilestone", args: [tokenId, BigInt(i)] })}
            >
              Verificar
            </button>
          ) : (
            <button
              className="btn btn-quiet"
              disabled={actBusy}
              onClick={() => {
                if (window.confirm("La revocación es definitiva. ¿Revocar la verificación de este hito?")) {
                  act.writeContract({ address: ms, abi: milestonesAbi, functionName: "revokeVerification", args: [tokenId, BigInt(i)] });
                }
              }}
            >
              Revocar
            </button>
          );
        }}
      />

      {fundingRegistryAddress && (
        <ApplicationList
          applications={(apps.data ?? []).map((a) => ({
            opportunityName: a.opportunityName,
            status: a.status,
            recordedAt: Number(a.recordedAt),
          }))}
        />
      )}

      {isOwner ? (
        <NetworkGuard>
          <div className="space-y-12">
            <AddMilestone tokenId={tokenId} onDone={() => milestones.refetch()} />
            {fundingRegistryAddress && <AddApplication tokenId={tokenId} onDone={() => apps.refetch()} />}
          </div>
        </NetworkGuard>
      ) : (
        <p className="border-t border-rule pt-4 text-[13px] text-muted">
          Si este es tu proyecto, conecta la billetera con la que lo creaste para sumar avances.
        </p>
      )}
    </div>,
  );
}
