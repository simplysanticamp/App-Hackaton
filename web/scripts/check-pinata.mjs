// Comprueba que PINATA_JWT es válido, sin imprimir el token.
// Uso (desde web/):  node --env-file=.env.local scripts/check-pinata.mjs
const jwt = process.env.PINATA_JWT;
if (!jwt) {
  console.log("FALTA PINATA_JWT en .env.local");
  process.exit(1);
}
console.log("largo del JWT:", jwt.length, "| empieza por eyJ:", jwt.startsWith("eyJ"), "| tiene espacios o comillas:", /[\s"']/.test(jwt));

// Reintenta: el DNS de algunas redes falla de forma intermitente (ENOTFOUND) y luego vuelve.
let res;
for (let i = 1; i <= 4 && !res; i++) {
  res = await fetch("https://api.pinata.cloud/data/testAuthentication", {
    headers: { Authorization: `Bearer ${jwt}` },
    signal: AbortSignal.timeout(15_000),
  }).catch(async (e) => {
    console.log(`Intento ${i}/4: no se pudo conectar (${e.cause?.code ?? e.message})`);
    await new Promise((r) => setTimeout(r, 2000));
  });
}
if (!res) {
  console.log("Sin conexión con Pinata tras 4 intentos: revisa tu red o VPN.");
  process.exit(1);
}
const body = await res.text();
console.log("HTTP", res.status, res.ok ? "-> JWT VÁLIDO" : `-> ${body.slice(0, 200)}`);
process.exit(res.ok ? 0 : 1);
