"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { parseEventLogs } from "viem";
import { useConnection, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { NetworkGuard } from "@/components/NetworkGuard";
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
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) void submit();
      }}
    >
      {manual ? (
        <label className="block text-sm">
          URI de metadata (IPFS)
          <input
            className="mt-1 w-full rounded border border-foreground/20 bg-transparent p-2 font-mono text-sm"
            placeholder="ipfs://<cid>"
            value={uri}
            onChange={(e) => setUri(e.target.value.trim())}
          />
        </label>
      ) : (
        <>
          <input
            className="w-full rounded border border-foreground/20 bg-transparent p-2 text-sm"
            placeholder="Nombre del proyecto"
            maxLength={100}
            value={meta.name}
            onChange={(e) => setMeta({ ...meta, name: e.target.value })}
          />
          <textarea
            className="w-full rounded border border-foreground/20 bg-transparent p-2 text-sm"
            rows={3}
            placeholder="Descripción (mínimo 10 caracteres)"
            maxLength={1000}
            value={meta.description}
            onChange={(e) => setMeta({ ...meta, description: e.target.value })}
          />
          <input
            className="w-full rounded border border-foreground/20 bg-transparent p-2 text-sm"
            placeholder="Categoría (ej. climate, fintech, educación)"
            maxLength={50}
            value={meta.category}
            onChange={(e) => setMeta({ ...meta, category: e.target.value })}
          />
        </>
      )}
      <p className="text-xs opacity-70">
        Esta información se guarda en IPFS, no onchain: el CID fija el contenido, así que nadie puede reescribirlo
        después de que un financiador lo revise. Es pública y permanente.
      </p>
      <p className="text-xs opacity-70">
        El passport certifica evidencia, no identidad (sin KYC). Es soulbound: no se puede transferir.
      </p>
      <button
        className="rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        disabled={!canSubmit || pinning || isPending || receipt.isLoading}
        type="submit"
      >
        {pinning ? "Subiendo a IPFS…" : "Mintear mi Passport"}
      </button>
      <button type="button" className="ml-3 text-xs underline opacity-70" onClick={() => setManual(!manual)}>
        {manual ? "Usar formulario" : "Ya tengo un ipfs:// propio"}
      </button>
      {pinError && <p className="text-xs text-red-500">{pinError}</p>}
      <TxStatus hash={hash} pending={isPending || receipt.isLoading} error={error ?? receipt.error} />
    </form>
  );
}

export default function NewPassportPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Crear Project Passport</h1>
      <NetworkGuard>
        <MintForm />
      </NetworkGuard>
    </main>
  );
}
