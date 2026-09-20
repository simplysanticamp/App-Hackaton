"use client";

// Caso 2 de x402: el financiador paga un micropago para desbloquear el reporte de verificación, sin login.
// El pago se firma con la wallet del financiador en Base Sepolia (EIP-3009); el servidor lo liquida.
import { use, useEffect, useState } from "react";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { decodePaymentRequiredHeader, decodePaymentResponseHeader } from "@x402/core/http";
import { useConnection, useConnect, useConnectors, useSwitchChain, useWalletClient } from "wagmi";
import { ReportBody, ReportHeader, type Report } from "@/components/report-view";
import { short } from "@/components/WalletButton";
import { USDC_ASSET, USDC_DECIMALS, X402_CHAIN_ID, X402_CLIENT_NETWORK } from "@/lib/x402-shared";

// Tope que el navegador acepta firmar, aunque el servidor pida más.
const MAX_USD = 0.1;

export default function ReportPage({ params }: PageProps<"/passport/[id]/reporte">) {
  const { id } = use(params);
  const valid = /^\d{1,20}$/.test(id);
  const { address, isConnected, chainId } = useConnection();
  const { connect, isPending: connecting } = useConnect();
  const connectors = useConnectors();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  const [price, setPrice] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [settleTx, setSettleTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Consulta previa sin pagar: el 402 trae el precio; un 503 indica que el servicio no está configurado.
  useEffect(() => {
    if (!valid) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/report/${id}`);
        if (!alive) return;
        if (res.status === 402) {
          const header = res.headers.get("PAYMENT-REQUIRED");
          const req = header ? decodePaymentRequiredHeader(header) : null;
          const amount = req?.accepts?.[0]?.amount;
          if (amount) setPrice(Number(amount) / 10 ** USDC_DECIMALS);
        } else if (!res.ok) {
          const j = await res.json().catch(() => null);
          setUnavailable(j?.error ?? "Reporte no disponible");
        }
      } catch {
        if (alive) setUnavailable("No se pudo contactar al servicio");
      }
    })();
    return () => { alive = false; };
  }, [id, valid]);

  async function pay() {
    if (!walletClient || !address) return;
    setPaying(true);
    setError(null);
    try {
      const signer = {
        address,
        signTypedData: (msg: { domain: Record<string, unknown>; types: Record<string, unknown>; primaryType: string; message: Record<string, unknown> }) =>
          walletClient.signTypedData({ account: address, ...msg } as Parameters<typeof walletClient.signTypedData>[0]),
      };
      const client = x402Client
        .fromConfig({ schemes: [{ network: X402_CLIENT_NETWORK, client: new ExactEvmScheme(signer) }] })
        .onBeforePaymentCreation(async ({ selectedRequirements: r }) => {
          if (r.network !== X402_CLIENT_NETWORK) return { abort: true, reason: "red no permitida" };
          if (r.asset?.toLowerCase() !== USDC_ASSET.toLowerCase()) return { abort: true, reason: "asset no permitido" };
          if (Number(r.amount) / 10 ** USDC_DECIMALS > MAX_USD) return { abort: true, reason: "monto por encima del tope" };
        });
      const res = await wrapFetchWithPayment(fetch, client)(`/api/report/${id}`);
      if (res.status === 404) throw new Error("Ese pasaporte no existe.");
      if (!res.ok) throw new Error(`El servicio respondió ${res.status}. No se cobró el pago si no llegó a liquidarse.`);
      const j = await res.json();
      setReport(j.report as Report);
      const receipt = res.headers.get("PAYMENT-RESPONSE");
      if (receipt) setSettleTx(decodePaymentResponseHeader(receipt).transaction ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(/reject|denied|User/i.test(msg) ? "Cancelaste la aprobación en tu billetera." : msg.slice(0, 220));
    } finally {
      setPaying(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10">{children}</main>
  );
  if (!valid) return shell(<p className="notice notice-error">El número del pasaporte debe ser un número.</p>);

  const priceLabel = price !== null ? `USD ${price.toFixed(2)}` : "el precio que indique el servicio";
  const wrongChain = isConnected && chainId !== X402_CHAIN_ID;

  return shell(
    <div className="space-y-10">
      <ReportHeader id={id} passportHref={`/passport/${id}`} />

      {!report && (
        <section className="space-y-4">
          {unavailable && <p className="notice">{unavailable}</p>}
          {!unavailable && !isConnected && (
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-muted">Conecta la billetera con la que vas a pagar.</p>
              <button className="btn" disabled={connecting || !connectors.length} onClick={() => connect({ connector: connectors[0] })}>
                {connecting ? "Esperando a tu billetera…" : "Conectar billetera"}
              </button>
            </div>
          )}
          {!unavailable && wrongChain && (
            <div className="space-y-2">
              <p className="text-muted">El pago se hace en Base Sepolia (una red de prueba, chain {X402_CHAIN_ID}). Tu billetera está en otra red.</p>
              <button className="btn" disabled={switching} onClick={() => switchChain({ chainId: X402_CHAIN_ID })}>
                {switching ? "Confirma en tu billetera…" : "Cambiar a Base Sepolia"}
              </button>
            </div>
          )}
          {!unavailable && isConnected && !wrongChain && (
            <div className="space-y-2">
              <p className="text-muted">
                Pagas desde <span className="mono">{address && short(address)}</span>. Necesitas USDC de prueba en Base
                Sepolia; lo apruebas con una firma, sin pagar comisión de red, y un facilitador lo liquida.
              </p>
              <button className="btn" disabled={paying || !walletClient} onClick={pay}>
                {paying ? "Aprueba en tu billetera…" : `Pagar ${priceLabel} y ver el reporte`}
              </button>
            </div>
          )}
          {error && <p role="alert" className="notice notice-error">{error}</p>}
        </section>
      )}

      {report && (
        <ReportBody
          report={report}
          settleTx={settleTx}
          settleHref={settleTx ? `https://sepolia.basescan.org/tx/${settleTx}` : undefined}
        />
      )}
    </div>,
  );
}
