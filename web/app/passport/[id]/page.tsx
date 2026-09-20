"use client";

import { use, useEffect, useState } from "react";
import { useConnection, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { NetworkGuard } from "@/components/NetworkGuard";
import { TxStatus } from "@/components/TxStatus";
import {
  APPLICATION_STATUS,
  fundingRegistryAbi,
  fundingRegistryAddress,
  milestonesAbi,
  milestonesAddress,
  passportAbi,
  passportAddress,
  VALIDATOR_ROLE,
} from "@/lib/contracts";
import { hskTestnet } from "@/lib/chains";
import { hashEvidence } from "@/lib/evidence";
import type { Address } from "viem";

const date = (ts: bigint | number) =>
  new Date(Number(ts) * 1000).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
const shortHash = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

function Status({ verified, revoked }: { verified: boolean; revoked: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1.5 text-verified">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 7.5 5.5 11 12 3" />
        </svg>
        Verificado
      </span>
    );
  }
  if (revoked) {
    return (
      <span className="inline-flex items-center gap-1.5 text-danger">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3l8 8M11 3l-8 8" />
        </svg>
        Verificación revocada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="7" r="4.5" />
      </svg>
      Sin verificar
    </span>
  );
}

function AddMilestone({ tokenId, onDone }: { tokenId: bigint; onDone: () => void }) {
  const [description, setDescription] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hashing, setHashing] = useState(false);
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const canSubmit = description.trim().length > 0 && (file || text.trim().length > 0);
  const busy = hashing || isPending || receipt.isLoading;

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
    <section className="space-y-4">
      <div className="flex items-baseline gap-3 border-b border-rule pb-2">
        <h2 className="display text-[26px]">Registrar un hito</h2>
      </div>
      <div className="space-y-1">
        <label className="label" htmlFor="ms-desc">Descripción</label>
        <input
          id="ms-desc"
          className="field"
          placeholder="Qué se logró, en una frase"
          maxLength={140}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="label" htmlFor="ms-text">Evidencia</label>
        <textarea
          id="ms-text"
          className="field"
          rows={3}
          placeholder="Texto de la evidencia, o adjunta un archivo abajo"
          value={text}
          disabled={!!file}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center gap-3 text-[13px]">
          <input type="file" aria-label="Archivo de evidencia" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file && (
            <button type="button" className="link text-muted" onClick={() => setFile(null)}>Quitar archivo</button>
          )}
        </div>
      </div>
      <p className="text-[13px] text-muted">
        Solo se publica el hash keccak256 de la evidencia. El contenido no sale de tu navegador.
      </p>
      <button className="btn" disabled={!canSubmit || busy} onClick={submit}>
        {busy ? "Registrando…" : "Registrar hito onchain"}
      </button>
      <TxStatus
        hash={hash}
        signing={isPending}
        confirming={receipt.isLoading}
        confirmed={receipt.isSuccess}
        error={error ?? receipt.error}
      />
      {receipt.isSuccess && (
        <button className="btn btn-quiet" onClick={() => { onDone(); reset(); }}>Actualizar la lista</button>
      )}
    </section>
  );
}

