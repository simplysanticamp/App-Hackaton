"use client";

// Formularios del pasaporte. Con la prop `demo` no tocan la cadena: hacen el trabajo local y avisan al padre.
import { useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Address } from "viem";
import {
  APPLICATION_STATUS,
  fundingRegistryAbi,
  fundingRegistryAddress,
  milestonesAbi,
  milestonesAddress,
} from "@/lib/contracts";
import { hashEvidence } from "@/lib/evidence";
import { Term } from "./Term";
import { TxStatus } from "./TxStatus";

export function AddMilestone({
  tokenId, onDone, demo,
}: {
  tokenId: bigint;
  onDone: () => void;
  demo?: (m: { description: string; evidenceHash: `0x${string}` }) => void;
}) {
  const [description, setDescription] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hashing, setHashing] = useState(false);
  const [demoDone, setDemoDone] = useState(false);
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const canSubmit = description.trim().length > 0 && (file || text.trim().length > 0);
  const busy = hashing || isPending || receipt.isLoading;

  async function submit() {
    if (!demo && !milestonesAddress) return;
    setHashing(true);
    try {
      // El hash se calcula aquí, en el navegador: el contenido de la evidencia nunca sale.
      const evidenceHash = hashEvidence(file ? new Uint8Array(await file.arrayBuffer()) : text);
      if (demo) {
        demo({ description: description.trim(), evidenceHash });
        setDemoDone(true);
        setDescription(""); setText(""); setFile(null);
        return;
      }
      writeContract(
        { address: milestonesAddress as Address, abi: milestonesAbi, functionName: "addMilestone", args: [tokenId, description.trim(), evidenceHash] },
        { onSuccess: () => { setDescription(""); setText(""); setFile(null); } },
      );
    } finally {
      setHashing(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3 border-b border-rule pb-2">
        <h2 className="display text-[28px]">Suma un avance</h2>
      </div>
      <div className="space-y-1">
        <label className="label" htmlFor="ms-desc">¿Qué lograste?</label>
        <input
          id="ms-desc"
          className="field"
          placeholder="Qué se logró, en una frase"
          maxLength={140}
          value={description}
          onChange={(e) => { setDescription(e.target.value); setDemoDone(false); }}
        />
      </div>
      <div className="space-y-1">
        <label className="label" htmlFor="ms-text">Tu evidencia</label>
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
        Solo se publica su <Term k="hash" /> (una huella digital). Tu archivo o texto no sale de tu navegador.
      </p>
      <button className="btn" disabled={!canSubmit || busy} onClick={submit}>
        {busy ? "Guardando…" : "Guardar avance onchain"}
      </button>
      {demoDone && (
        <p className="text-[13px] text-verified" aria-live="polite">
          ¡Listo! (demo) Se agregó a la lista de arriba con la huella real de tu texto. En la app real aquí se firma la transacción.
        </p>
      )}
      <TxStatus hash={hash} signing={isPending} confirming={receipt.isLoading} confirmed={receipt.isSuccess} error={error ?? receipt.error} />
      {receipt.isSuccess && (
        <button className="btn btn-quiet" onClick={() => { onDone(); reset(); }}>Actualizar la lista</button>
      )}
    </section>
  );
}

export function AddApplication({
  tokenId, onDone, demo,
}: {
  tokenId: bigint;
  onDone: () => void;
  demo?: (a: { name: string; status: number }) => void;
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState(1);
  const [demoDone, setDemoDone] = useState(false);
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const busy = isPending || receipt.isLoading;
  const nameBytes = new TextEncoder().encode(name.trim()).length;
  const valid = nameBytes > 0 && nameBytes <= 120;

  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3 border-b border-rule pb-2">
        <h2 className="display text-[28px]">Cuenta a qué fondos aplicaste</h2>
      </div>
      <div className="space-y-1">
        <label className="label" htmlFor="app-name">Convocatoria</label>
        <input
          id="app-name"
          className="field"
          placeholder="Nombre de la convocatoria, tal como la declaras"
          maxLength={120}
          value={name}
          onChange={(e) => { setName(e.target.value); setDemoDone(false); }}
        />
      </div>
      <div className="space-y-1">
        <label className="label" htmlFor="app-status">Estado</label>
        <select id="app-status" className="field" value={status} onChange={(e) => setStatus(Number(e.target.value))}>
          {APPLICATION_STATUS.map((label, i) => (
            <option key={label} value={i}>{label}</option>
          ))}
        </select>
      </div>
      <p className="text-[13px] text-muted">
        Es una declaración tuya: queda registrada con tu dirección y no se puede editar. Si el estado cambia,
        agrega una entrada nueva.
      </p>
      <button
        className="btn"
        disabled={!valid || busy}
        onClick={() => {
          if (demo) {
            demo({ name: name.trim(), status });
            setDemoDone(true);
            setName("");
            return;
          }
          writeContract(
            { address: fundingRegistryAddress as Address, abi: fundingRegistryAbi, functionName: "recordFundingApplication", args: [tokenId, name.trim(), status] },
            { onSuccess: () => setName("") },
          );
        }}
      >
        {busy ? "Guardando…" : "Guardar aplicación onchain"}
      </button>
      {demoDone && (
        <p className="text-[13px] text-verified" aria-live="polite">
          ¡Listo! (demo) Se agregó a la lista de aplicaciones. En la app real aquí se firma la transacción.
        </p>
      )}
      <TxStatus hash={hash} signing={isPending} confirming={receipt.isLoading} confirmed={receipt.isSuccess} error={error ?? receipt.error} />
      {receipt.isSuccess && (
        <button className="btn btn-quiet" onClick={() => { onDone(); reset(); }}>Actualizar la lista</button>
      )}
    </section>
  );
}

export function EvidenceCheck({ hashes, samples }: { hashes: readonly `0x${string}`[]; samples?: readonly string[] }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [computed, setComputed] = useState<`0x${string}` | null>(null);

  async function compute() {
    setComputed(hashEvidence(file ? new Uint8Array(await file.arrayBuffer()) : text));
  }
  const matches = computed ? hashes.flatMap((h, i) => (h.toLowerCase() === computed.toLowerCase() ? [i + 1] : [])) : [];

  return (
    <div className="space-y-2">
      <p className="label">Comprobar evidencia: ¿coincide con la huella guardada?</p>
      <textarea
        className="field"
        rows={2}
        placeholder="Pega el texto de la evidencia que te entregó el founder, o adjunta el archivo"
        value={text}
        disabled={!!file}
        onChange={(e) => { setText(e.target.value); setComputed(null); }}
      />
      {samples && samples.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-muted">Prueba con una evidencia de ejemplo:</span>
          {samples.map((s, i) => (
            <button key={i} type="button" className="btn btn-quiet" onClick={() => { setText(s); setFile(null); setComputed(null); }}>
              Avance {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <input type="file" aria-label="Archivo de evidencia" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setComputed(null); }} />
        <button className="btn btn-quiet" disabled={!file && !text.trim()} onClick={compute}>Calcular hash</button>
      </div>
      {computed && (
        <p className="mono break-all text-[12px]">
          {computed}
          <span className={`ml-2 font-sans text-[13px] ${matches.length ? "text-verified" : "text-danger"}`}>
            {matches.length ? `Coincide con el avance ${matches.map((n) => String(n).padStart(2, "0")).join(", ")}` : "No coincide con ningún avance de este pasaporte"}
          </span>
        </p>
      )}
    </div>
  );
}
