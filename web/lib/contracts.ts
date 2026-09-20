// Direcciones y ABIs (mínimos) para el frontend. Las direcciones son públicas: van en NEXT_PUBLIC_*.
// Solo el frontend (wallet del usuario) escribe en los contratos; el agente nunca firma.
import { keccak256, parseAbi, toBytes, type Address } from "viem";

const addr = (v: string | undefined): Address | undefined =>
  v && /^0x[0-9a-fA-F]{40}$/.test(v) ? (v as Address) : undefined;

export const passportAddress = addr(process.env.NEXT_PUBLIC_PASSPORT_ADDRESS);
export const milestonesAddress = addr(process.env.NEXT_PUBLIC_MILESTONES_ADDRESS);
export const fundingRegistryAddress = addr(process.env.NEXT_PUBLIC_FUNDING_REGISTRY_ADDRESS);

export const passportAbi = parseAbi([
  "function mintPassport(address founder, string metadataURI) returns (uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "event PassportMinted(uint256 indexed tokenId, address indexed founder, string metadataURI)",
]);

export const milestonesAbi = parseAbi([
  "struct Milestone { string description; bytes32 evidenceHash; uint64 createdAt; uint64 verifiedAt; uint64 revokedAt; address author; }",
  "function addMilestone(uint256 tokenId, string description, bytes32 evidenceHash) returns (uint256 milestoneId)",
  "function getMilestones(uint256 tokenId) view returns (Milestone[])",
  "function verifyMilestone(uint256 tokenId, uint256 milestoneId)",
  "function revokeVerification(uint256 tokenId, uint256 milestoneId)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
]);

export const fundingRegistryAbi = parseAbi([
  "struct Application { string opportunityName; uint8 status; uint64 recordedAt; address author; }",
  "function getApplications(uint256 tokenId) view returns (Application[])",
  "function recordFundingApplication(uint256 tokenId, string opportunityName, uint8 status) returns (uint256 applicationId)",
]);

export const APPLICATION_STATUS = ["Pendiente", "Enviada", "En revisión", "Aceptada", "Rechazada"] as const;

export const contractsConfigured = !!(passportAddress && milestonesAddress);

export const VALIDATOR_ROLE = keccak256(toBytes("VALIDATOR_ROLE"));
