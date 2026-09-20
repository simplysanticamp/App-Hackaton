// Datos de EJEMPLO para el modo demo (/demo). Nada de esto existe en la cadena ni en Supabase.
// Los hashes son reales (keccak256 del texto de cada evidencia) para poder probar el comparador del validador.
import type { Match, Draft, Research } from "@/components/agent-results";
import type { ApplicationView, MilestoneView } from "@/components/passport-view";
import type { Report } from "@/components/report-view";
import { hashEvidence } from "@/lib/evidence";

export const DEMO_ID = "7";
// Direcciones inventadas (prefijo DE00…): no pertenecen a nadie.
export const DEMO_FOUNDER = "0xDE00000000000000000000000000000000000001";
export const DEMO_VALIDATOR = "0xDE00000000000000000000000000000000000002";
export const DEMO_URI = "ipfs://bafyDEMOejemplo000000000000000000000000000000000000";
export const DEMO_SETTLE_TX = `0x${"de00".repeat(16)}`; // 64 hex inventados: no es una transacción real

/** Textos de evidencia de ejemplo: pégalos en el comparador del validador para ver una coincidencia. */
export const DEMO_EVIDENCE = [
  "Notas de 12 entrevistas con agricultores del Caribe (ejemplo)",
  "Prototipo navegable de la app de pedidos v0.1 (ejemplo)",
  "Carta de intención firmada por un restaurante piloto (ejemplo)",
  "Registro de 10 ventas del piloto (ejemplo)",
  "Informe de visita de campo redactado por el validador (ejemplo)",
] as const;

const DAY = 86_400;
const BASE = Date.UTC(2026, 7, 3) / 1000; // 3 de agosto de 2026

export const DEMO_MILESTONES: MilestoneView[] = [
  { id: 0, description: "Entrevistas con 12 agricultores del Caribe", evidenceHash: hashEvidence(DEMO_EVIDENCE[0]), createdAt: BASE, verifiedAt: BASE + 3 * DAY, revokedAt: null, author: DEMO_FOUNDER },
  { id: 1, description: "Prototipo navegable de la app de pedidos", evidenceHash: hashEvidence(DEMO_EVIDENCE[1]), createdAt: BASE + 9 * DAY, verifiedAt: BASE + 12 * DAY, revokedAt: null, author: DEMO_FOUNDER },
  { id: 2, description: "Carta de intención de un restaurante piloto", evidenceHash: hashEvidence(DEMO_EVIDENCE[2]), createdAt: BASE + 20 * DAY, verifiedAt: null, revokedAt: null, author: DEMO_FOUNDER },
  { id: 3, description: "Primeras 10 ventas registradas", evidenceHash: hashEvidence(DEMO_EVIDENCE[3]), createdAt: BASE + 27 * DAY, verifiedAt: BASE + 29 * DAY, revokedAt: BASE + 33 * DAY, author: DEMO_FOUNDER },
  { id: 4, description: "Visita de campo documentada por el validador", evidenceHash: hashEvidence(DEMO_EVIDENCE[4]), createdAt: BASE + 35 * DAY, verifiedAt: null, revokedAt: null, author: DEMO_VALIDATOR },
];

export const DEMO_APPLICATIONS: ApplicationView[] = [
  { opportunityName: "Convocatoria de ejemplo A", status: 3, recordedAt: BASE + 30 * DAY },
  { opportunityName: "Convocatoria de ejemplo B", status: 1, recordedAt: BASE + 36 * DAY },
  { opportunityName: "Convocatoria de ejemplo C", status: 4, recordedAt: BASE + 38 * DAY },
];

export function toReport(milestones: MilestoneView[]): Report {
  return {
    tokenId: DEMO_ID,
    milestoneTotal: milestones.length,
    founder: DEMO_FOUNDER,
    metadataURI: DEMO_URI,
    milestones: milestones.map((m) => ({
      ...m,
      verified: m.verifiedAt !== null && m.revokedAt === null,
      revoked: m.revokedAt !== null,
    })),
  };
}

const opp = (id: string, name: string, funder: string, type: string, region: string, focus: string): Match["opportunity"] => ({
  id, name, funder, type, region, focus, eligibility_summary: "", official_url: "https://example.com", is_demo: true,
});

export const DEMO_RESEARCH: Research = {
  summary:
    "Los pequeños agricultores del Caribe pierden margen por la cantidad de intermediarios. Ya existen apps de compra directa, pero pocas se enfocan en restaurantes medianos, que compran con frecuencia y en volúmenes previsibles.\n\nRiesgos principales: la logística de frío, la confianza entre las partes y la conectividad en zonas rurales. (Texto de ejemplo del modo demo.)",
  sources: [
    { title: "Fuente de ejemplo 1: informe del sector agro", url: "https://example.com/agro" },
    { title: "Fuente de ejemplo 2: competidores de compra directa", url: "https://example.com/competencia" },
  ],
  premiumSourceUsed: false,
  disclaimer: "Estimación generada por IA, no garantía de elegibilidad. Verifica siempre en el link oficial.",
};

export const DEMO_MATCHES: Match[] = [
  { id: "demo-a", fit_score: 82, rationale: "El enfoque en cadenas cortas de comercialización encaja con tu propuesta de venta directa.", gaps: ["Un piloto con al menos un cliente real", "Presupuesto detallado"], opportunity: opp("demo-a", "Convocatoria de ejemplo A", "Entidad de ejemplo", "premio", "Colombia", "Agro y comercio justo") },
  { id: "demo-b", fit_score: 64, rationale: "Buen encaje regional, pero pide un equipo técnico más completo.", gaps: ["Un cofundador técnico"], opportunity: opp("demo-b", "Convocatoria de ejemplo B", "Aceleradora de ejemplo", "aceleradora", "Latinoamérica", "Tecnología para el campo") },
  { id: "demo-c", fit_score: 38, rationale: "Encaje parcial: prioriza proyectos con ventas ya recurrentes.", gaps: ["Ventas recurrentes", "Empresa constituida"], opportunity: opp("demo-c", "Convocatoria de ejemplo C", "Fondo de ejemplo", "grant", "Colombia", "Emprendimiento rural") },
];

export const DEMO_DRAFTS: Draft[] = [
  {
    opportunity_id: "demo-a",
    mvp: "App móvil sencilla para que el agricultor publique su cosecha y un restaurante haga el pedido. Piloto con 3 fincas y 2 restaurantes.",
    budget: [
      { item: "Desarrollo del prototipo", amount_usd: 4000 },
      { item: "Piloto en campo (transporte y logística)", amount_usd: 1800 },
      { item: "Capacitación a agricultores", amount_usd: 700 },
    ],
    pitch: "Conectamos a agricultores del Caribe con restaurantes para que vendan directo, sin intermediarios, y ganen más por cada cosecha. (Borrador de ejemplo.)",
  },
  {
    opportunity_id: "demo-b",
    mvp: "Versión web con catálogo de productos y pedidos recurrentes semanales.",
    budget: [
      { item: "Desarrollo web", amount_usd: 3200 },
      { item: "Marketing inicial", amount_usd: 900 },
    ],
    pitch: "Una plataforma que hace predecible la compra de productos frescos para restaurantes y predecible el ingreso para el agricultor. (Borrador de ejemplo.)",
  },
];
