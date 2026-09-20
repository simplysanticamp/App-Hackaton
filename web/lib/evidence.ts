// Hash de evidencia calculado EN EL CLIENTE: el contenido nunca sale del navegador.
// Devuelve el bytes32 que se pasa a Milestones.addMilestone(tokenId, description, evidenceHash).
import { keccak256, toBytes } from "viem";

export function hashEvidence(content: string | Uint8Array): `0x${string}` {
  return keccak256(typeof content === "string" ? toBytes(content) : content);
}
