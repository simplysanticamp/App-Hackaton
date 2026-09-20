import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AgentError } from "./types";

export const MODEL = process.env.LLM_MODEL ?? "claude-opus-5";

let _client: Anthropic | null = null;
function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AgentError("not_configured", "ANTHROPIC_API_KEY no configurada");
  }
  return (_client ??= new Anthropic());
}

function textOf(content: Anthropic.ContentBlock[]) {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Llamada con salida JSON validada contra un schema zod. */
export async function generateJson<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 8000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: z.toJSONSchema(opts.schema) },
    },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  if (res.stop_reason === "refusal") throw new AgentError("refusal", "El modelo rechazó la solicitud");
  if (res.stop_reason === "max_tokens") throw new AgentError("bad_output", "Respuesta truncada");
  try {
    return opts.schema.parse(JSON.parse(textOf(res.content)));
  } catch {
    throw new AgentError("bad_output", "El modelo devolvió JSON inválido");
  }
}

export type Source = { title: string; url: string };

/** Research con web search del servidor. Las fuentes salen de los resultados reales de búsqueda, no del texto del modelo. */
export async function researchWithSearch(opts: {
  system: string;
  user: string;
}): Promise<{ text: string; sources: Source[] }> {
  const c = client();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: opts.user }];
  const sources = new Map<string, Source>();
  let text = "";

  for (let turn = 0; turn < 4; turn++) {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: opts.system,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
      messages,
    });
    if (res.stop_reason === "refusal") throw new AgentError("refusal", "El modelo rechazó la solicitud");

    for (const block of res.content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) {
          if (r.type === "web_search_result") sources.set(r.url, { title: r.title, url: r.url });
        }
      }
    }
    text = textOf(res.content) || text;

    if (res.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: res.content });
  }
  if (!text) throw new AgentError("bad_output", "Research vacío");
  return { text, sources: [...sources.values()].slice(0, 8) };
}
