// Comprueba que Supabase responde con la config actual. No imprime claves.
// Uso (desde web/):  node --env-file=.env.local scripts/check-supabase.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
console.log("SUPABASE_URL:", url ? "definida" : "FALTA");
console.log("clave:", key ? "definida" : "FALTA (SUPABASE_PUBLISHABLE_KEY)");
if (!url || !key) process.exit(1);

const { data, error } = await createClient(url, key, { auth: { persistSession: false } })
  .from("opportunities")
  .select("id,name,is_demo")
  .limit(200);

if (error) {
  console.error("ERROR de Supabase:", error.message);
  console.error("Causas comunes: tabla sin crear, politica RLS sin crear, URL o clave equivocada.");
  process.exit(1);
}
console.log(`OK: ${data.length} filas (${data.filter((r) => !r.is_demo).length} reales, ${data.filter((r) => r.is_demo).length} demo)`);
if (data.length === 0) console.log("Tabla vacia: el agente usara las 3 filas DEMO locales.");
// Muestra los caracteres no ASCII como \uXXXX: la consola de Windows dibuja mal los acentos aunque el dato esté bien.
const esc = (t) => t.replace(/[^\x00-\x7f]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
for (const r of data) console.log(`- ${r.is_demo ? "[DEMO]" : "[REAL]"} ${esc(r.name)}`);
