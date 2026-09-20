// Prueba real del pago x402 (Base Sepolia, USDC de prueba): el agente paga la fuente premium de demo.
// Requiere `npm run dev` corriendo en otra terminal. Gasta ~0.005 USDC de PRUEBA. No imprime la clave.
// Uso (desde web/):  node --env-file=.env.local scripts/test-x402-payment.mjs
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const NETWORK = "eip155:84532";
const pk = process.env.AGENT_WALLET_PRIVATE_KEY;
const payTo = process.env.X402_PAY_TO;
const url = process.env.PREMIUM_SOURCE_URL;
if (!/^0x[0-9a-fA-F]{64}$/.test(pk ?? "") || !payTo || !url) {
  console.error("Faltan variables. Corre primero scripts/check-agent-wallet.mjs");
  process.exit(1);
}

const chain = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
const balanceOf = async (a) =>
  Number(formatUnits(await chain.readContract({ address: USDC, abi: parseAbi(["function balanceOf(address) view returns (uint256)"]), functionName: "balanceOf", args: [a] }), 6));

const account = privateKeyToAccount(pk);
const before = { agent: await balanceOf(account.address), payee: await balanceOf(payTo) };
console.log("Antes   -> agente:", before.agent, "| cobro:", before.payee);

const client = x402Client
  .fromConfig({
    schemes: [{ network: NETWORK, client: new ExactEvmScheme(account) }],
    spendControls: { maxAmountPerPayment: "0.05" },
  })
  .onBeforePaymentCreation(async ({ selectedRequirements: r }) => {
    // Mismas reglas que lib/agent/x402.ts: red, asset y destinatario permitidos.
    if (r.network !== NETWORK) return { abort: true, reason: "red no permitida" };
    if (r.asset?.toLowerCase() !== USDC.toLowerCase()) return { abort: true, reason: "asset no permitido" };
    if (r.payTo.toLowerCase() !== payTo.toLowerCase()) return { abort: true, reason: "payee fuera del allowlist" };
  });

const res = await wrapFetchWithPayment(fetch, client)(url);
console.log("Respuesta HTTP:", res.status);
const body = await res.text();
console.log(body.slice(0, 400));
if (!res.ok) process.exit(1);

// La liquidación onchain puede tardar unos segundos.
await new Promise((r) => setTimeout(r, 8000));
const after = { agent: await balanceOf(account.address), payee: await balanceOf(payTo) };
console.log("Después -> agente:", after.agent, "| cobro:", after.payee);
console.log(after.payee > before.payee ? "PAGO LIQUIDADO: el dinero llegó a la wallet de cobro." : "No se ve el saldo aún: revisa de nuevo en 30 s.");
