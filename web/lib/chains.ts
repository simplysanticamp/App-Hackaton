import { defineChain } from "viem";

// HSK Chain testnet (133). RPC y explorer vienen de variables de entorno públicas;
// el RPC cae al confirmado en deployments/133.json para que el build no dependa de la variable.
export const HSK_TESTNET_RPC = process.env.NEXT_PUBLIC_HSK_TESTNET_RPC || "https://testnet.hsk.xyz";
const explorer = process.env.NEXT_PUBLIC_HSK_TESTNET_EXPLORER;

export const hskTestnet = defineChain({
  id: 133,
  name: "HSK Chain Testnet",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: { default: { http: [HSK_TESTNET_RPC] } },
  // Sin explorer confirmado (BLOCKERS.md §1) no se inventa uno: los links onchain se ocultan.
  ...(explorer ? { blockExplorers: { default: { name: "Blockscout", url: explorer } } } : {}),
  testnet: true,
});
