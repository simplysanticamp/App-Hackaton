// SessionStart: inyecta SESSION.md al contexto para retomar rápido.
const fs = require("fs");
try {
  const s = fs.readFileSync("SESSION.md", "utf8");
  console.log("## Estado de sesión previo (SESSION.md)\n" + s);
} catch {
  console.log("SESSION.md no existe todavía.");
}
