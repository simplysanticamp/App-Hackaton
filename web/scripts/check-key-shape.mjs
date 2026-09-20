// Diagnostica el FORMATO de AGENT_WALLET_PRIVATE_KEY sin imprimir la clave.
// Uso (desde web/):  node --env-file=.env.local scripts/check-key-shape.mjs
const k = process.env.AGENT_WALLET_PRIVATE_KEY;
if (k === undefined) {
  console.log("La variable NO existe. Revisa que la linea empiece exactamente con AGENT_WALLET_PRIVATE_KEY= (mayusculas y guiones bajos).");
  process.exit(1);
}
const body = k.replace(/^0x/, "");
console.log("largo total:", k.length, "(debe ser 66)");
console.log("empieza con 0x:", k.startsWith("0x"));
console.log("largo sin 0x:", body.length, "(debe ser 64)");
console.log("tiene comillas:", k.includes('"') || k.includes("'"));
console.log("tiene espacios u otros blancos:", /\s/.test(k));
console.log("todo son caracteres hex (0-9, a-f):", /^[0-9a-fA-F]*$/.test(body));
// Pistas de errores comunes (sin mostrar la clave):
console.log("empieza con 0X en mayuscula:", k.startsWith("0X"));
console.log("empieza con < o termina con >:", k.startsWith("<") || k.endsWith(">"));
console.log("cantidad de caracteres que no son hex:", [...body].filter((c) => !/[0-9a-fA-F]/.test(c)).length);
console.log("clases de los 2 primeros y 2 ultimos:", [k.slice(0, 2), k.slice(-2)].map((s) => [...s].map((c) => (/[0-9]/.test(c) ? "digito" : /[a-f]/.test(c) ? "hex-min" : /[A-F]/.test(c) ? "hex-MAY" : `otro(${c === "<" || c === ">" || c === "X" || c === "o" || c === "O" ? c : "?"})`)).join("+")).join(" ... "));
