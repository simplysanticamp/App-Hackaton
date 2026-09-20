// Cliente x402: el agente paga por llamada a fuentes premium (Base Sepolia, USDC).
// Capas de protección: spendControls de @x402/fetch + hook propio (cap por tx, diario, allowlist de payees).
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { assertPaymentAllowed, PaymentDenied } from "./x402-policy";
import { AgentError } from "./types";

const NETWORK = "eip155:84532"; // Base Sepolia
const USDC_DECIMALS = 6;
const MAX_PER_TX_USD = process.env.AGENT_MAX_PER_TX_USD ?? "0.05";

let _fetch: typeof fetch | null = null;

function paidFetch(): typeof fetch {
  if (_fetch) return _fetch;
  const pk = process.env.AGENT_WALLET_PRIVATE_KEY;
  if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    throw new AgentError("not_configured", "AGENT_WALLET_PRIVATE_KEY no configurada");
  }
  const client = x402Client
    .fromConfig({
      schemes: [{ network: NETWORK, client: new ExactEvmScheme(privateKeyToAccount(pk as `0x${string}`)) }],
      spendControls: { maxAmountPerPayment: MAX_PER_TX_USD },
    })
    .onBeforePaymentCreation(async ({ selectedRequirements: r }) => {
      if (r.network !== NETWORK) return { abort: true, reason: "red no permitida" };
      try {
        // Asume USDC (6 decimales), único asset permitido por spendControls por defecto.
        assertPaymentAllowed(Number(r.amount) / 10 ** USDC_DECIMALS, r.payTo);
      } catch (e) {
        if (e instanceof PaymentDenied) return { abort: true, reason: e.message };
        throw e;
      }
    });
  return (_fetch = wrapFetchWithPayment(fetch, client));
}

/** GET a una fuente premium; paga automáticamente si responde 402 y la política lo permite. */
export async function fetchPremium(url: string, maxChars = 4000): Promise<string> {
  const res = await paidFetch()(url, { headers: { Accept: "application/json, text/plain" } });
  if (!res.ok) throw new AgentError("upstream", `fuente premium respondió ${res.status}`);
  return (await res.text()).slice(0, maxChars);
}
