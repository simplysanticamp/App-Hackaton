// Orquestador del agente. El frontend NUNCA llama al LLM: todo pasa por aquí.
// Responde por etapas (NDJSON en streaming) para no chocar con el límite de duración de Vercel.
import { runMatching, runPitch, runResearch } from "@/lib/agent/pipeline";
import { AgentError } from "@/lib/agent/types";
import { acquireSlot, checkAgentLimits, clientIp, releaseSlot } from "@/lib/rate-limit";

export const maxDuration = 60;

const encoder = new TextEncoder();
const send = (obj: unknown) => encoder.encode(JSON.stringify(obj) + "\n");

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const idea = typeof body?.idea === "string" ? body.idea.trim() : "";
  if (idea.length < 10 || idea.length > 2000) {
    return Response.json({ error: "idea debe tener entre 10 y 2000 caracteres" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "El agente no está configurado (falta ANTHROPIC_API_KEY)" }, { status: 503 });
  }

  const ip = clientIp(request);
  if (!acquireSlot(ip)) {
    return Response.json({ error: "Ya tienes una ejecución en curso" }, { status: 429 });
  }
  const limit = checkAgentLimits(ip);
  if (!limit.ok) {
    releaseSlot(ip);
    return Response.json(
      { error: "Demasiadas solicitudes, intenta más tarde" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const research = await runResearch(idea);
        controller.enqueue(send({ stage: "research", data: research }));

        const matching = await runMatching(idea, research.summary);
        controller.enqueue(send({ stage: "matching", data: matching }));

        const pitch = await runPitch(idea, research.summary, matching.matches);
        controller.enqueue(send({ stage: "pitch", data: pitch }));
      } catch (e) {
        const code = e instanceof AgentError ? e.code : "upstream";
        console.error("agent_failed", code, e instanceof Error ? e.message : e);
        controller.enqueue(send({ error: code }));
      } finally {
        releaseSlot(ip);
        controller.close();
      }
    },
    cancel() {
      releaseSlot(ip);
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
