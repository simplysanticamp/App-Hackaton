// Comprueba las variables de los contratos y que apunten a contratos reales en HSK testnet (133).
// Solo imprime datos públicos. Uso (desde web/):  node --env-file=.env.local scripts/check-contracts-env.mjs
import { createPublicClient, http, parseAbi } from "viem";

const env = process.env;
let ok = true;
const check = (cond, good, bad) => {
  console.log(cond ? `OK    ${good}` : `FALTA ${bad}`);
  if (!cond) ok = false;
};
const isAddr = (v) => /^0x[0-9a-fA-F]{40}$/.test(v ?? "");

const rpc = env.NEXT_PUBLIC_HSK_TESTNET_RPC;
check(!!rpc, `NEXT_PUBLIC_HSK_TESTNET_RPC = ${rpc}`, "NEXT_PUBLIC_HSK_TESTNET_RPC");

const names = ["NEXT_PUBLIC_PASSPORT_ADDRESS", "NEXT_PUBLIC_MILESTONES_ADDRESS", "NEXT_PUBLIC_FUNDING_REGISTRY_ADDRESS", "PASSPORT_ADDRESS", "MILESTONES_ADDRESS"];
for (const n of names) check(isAddr(env[n]), `${n} tiene formato de dirección`, `${n} (0x + 40 caracteres, sin comillas ni espacios)`);
check(env.NEXT_PUBLIC_PASSPORT_ADDRESS?.toLowerCase() === env.PASSPORT_ADDRESS?.toLowerCase(), "PASSPORT_ADDRESS coincide con NEXT_PUBLIC_PASSPORT_ADDRESS", "PASSPORT_ADDRESS y NEXT_PUBLIC_PASSPORT_ADDRESS deben ser la MISMA dirección");
check(env.NEXT_PUBLIC_MILESTONES_ADDRESS?.toLowerCase() === env.MILESTONES_ADDRESS?.toLowerCase(), "MILESTONES_ADDRESS coincide con NEXT_PUBLIC_MILESTONES_ADDRESS", "MILESTONES_ADDRESS y NEXT_PUBLIC_MILESTONES_ADDRESS deben ser la MISMA dirección");

if (ok) {
  const client = createPublicClient({ transport: http(rpc) });
  try {
    check((await client.getChainId()) === 133, "el RPC es la chain 133 (HSK testnet)", "el RPC no es la chain 133");
    const p = env.NEXT_PUBLIC_PASSPORT_ADDRESS, m = env.NEXT_PUBLIC_MILESTONES_ADDRESS, f = env.NEXT_PUBLIC_FUNDING_REGISTRY_ADDRESS;
    for (const [n, a] of [["Passport", p], ["Milestones", m], ["FundingRegistry", f]]) {
      const code = await client.getCode({ address: a });
      check(!!code && code !== "0x", `${n}: hay un contrato en ${a}`, `${n}: NO hay contrato en ${a} (dirección equivocada)`);
    }
    const abi = parseAbi(["function passport() view returns (address)", "function owner() view returns (address)"]);
    const link = await client.readContract({ address: m, abi, functionName: "passport" });
    check(link.toLowerCase() === p.toLowerCase(), "Milestones apunta a este Passport", `Milestones apunta a ${link}, no a tu Passport: mezclaste direcciones de despliegues distintos`);
    const link2 = await client.readContract({ address: f, abi, functionName: "passport" });
    check(link2.toLowerCase() === p.toLowerCase(), "FundingRegistry apunta a este Passport", `FundingRegistry apunta a ${link2}, no a tu Passport`);
    console.log("Owner del Passport:", await client.readContract({ address: p, abi, functionName: "owner" }));
  } catch (e) {
    console.log("No se pudo consultar la cadena:", e.cause?.code ?? e.shortMessage ?? e.message);
    ok = false;
  }
}
console.log(ok ? "\nTodo listo." : "\nHay pendientes arriba.");
process.exit(ok ? 0 : 1);
