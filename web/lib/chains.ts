import { defineChain } from "viem";

// HSK Chain testnet (133). RPC y explorer vienen de variables de entorno públicas.
export const hskTestnet = defineChain({
  id: 133,
  name: "HSK Chain Testnet",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_HSK_TESTNET_RPC ?? ""] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: process.env.NEXT_PUBLIC_HSK_TESTNET_EXPLORER ?? "",
    },
  },
  testnet: true,
});
