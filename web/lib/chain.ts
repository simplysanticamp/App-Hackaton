// Lecturas onchain (solo lectura, sin firmar) de los contratos de Bootstrap en HSK Chain.
import { createPublicClient, http, parseAbi, type Address } from "viem";

const passportAbi = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
]);

const milestonesAbi = parseAbi([
  "struct Milestone { string description; bytes32 evidenceHash; uint64 createdAt; uint64 verifiedAt; uint64 revokedAt; address author; }",
  "function milestoneCount(uint256 tokenId) view returns (uint256)",
  "function getMilestone(uint256 tokenId, uint256 milestoneId) view returns (Milestone)",
]);

const isAddress = (v: string | undefined): v is Address => !!v && /^0x[0-9a-fA-F]{40}$/.test(v);

export function chainConfigured() {
  return (
    !!process.env.NEXT_PUBLIC_HSK_TESTNET_RPC &&
    isAddress(process.env.PASSPORT_ADDRESS) &&
    isAddress(process.env.MILESTONES_ADDRESS)
  );
}

export type PassportReport = {
  tokenId: string;
  founder: Address;
  metadataURI: string;
  milestones: {
    id: number;
    description: string;
    evidenceHash: string;
    createdAt: number;
    verified: boolean;
    verifiedAt: number | null;
    /** true si un validator revocó la verificación. `verified` ya es false en ese caso. */
    revoked: boolean;
    revokedAt: number | null;
    /** Quién registró el hito: el founder o un validator. No siempre es el dueño del passport. */
    author: Address;
  }[];
};

/** Devuelve null si el passport no existe. Lanza si la cadena no está configurada o el RPC falla. */
export async function getPassportReport(tokenId: bigint): Promise<PassportReport | null> {
  if (!chainConfigured()) throw new Error("chain_not_configured");
  const client = createPublicClient({ transport: http(process.env.NEXT_PUBLIC_HSK_TESTNET_RPC) });
  const passport = process.env.PASSPORT_ADDRESS as Address;
  const milestones = process.env.MILESTONES_ADDRESS as Address;

  let founder: Address;
  try {
    founder = await client.readContract({ address: passport, abi: passportAbi, functionName: "ownerOf", args: [tokenId] });
  } catch {
    return null; // ownerOf revierte si el token no existe
  }
  const [metadataURI, count] = await Promise.all([
    client.readContract({ address: passport, abi: passportAbi, functionName: "tokenURI", args: [tokenId] }),
    client.readContract({ address: milestones, abi: milestonesAbi, functionName: "milestoneCount", args: [tokenId] }),
  ]);

  const n = Number(count > 50n ? 50n : count); // tope defensivo
  const items = await Promise.all(
    Array.from({ length: n }, (_, i) =>
      client.readContract({
        address: milestones,
        abi: milestonesAbi,
        functionName: "getMilestone",
        args: [tokenId, BigInt(i)],
      }),
    ),
  );

  return {
    tokenId: tokenId.toString(),
    founder,
    metadataURI,
    milestones: items.map((m, id) => ({
      id,
      description: m.description,
      evidenceHash: m.evidenceHash,
      createdAt: Number(m.createdAt),
      verified: m.verifiedAt !== 0n && m.revokedAt === 0n,
      verifiedAt: m.verifiedAt !== 0n ? Number(m.verifiedAt) : null,
      revoked: m.revokedAt !== 0n,
      revokedAt: m.revokedAt !== 0n ? Number(m.revokedAt) : null,
      author: m.author,
    })),
  };
}
