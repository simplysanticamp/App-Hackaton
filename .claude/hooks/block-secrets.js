// PreToolUse: bloquea acceso a .env y claves privadas. Exit 2 = bloquear.
let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  let input = {};
  try { input = JSON.parse(raw); } catch { process.exit(0); }
  const ti = input.tool_input || {};
  const target = String(ti.file_path || ti.command || "");
  const isEnv = /(^|[\\/\s])\.env(\.[\w-]+)?(\s|$|["'])/.test(target) && !/\.env\.example/.test(target);
  const isKey = /(PRIVATE_KEY\s*=|id_rsa|\.pem\b|keystore)/i.test(target);
  if (isEnv || isKey) {
    console.error("Bloqueado: acceso a secretos (.env / claves privadas) no permitido.");
    process.exit(2);
  }
  process.exit(0);
});
