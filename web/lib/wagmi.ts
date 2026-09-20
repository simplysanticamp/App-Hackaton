import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { hskTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [hskTestnet],
  connectors: [injected()],
  transports: { [hskTestnet.id]: http() },
  ssr: true,
});
