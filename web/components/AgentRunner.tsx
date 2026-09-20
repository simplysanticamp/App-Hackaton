"use client";

import { useEffect, useState } from "react";
import type { Mood } from "./Mascot3D";
import { AgentResults, type Draft, type Match, type Research } from "./agent-results";

const ERRORS: Record<string, string> = {
  not_configured: "Boti todavía no está configurado en este servidor.",
  refusal: "El modelo se negó a responder esa idea. Prueba a reformularla.",
  bad_output: "Boti se confundió con la respuesta. Intenta de nuevo.",
  upstream: "Falló un servicio externo. Intenta de nuevo en un momento.",
};

const STEPS = [
  { key: "research", label: "Investigar el mercado" },
  { key: "matching", label: "Buscar convocatorias" },
  { key: "pitch", label: "Escribir borradores" },
] as const;

export function AgentRunner({ onMood }: { onMood?: (m: Mood) => void }) {
  const [idea, setIdea] = useState("");
  const [research, setResearch] = useState<Research | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = stage !== null;
  const started = loading || !!research || !!error;

  useEffect(() => {
    onMood?.(loading ? "thinking" : drafts ? "happy" : "idle");
  }, [loading, drafts, onMood]);

  async function run() {
    setStage("research");
    setError(null);
    setResearch(null);
    setMatches(null);
    setDrafts(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Error del agente");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const handle = (line: string) => {
        const ev = JSON.parse(line);
        if (ev.error) throw new Error(ERRORS[ev.error] ?? "Error del agente");
        if (ev.stage === "research") { setResearch(ev.data); setStage("matching"); }
        if (ev.stage === "matching") { setMatches(ev.data.matches); setStage("pitch"); }
        if (ev.stage === "pitch") setDrafts(ev.data.drafts);
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        lines.filter((l) => l.trim()).forEach(handle);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setStage(null);
    }
  }

  const done = { research: !!research, matching: !!matches, pitch: !!drafts };

  return (
    <div className="space-y-10">
      <section aria-label="Tu idea" className="card space-y-3">
        <label htmlFor="idea" className="display block text-[26px]">Cuéntale tu idea a Boti</label>
        <p className="text-muted">
          Con tus palabras: qué problema resuelve y para quién. Mientras más claro, mejores convocatorias encuentra.
        </p>
        <textarea
          id="idea"
          className="field"
          rows={5}
          maxLength={2000}
          placeholder="Ej.: Una app para que pequeños agricultores del Caribe vendan directo a restaurantes…"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="mono text-muted">{idea.length}/2000 · mínimo 10 caracteres</span>
          <button className="btn" disabled={loading || idea.trim().length < 10} onClick={run}>
            {loading ? "Boti está investigando…" : "Que Boti investigue"}
          </button>
        </div>
        {error && <p role="alert" className="notice notice-error">{error}</p>}
      </section>

      {started && (
        <ol aria-label="Progreso" className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => {
            const isDone = done[s.key];
            const active = stage === s.key;
            return (
              <li key={s.key} className={`card-flat flex items-center gap-3 !py-3 ${isDone ? "" : active ? "" : "opacity-60"}`}>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink text-[14px] font-bold ${
                    isDone ? "bg-leaf text-[#26211a]" : active ? "bg-sun text-[#26211a] working" : "bg-paper-2"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </span>
                <span className="font-semibold">{s.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      <AgentResults research={research} matches={matches} drafts={drafts} loading={loading} />
    </div>
  );
}
