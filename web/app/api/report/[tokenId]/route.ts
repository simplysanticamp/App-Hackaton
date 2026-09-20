// Caso 2 de x402: un financiador paga un micropago para desbloquear el reporte de verificación
// de un Passport, sin login. withX402 solo liquida el pago si la respuesta es < 400.
import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { resourceServer, X402_NETWORK } from "@/lib/x402-server";
import { checkLimit, clientIp } from "@/lib/rate-limit";
import { chainConfigured, getPassportReport } from "@/lib/chain";

const handler = async (request: NextRequest): Promise<NextResponse> => {
  const tokenId = request.nextUrl.pathname.split("/").pop() ?? "";
  if (!/^\d{1,20}$/.test(tokenId)) {
    return NextResponse.json({ error: "tokenId inválido" }, { status: 400 });
  }
  try {
    const report = await getPassportReport(BigInt(tokenId));
    if (!report) return NextResponse.json({ error: "Passport no encontrado" }, { status: 404 }); // 404: no se liquida el pago
    // Los datos son públicos onchain: el pago es por conveniencia (lectura agregada), no por confidencialidad.
    return NextResponse.json({ is_demo: false, report });
  } catch (e) {
    console.error("report_chain_read_failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo leer la cadena" }, { status: 502 });
  }
};

let paid: ((req: NextRequest) => Promise<Response>) | null = null;

export async function GET(request: NextRequest) {
  if (!/^\d{1,20}$/.test(request.nextUrl.pathname.split("/").pop() ?? "")) {
    return NextResponse.json({ error: "tokenId inválido" }, { status: 400 });
  }
  // 503 ANTES del paywall: withX402 solo liquida en respuestas < 400, pero ni siquiera pedimos firma si no hay nada real que vender.
  if (!chainConfigured()) {
    return NextResponse.json({ error: "Reportes no disponibles: contratos no configurados" }, { status: 503 });
  }
  const payTo = process.env.X402_PAY_TO;
  if (!payTo || !/^0x[0-9a-fA-F]{40}$/.test(payTo)) {
    return NextResponse.json({ error: "Pagos no configurados (X402_PAY_TO)" }, { status: 503 });
  }
  const limit = checkLimit(`report:${clientIp(request)}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  paid ??= withX402(
    handler,
    {
      "/api/report/[tokenId]": {
        accepts: {
          scheme: "exact",
          price: process.env.X402_REPORT_PRICE ?? "$0.01",
          network: X402_NETWORK,
          payTo,
        },
        description: "Reporte de verificación de un Project Passport",
      },
    },
    resourceServer(),
  ) as (req: NextRequest) => Promise<Response>;
  return paid(request);
}
