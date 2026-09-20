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
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const validUri = /^ipfs:\/\/\S+$/.test(uri);

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
        if (!address || !passportAddress || !validUri) return;
        writeContract({ address: passportAddress, abi: passportAbi, functionName: "mintPassport", args: [address, uri] });
      }}
    >
      <label className="block text-sm">
        URI de metadata (IPFS)
        <input
          className="mt-1 w-full rounded border border-foreground/20 bg-transparent p-2 font-mono text-sm"
          placeholder="ipfs://<cid>"
          value={uri}
          onChange={(e) => setUri(e.target.value.trim())}
        />
      </label>
      <p className="text-xs opacity-70">
        El JSON con nombre, descripción y categoría del proyecto vive en IPFS, no onchain. Debe ser <code>ipfs://</code>:
        el CID fija el contenido, así que nadie puede reescribirlo después de que un financiador lo revise.
      </p>
      <p className="text-xs opacity-70">
        El passport certifica evidencia, no identidad (sin KYC). Es soulbound: no se puede transferir.
      </p>
      <button
        className="rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        disabled={!validUri || isPending || receipt.isLoading}
        type="submit"
      >
        Mintear mi Passport
      </button>
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
