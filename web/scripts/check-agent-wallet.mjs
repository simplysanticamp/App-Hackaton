// Comprueba la configuración x402 del agente. Imprime solo datos públicos: NUNCA la clave privada.
// Uso (desde web/):  node --env-file=.env.local scripts/check-agent-wallet.mjs
import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // USDC de Circle en Base Sepolia
const isAddr = (v) => /^0x[0-9a-fA-F]{40}$/.test(v ?? "");
let ok = true;
const check = (cond, good, bad) => {
  console.log(cond ? `OK    ${good}` : `FALTA ${bad}`);
  if (!cond) ok = false;
};

const pk = process.env.AGENT_WALLET_PRIVATE_KEY;
const payTo = process.env.X402_PAY_TO;
const allow = (process.env.AGENT_ALLOWED_PAYEES ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const premium = process.env.PREMIUM_SOURCE_URL;

check(/^0x[0-9a-fA-F]{64}$/.test(pk ?? ""), "AGENT_WALLET_PRIVATE_KEY con formato válido", "AGENT_WALLET_PRIVATE_KEY (0x + 64 caracteres hex)");
check(isAddr(payTo), `X402_PAY_TO = ${payTo}`, "X402_PAY_TO (dirección 0x… de 42 caracteres)");
check(isAddr(payTo) && allow.includes(payTo.toLowerCase()), "X402_PAY_TO está en AGENT_ALLOWED_PAYEES", "AGENT_ALLOWED_PAYEES debe incluir la dirección de X402_PAY_TO");
check(!!premium, `PREMIUM_SOURCE_URL = ${premium}`, "PREMIUM_SOURCE_URL");

if (/^0x[0-9a-fA-F]{64}$/.test(pk ?? "")) {
  const agent = privateKeyToAccount(pk).address;
  console.log(`\nWallet del agente (pública): ${agent}`);
  check(!isAddr(payTo) || agent.toLowerCase() !== payTo.toLowerCase(), "el agente y la wallet que cobra son distintas", "el agente y X402_PAY_TO son la MISMA wallet: usa dos distintas");
  try {
    const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
    const bal = await client.readContract({ address: USDC, abi: parseAbi(["function balanceOf(address) view returns (uint256)"]), functionName: "balanceOf", args: [agent] });
    const usdc = Number(formatUnits(bal, 6));
    console.log(`Saldo USDC (Base Sepolia): ${usdc}`);
    check(usdc >= 0.05, "saldo suficiente para varias llamadas (cada una cuesta ~0.005)", "sin USDC: pídelo en faucet.circle.com (red Base Sepolia) a la dirección de arriba");
  } catch (e) {
    console.log("No se pudo leer el saldo:", e instanceof Error ? e.message : e);
    ok = false;
  }
}
console.log(ok ? "\nTodo listo." : "\nHay pendientes arriba.");
process.exit(ok ? 0 : 1);