function EvidenceCheck({ hashes }: { hashes: readonly `0x${string}`[] }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [computed, setComputed] = useState<`0x${string}` | null>(null);

  async function compute() {
    setComputed(hashEvidence(file ? new Uint8Array(await file.arrayBuffer()) : text));
  }
  const matches = computed ? hashes.flatMap((h, i) => (h.toLowerCase() === computed.toLowerCase() ? [i + 1] : [])) : [];

  return (
    <div className="space-y-2">
      <p className="label">Comparar evidencia con los hashes onchain</p>
      <textarea
        className="field"
        rows={2}
        placeholder="Pega el texto de la evidencia que te entregó el founder, o adjunta el archivo"
        value={text}
        disabled={!!file}
        onChange={(e) => { setText(e.target.value); setComputed(null); }}
      />
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <input type="file" aria-label="Archivo de evidencia" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setComputed(null); }} />
        <button className="btn btn-quiet" disabled={!file && !text.trim()} onClick={compute}>Calcular hash</button>
      </div>
      {computed && (
        <p className="mono break-all text-[12px]">
          {computed}
          <span className={`ml-2 font-sans text-[13px] ${matches.length ? "text-verified" : "text-danger"}`}>
            {matches.length ? `Coincide con el hito ${matches.map((n) => String(n).padStart(2, "0")).join(", ")}` : "No coincide con ningún hito de este passport"}
          </span>
        </p>
      )}
    </div>
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

  const { chainId } = useConnection();
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
        <h1 className="display text-[38px]">Passport Nº {id}</h1>
        <p className="text-muted">No existe en {hskTestnet.name}. Revisa el número o crea uno nuevo.</p>
      </div>,
    );
  }

  const ms: Address = milestonesAddress; // estrechado por la guarda de arriba; las closures no conservan el estrechamiento
  const isOwner = !!address && address.toLowerCase() === owner.data.toLowerCase();
  const list = milestones.data ?? [];
  const verifiedCount = list.filter((m) => m.verifiedAt !== 0n && m.revokedAt === 0n).length;

  return shell(
    <div className="space-y-12">
      <header className="grid gap-6 border-b border-rule-strong pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]" style={{ borderColor: "var(--rule-strong)" }}>
        <div>
          <p className="label">Project Passport</p>
          <h1 className="display text-[64px] sm:text-[84px]">Nº {id}</h1>
        </div>
        <dl className="space-y-4 self-end">
          <div>
            <dt className="label">Founder</dt>
            <dd className="mono break-all">{owner.data}</dd>
          </div>
          <div>
            <dt className="label">Metadata</dt>
            <dd className="mono break-all">{uri.data ?? "…"}</dd>
          </div>
          <div>
            <dt className="label">Hitos</dt>
            <dd>
              {list.length} registrados · {verifiedCount} verificados
            </dd>
          </div>
        </dl>
        <p className="text-[13px] text-muted lg:col-span-2">
          Soulbound: no se puede transferir. Certifica evidencia, no identidad. Un hito solo cuenta como verificado
          cuando lo atesta un validator distinto de quien lo registró.
        </p>
      </header>

      {isValidator && (
        <section className="space-y-4 border-l-2 border-verified pl-4">
          <div>
            <p className="label !text-verified">Modo validator</p>
            <p className="text-[13px] text-muted">
              Tu wallet tiene VALIDATOR_ROLE. Verifica solo después de comparar la evidencia con el hash. No puedes
              verificar un hito que tú mismo registraste, y una revocación es definitiva: el historial conserva que fue
              verificado y luego invalidado.
            </p>
          </div>
          {!onRightChain && <p className="notice">Cambia tu wallet a {hskTestnet.name} para firmar.</p>}
          <EvidenceCheck hashes={list.map((m) => m.evidenceHash)} />
          <TxStatus
            hash={act.data}
            signing={act.isPending}
            confirming={actReceipt.isLoading}
            confirmed={actReceipt.isSuccess}
            error={act.error ?? actReceipt.error}
          />
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-baseline gap-3 border-b border-rule pb-2">
          <h2 className="display text-[26px]">Hitos</h2>
        </div>
        {milestones.isLoading && <p className="working label py-3">Cargando hitos…</p>}
        {milestones.error && <p className="notice notice-error">No se pudieron leer los hitos.</p>}
        {!milestones.isLoading && !milestones.error && list.length === 0 && (
          <p className="py-4 text-muted">Este passport todavía no tiene hitos registrados.</p>
        )}
        <ol>
          {list.map((m, i) => {
            const revoked = m.revokedAt !== 0n;
            const verified = m.verifiedAt !== 0n && !revoked;
            const byFounder = m.author.toLowerCase() === owner.data.toLowerCase();
            return (
              <li key={i} className="grid grid-cols-[2.25rem_1fr] gap-x-3 gap-y-1 border-b border-rule py-4 sm:grid-cols-[3rem_1fr_auto]">
                <span className="mono pt-0.5 text-muted">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 space-y-1">
                  <p className={`text-[16px] font-medium ${revoked ? "text-muted line-through" : ""}`}>{m.description}</p>
                  <p className="mono break-all text-muted" title={m.evidenceHash}>
                    <span className="label mr-2">hash</span>
                    {shortHash(m.evidenceHash)}
                  </p>
                  <p className="text-[12.5px] text-muted">
                    Registrado el {date(m.createdAt)} por {byFounder ? "el founder" : "un validator"}
                    {m.verifiedAt !== 0n && ` · verificado el ${date(m.verifiedAt)}`}
                    {revoked && ` · revocado el ${date(m.revokedAt)}`}
                  </p>
                </div>
                <p className="col-start-2 text-[13px] font-medium sm:col-start-3 sm:text-right">
                  <Status verified={verified} revoked={revoked} />
                </p>
                {isValidator && onRightChain && !revoked && (
                  <div className="col-start-2 mt-1 sm:col-start-3 sm:mt-0 sm:text-right">
                    {!verified ? (
                      <button
                        className="btn btn-quiet"
                        disabled={actBusy || m.author.toLowerCase() === address?.toLowerCase()}
                        title={m.author.toLowerCase() === address?.toLowerCase() ? "No puedes verificar un hito que tú registraste" : undefined}
                        onClick={() =>
                          act.writeContract({ address: ms, abi: milestonesAbi, functionName: "verifyMilestone", args: [tokenId, BigInt(i)] })
                        }
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
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {fundingRegistryAddress && (
        <section className="space-y-2">
          <div className="flex items-baseline gap-3 border-b border-rule pb-2">
            <h2 className="display text-[26px]">Aplicaciones a fondos</h2>
          </div>
          {apps.data && apps.data.length === 0 && <p className="py-4 text-muted">Sin aplicaciones registradas.</p>}
          <ul>
            {(apps.data ?? []).map((a, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-rule py-3">
                <span className="font-medium">{a.opportunityName}</span>
                <span className="text-[13px] text-muted">
                  {APPLICATION_STATUS[a.status] ?? `Estado ${a.status}`} · {date(a.recordedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isOwner ? (
        <NetworkGuard>
          <AddMilestone tokenId={tokenId} onDone={() => milestones.refetch()} />
        </NetworkGuard>
      ) : (
        <p className="border-t border-rule pt-4 text-[13px] text-muted">
          Conecta la wallet del founder para registrar hitos en este passport.
        </p>
      )}
    </div>,
  );
}
