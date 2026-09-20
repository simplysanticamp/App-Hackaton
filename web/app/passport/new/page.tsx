"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { parseEventLogs } from "viem";
import { useConnection, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { NetworkGuard } from "@/components/NetworkGuard";
import { Term } from "@/components/Term";
import { TxStatus } from "@/components/TxStatus";
import { passportAbi, passportAddress } from "@/lib/contracts";

function MintForm() {
  const router = useRouter();
  const { address } = useConnection();
  const [uri, setUri] = useState("");
  const [manual, setManual] = useState(false);
  const [meta, setMeta] = useState({ name: "", description: "", category: "" });
  const [pinning, setPinning] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const validUri = /^ipfs:\/\/\S+$/.test(uri);
  const validMeta = meta.name.trim().length >= 3 && meta.description.trim().length >= 10 && meta.category.trim().length >= 2;
  const canSubmit = manual ? validUri : validMeta;
  const busy = pinning || isPending || receipt.isLoading;

  async function submit() {
    if (!address || !passportAddress) return;
    let target = uri;
    if (!manual) {
      setPinning(true);
      setPinError(null);
      try {
        const res = await fetch("/api/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(meta),
        });
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.uri) throw new Error(j?.error ?? "No se pudo pinear la metadata");
        target = j.uri;
      } catch (e) {
        setPinError(e instanceof Error ? e.message : "Error al pinear");
        return;
      } finally {
        setPinning(false);
      }
    }
    writeContract({ address: passportAddress, abi: passportAbi, functionName: "mintPassport", args: [address, target] });
  }

  useEffect(() => {
    if (!receipt.data) return;
    const [minted] = parseEventLogs({ abi: passportAbi, eventName: "PassportMinted", logs: receipt.data.logs });
    if (minted) router.push(`/passport/${minted.args.tokenId.toString()}`);
  }, [receipt.data, router]);

  return (
    <form
      className="card space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) void submit();
      }}
    >
      {manual ? (
        <div className="space-y-1">
          <label className="label" htmlFor="uri">URI de metadata (IPFS)</label>
          <input
            id="uri"
            className="field mono"
            placeholder="ipfs://<cid>"
            value={uri}
            onChange={(e) => setUri(e.target.value.trim())}
          />
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <label className="label" htmlFor="p-name">Nombre del proyecto</label>
            <input id="p-name" className="field" maxLength={100} value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="p-desc">Descripción</label>
            <textarea
              id="p-desc"
              className="field"
              rows={4}
              maxLength={1000}
              placeholder="Cuenta en pocas frases de qué trata (mínimo 10 caracteres)"
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="p-cat">Categoría</label>
            <input
              id="p-cat"
              className="field"
              maxLength={50}
              placeholder="Ej. climate, fintech, educación"
              value={meta.category}
              onChange={(e) => setMeta({ ...meta, category: e.target.value })}
            />
          </div>
        </>
      )}

      <div className="card-sun space-y-2 text-[15px]">
        <p className="font-bold">Qué pasa cuando lo creas</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Tu nombre, descripción y categoría se guardan en <Term k="ipfs" />, y quedan públicos y permanentes.
          </li>
          <li>
            Se crea tu <Term k="passport" /> en tu billetera. Es <Term k="soulbound" />: no se puede transferir.
          </li>
          <li>
            Certifica que hay evidencia de tus avances, no quién eres (no hacemos <Term k="kyc" />).
          </li>
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn" disabled={!canSubmit || busy} type="submit">
          {pinning ? "Guardando tu información…" : isPending ? "Aprueba en tu billetera…" : receipt.isLoading ? "Confirmando…" : "Crear mi pasaporte"}
        </button>
        <button type="button" className="link text-[13px] text-muted" onClick={() => setManual(!manual)}>
          {manual ? "Usar el formulario" : "Ya tengo un ipfs:// propio"}
        </button>
      </div>
      {pinError && <p role="alert" className="notice notice-error">{pinError}</p>}
      <TxStatus
        hash={hash}
        signing={isPending}
        confirming={receipt.isLoading}
        confirmed={receipt.isSuccess}
        error={error ?? receipt.error}
      />
    </form>
  );
}

export default function NewPassportPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:pt-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
        <div>
          <h1 className="display text-[38px] sm:text-[52px]">Crea el pasaporte de tu proyecto</h1>
          <p className="mt-5 max-w-[46ch] text-[17px] text-muted">
            Es el registro público de tu proyecto. Cada avance que sumes queda anotado <Term k="onchain" />, con la <Term k="hash" /> de tu evidencia, para que cualquiera pueda comprobarlo.
          </p>
        </div>
        <NetworkGuard>
          <MintForm />
        </NetworkGuard>
      </div>
    </main>
  );
}
