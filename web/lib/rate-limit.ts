// Rate limiting en memoria (ventana fija). Protege la API key del LLM.
// Limitación: no sustituye un tope de gasto duro en el panel del proveedor del LLM. En serverless cada instancia tiene su propio contador, así que el límite real es
// aproximado. Para límites estrictos, persistir contadores en Supabase/Redis.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function checkLimit(key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();

  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    if (buckets.size > 5000) buckets.clear(); // último recurso contra crecimiento sin límite
  }

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true };
}

/**
 * IP del cliente. Solo se confía en cabeceras que fija la plataforma:
 * - Vercel sobrescribe x-vercel-forwarded-for (no falsificable por el cliente).
 * - Fuera de Vercel, x-real-ip / x-forwarded-for solo si TRUST_PROXY_HEADERS=1 (proxy propio que las sobrescribe).
 * Si no, todos comparten el bucket "unknown" (fail-closed: el límite se vuelve global, no evadible).
 */
export function clientIp(request: Request): string {
  const h = request.headers;
  if (process.env.VERCEL) {
    const v = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
    if (v) return v;
  }
  if (process.env.TRUST_PROXY_HEADERS === "1") {
    const v = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (v) return v;
  }
  return "unknown";
}

function refund(key: string) {
  const b = buckets.get(key);
  if (b && b.count > 0) b.count--;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

/** Límites del agente: por IP por hora, presupuesto global diario y una ejecución concurrente por IP. */
export function checkAgentLimits(ip: string): LimitResult {
  const ipKey = `agent:ip:${ip}`;
  const perIp = checkLimit(ipKey, num(process.env.AGENT_RATE_PER_IP_HOUR, 5), HOUR);
  if (!perIp.ok) return perIp;
  const global = checkLimit("agent:global", num(process.env.AGENT_RATE_GLOBAL_DAY, 200), DAY);
  if (!global.ok) refund(ipKey); // el rechazo global no debe consumir cupo por IP
  return global;
}

const running = new Set<string>();
export function acquireSlot(ip: string): boolean {
  if (running.has(ip)) return false;
  running.add(ip);
  return true;
}
export function releaseSlot(ip: string) {
  running.delete(ip);
}
