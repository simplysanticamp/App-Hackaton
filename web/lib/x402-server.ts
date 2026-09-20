// Lado servidor de x402: recursos que cobran micropagos (Base Sepolia, USDC).
import { x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

export const X402_NETWORK = "eip155:84532"; // Base Sepolia

let _server: x402ResourceServer | null = null;
export function resourceServer() {
  return (_server ??= new x402ResourceServer(
    new HTTPFacilitatorClient({
      url: process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator",
    }),
  ).register(X402_NETWORK, new ExactEvmScheme()));
}
