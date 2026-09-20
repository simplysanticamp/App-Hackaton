"use client";

import { use, useState } from "react";
import { useConnection, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { NetworkGuard } from "@/components/NetworkGuard";
import { TxStatus } from "@/components/TxStatus";
import { short } from "@/components/WalletButton";
import {
  APPLICATION_STATUS,
  fundingRegistryAbi,
  fundingRegistryAddress,
  milestonesAbi,
  milestonesAddress,
  passportAbi,
  passportAddress,
} from "@/lib/contracts";
import { hskTestnet } from "@/lib/chains";
import { hashEvidence } from "@/lib/evidence";

const fmt = (ts: bigint | number) => new Date(Number(ts) * 1000).toLocaleString();

function AddMilestone({ tokenId, onDone }: { tokenId: bigint; onDone: () => void }) {
  const [description, setDescription] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hashing, setHashing] = useState(false);
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const done = receipt.isSuccess;
  const canSubmit = description.trim().length > 0 && (file || text.trim().length > 0);

  async function submit() {
    if (!milestonesAddress) return;
    setHashing(true);
    try {
      // El hash se calcula aquí, en el navegador: el contenido de la evidencia nunca sale.
      const evidenceHash = hashEvidence(file ? new Uint8Array(await file.arrayBuffer()) : text);
      writeContract(
        { address: milestonesAddress, abi: milestonesAbi, functionName: "addMilestone", args: [tokenId, description.trim(), evidenceHash] },
        { onSuccess: () => { setDescription(""); setText(""); setFile(null); } },
      );
    } finally {
      setHashing(false);
    }
  }

  return (
    <section className="space-y-3 rounded border border-foreground/20 p-4">
      <h2 className="font-semibold">Registrar hito</h2>
      <input
        className="w-full rounded border border-foreground/20 bg-transparent p-2 text-sm"
        placeholder="Descripción corta (máx. 280 bytes)"
        maxLength={140}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <textarea
        className="w-full rounded border border-foreground/20 bg-transparent p-2 text-sm"
        rows={3}
        placeholder="Evidencia (texto) — o adjunta un archivo abajo"
        value={text}
        disabled={!!file}
        onChange={(e) => setText(e.target.value)}
      />
      <input type="file" className="text-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <p className="text-xs opacity-70">Solo se publica el hash keccak256 de la evidencia, nunca el contenido.</p>
      <button
        className="rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        disabled={!canSubmit || hashing || isPending || receipt.isLoading}
        onClick={submit}
      >
        Registrar hito onchain
      </button>
      <TxStatus hash={hash} pending={isPending || receipt.isLoading} error={error ?? receipt.error} />
      {done && (
        <button className="text-xs underline" onClick={() => { onDone(); reset(); }}>
          Hito confirmado — actualizar lista
        </button>
      )}
    </section>
  );
}

export default function PassportPage({ params }: PageProps<"/passport/[id]">) {
  const { id } = use(params);
  const valid = /^\d{1,20}$/.test(id);
  const tokenId = valid ? BigInt(id) : 0n;
  const { address } = useConnection();
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

  if (!valid) return <main className="p-6">Id de passport inválido.</main>;
  if (!passportAddress || !milestonesAddress) {
    return <main className="p-6 text-sm">Contratos no configurados (NEXT_PUBLIC_PASSPORT_ADDRESS / NEXT_PUBLIC_MILESTONES_ADDRESS).</main>;
  }
  if (owner.isLoading) return <main className="p-6 text-sm opacity-70">Leyendo la cadena…</main>;
  if (owner.error || !owner.data) {
    return <main className="p-6 text-sm">Passport #{id} no encontrado en HSK testnet.</main>;
  }

  const isOwner = !!address && address.toLowerCase() === owner.data.toLowerCase();
  const list = milestones.data ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Project Passport #{id}</h1>
        <p className="text-sm">Founder: <span className="font-mono">{owner.data}</span></p>
        <p className="break-all text-sm">Metadata: <span className="font-mono">{uri.data ?? "…"}</span></p>
        <p className="text-xs opacity-70">
          Soulbound. Certifica evidencia, no identidad. Los hitos verificados los atesta un validator independiente del founder.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="font-semibold">Hitos ({list.length})</h2>
        {milestones.isLoading && <p className="text-sm opacity-70">Cargando…</p>}
        {!milestones.isLoading && list.length === 0 && <p className="text-sm opacity-70">Aún no hay hitos.</p>}
        {list.map((m, i) => {
          const revoked = m.revokedAt !== 0n;
          const verified = m.verifiedAt !== 0n && !revoked;
          return (
            <article key={i} className="space-y-1 rounded border border-foreground/20 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">#{i} {m.description}</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    verified ? "bg-green-500/20" : revoked ? "bg-red-500/20" : "bg-foreground/10"
                  }`}
                >
                  {verified ? "Verificado" : revoked ? "Verificación revocada" : "Sin verificar"}
                </span>
              </div>
              <p className="break-all font-mono text-xs opacity-70">hash: {m.evidenceHash}</p>
              <p className="text-xs opacity-70">
                Registrado {fmt(m.createdAt)} por {short(m.author)}
                {m.author.toLowerCase() === owner.data.toLowerCase() ? " (founder)" : " (validator)"}
                {m.verifiedAt !== 0n && ` · verificado ${fmt(m.verifiedAt)}`}
                {revoked && ` · revocado ${fmt(m.revokedAt)}`}
              </p>
            </article>
          );
        })}
      </section>

      {fundingRegistryAddress && (
        <section className="space-y-2">
          <h2 className="font-semibold">Aplicaciones a fondos ({apps.data?.length ?? 0})</h2>
          {(apps.data ?? []).map((a, i) => (
            <p key={i} className="rounded border border-foreground/20 p-3 text-sm">
              {a.opportunityName} — {APPLICATION_STATUS[a.status] ?? `estado ${a.status}`}
              <span className="ml-2 text-xs opacity-70">{fmt(a.recordedAt)}</span>
            </p>
          ))}
        </section>
      )}

      {isOwner && (
        <NetworkGuard>
          <AddMilestone tokenId={tokenId} onDone={() => milestones.refetch()} />
        </NetworkGuard>
      )}
      {!isOwner && (
        <p className="text-xs opacity-70">Conecta la wallet del founder para registrar hitos.</p>
      )}
    </main>
  );
}
