// Caso 1 de x402 (agent-pays-for-data): fuente premium de DEMO que el agente paga por llamada.
// Es un endpoint propio y sus datos son de demostración, no una fuente real de terceros: se etiquetan así
// en la respuesta. La roadmap real es sustituir PREMIUM_SOURCE_URL por un proveedor externo de pago.
import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { resourceServer, X402_NETWORK } from "@/lib/x402-server";
import { checkLimit, clientIp } from "@/lib/rate-limit";

const handler = async (): Promise<NextResponse> =>
  NextResponse.json({
    is_demo: true,
    label: "DEMO: contenido de ejemplo servido por Bootstrap para demostrar el pago x402; no es una fuente real.",
    topic: "Contexto de financiación no dilutiva para proyectos tecnológicos en Latinoamérica",
    notes: [
      "Las convocatorias de aceleración suelen pedir un MVP o prototipo demostrable, no solo una idea.",
      "Los programas web3 valoran evidencia pública verificable: repositorio activo, despliegues y hitos con fecha.",
      "Los fondos públicos suelen exigir persona jurídica constituida; los privados y web3 a veces aceptan personas naturales.",
      "Los requisitos y fechas cambian: hay que confirmarlos siempre en el enlace oficial de cada convocatoria.",
    ],
  });

let paid: ((req: NextRequest) => Promise<Response>) | null = null;

export async function GET(request: NextRequest) {
  const payTo = process.env.X402_PAY_TO;
  if (!payTo || !/^0x[0-9a-fA-F]{40}$/.test(payTo)) {
    return NextResponse.json({ error: "Pagos no configurados (X402_PAY_TO)" }, { status: 503 });
  }
  const limit = checkLimit(`premium:${clientIp(request)}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  paid ??= withX402(
    handler,
    {
      "/api/premium/market": {
        accepts: {
          scheme: "exact",
          price: process.env.X402_PREMIUM_PRICE ?? "$0.005",
          network: X402_NETWORK,
          payTo,
        },
        description: "Fuente premium de demo: contexto de financiación (etiquetada como demo)",
      },
    },
    resourceServer(),
  ) as (req: NextRequest) => Promise<Response>;
  return paid(request);
}
