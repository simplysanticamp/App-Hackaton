import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { baseSepolia } from "viem/chains";
import { hskTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [hskTestnet, baseSepolia], // Base Sepolia solo para que el financiador firme el pago x402
  connectors: [injected()],
  transports: { [hskTestnet.id]: http(), [baseSepolia.id]: http() },
  ssr: true,
});
