// Guardarraíles de pago del agente (x402/MPP). Nunca custodia abierta de fondos.
// Ojo: el contador diario es en memoria (se pierde entre instancias serverless).
// Para producción, persistirlo en Supabase.

const MAX_PER_TX_USD = Number(process.env.AGENT_MAX_PER_TX_USD ?? "0.05");
const MAX_PER_DAY_USD = Number(process.env.AGENT_MAX_PER_DAY_USD ?? "0.5");
const ALLOWED_PAYEES = (process.env.AGENT_ALLOWED_PAYEES ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

let day = "";
let spentToday = 0;

export class PaymentDenied extends Error {}

export function assertPaymentAllowed(amountUsd: number, payee: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    spentToday = 0;
  }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) throw new PaymentDenied("monto inválido");
  if (amountUsd > MAX_PER_TX_USD) throw new PaymentDenied("supera el cap por transacción");
  if (spentToday + amountUsd > MAX_PER_DAY_USD) throw new PaymentDenied("supera el límite diario");
  if (!ALLOWED_PAYEES.includes(payee.toLowerCase())) throw new PaymentDenied("payee fuera del allowlist");
  spentToday += amountUsd;
}
