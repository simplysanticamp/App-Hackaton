"use client";

import { useState } from "react";

type StageEvent = { stage: string; data: unknown } | { error: string };

export default function Home() {
  const [idea, setIdea] = useState("");
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setEvents([]);
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
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (l.trim()) setEvents((prev) => [...prev, JSON.parse(l)]);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Bootstrap</h1>
      <p className="text-sm opacity-70">
        Convertimos ideas en proyectos financiables, certificados onchain.
      </p>
      <textarea
        className="w-full rounded border p-3 bg-transparent"
        rows={4}
        placeholder="Describe tu idea (mínimo 10 caracteres)"
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
      />
      <button
        className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
        disabled={loading || idea.trim().length < 10}
        onClick={run}
      >
        {loading ? "Investigando…" : "Investigar idea"}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <ul className="space-y-2">
        {events.map((ev, i) => (
          <li key={i} className="rounded border p-3 text-sm">
            <pre className="whitespace-pre-wrap">{JSON.stringify(ev, null, 2)}</pre>
          </li>
        ))}
      </ul>
    </main>
  );
}
