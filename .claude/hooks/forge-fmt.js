// PostToolUse: formatea archivos .sol editados con `forge fmt`.
const { spawnSync } = require("child_process");
let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  let input = {};
  try { input = JSON.parse(raw); } catch { process.exit(0); }
  const file = String((input.tool_input || {}).file_path || "");
  if (file.endsWith(".sol")) {
    spawnSync("forge", ["fmt", file], { stdio: "ignore", shell: true });
  }
  process.exit(0);
});
