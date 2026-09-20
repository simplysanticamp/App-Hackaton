// Pinea en IPFS el JSON de metadata de un Passport y devuelve `ipfs://<cid>`.
// El JWT de Pinata vive solo en el servidor (PINATA_JWT). El contrato exige ipfs:// para que el CID
// fije el contenido: nadie puede reescribir nombre o descripción después de que un financiador los revise.
import { z } from "zod";
import { checkLimit, clientIp } from "@/lib/rate-limit";

const BodySchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(1000),
  category: z.string().trim().min(2).max(50),
});

export async function POST(request: Request) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return Response.json({ error: "Pinning no configurado (falta PINATA_JWT)" }, { status: 503 });
  }
  const limit = checkLimit(`pin:${clientIp(request)}`, 5, 60_000);
  if (!limit.ok) {
    return Response.json(
      { error: "Demasiadas solicitudes, intenta más tarde" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Nombre (3-100), descripción (10-1000) y categoría (2-50) son obligatorios" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({
        pinataContent: { ...parsed.data, schema: "bootstrap-passport/v1" },
        pinataMetadata: { name: `passport-${parsed.data.name}`.slice(0, 80) },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => null)) as { IpfsHash?: string } | null;
    const cid = json?.IpfsHash;
    if (!res.ok || !cid || !/^[A-Za-z0-9]{20,100}$/.test(cid)) {
      console.error("pin_failed", res.status);
      return Response.json({ error: "No se pudo pinear la metadata" }, { status: 502 });
    }
    return Response.json({ uri: `ipfs://${cid}` });
  } catch (e) {
    console.error("pin_failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "No se pudo pinear la metadata" }, { status: 502 });
  }
}
