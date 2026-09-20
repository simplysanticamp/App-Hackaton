// Comprueba ANTHROPIC_API_KEY con una llamada mínima (unos pocos tokens). No imprime la clave.
// Usa el mismo modelo que el agente (LLM_MODEL o claude-opus-5).
// Uso (desde web/):  node --env-file=.env.local scripts/check-anthropic.mjs
const key = process.env.ANTHROPIC_API_KEY;
const model = process.env.LLM_MODEL ?? "claude-opus-5";
if (!key) {
  console.log("FALTA ANTHROPIC_API_KEY en .env.local");
  process.exit(1);
}
console.log("formato: empieza por sk-ant-:", key.startsWith("sk-ant-"), "| largo:", key.length, "| espacios o comillas:", /[\s"']/.test(key));
console.log("modelo:", model);

let res;
for (let i = 1; i <= 4 && !res; i++) {
  res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 16, messages: [{ role: "user", content: "Responde solo: ok" }] }),
    signal: AbortSignal.timeout(30_000),
  }).catch(async (e) => {
    console.log(`Intento ${i}/4: no se pudo conectar (${e.cause?.code ?? e.message})`);
    await new Promise((r) => setTimeout(r, 2000));
  });
}
if (!res) {
  console.log("Sin conexión con Anthropic tras 4 intentos: revisa tu red o VPN.");
  process.exit(1);
}
const json = await res.json().catch(() => null);
if (res.ok) {
  console.log("HTTP 200 -> CLAVE VÁLIDA. Respuesta del modelo:", JSON.stringify(json.content?.[0]?.text));
  console.log("tokens usados:", json.usage?.input_tokens, "entrada /", json.usage?.output_tokens, "salida");
  process.exit(0);
}
console.log("HTTP", res.status, "->", json?.error?.type, "-", json?.error?.message);
process.exit(1);
