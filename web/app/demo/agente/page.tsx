"use client";

import { useState } from "react";
import { AgentResults } from "@/components/agent-results";
import { Mascot } from "@/components/Mascot";
import type { Mood } from "@/components/Mascot3D";
import { DEMO_DRAFTS, DEMO_MATCHES, DEMO_RESEARCH } from "@/lib/demo-data";

const MOODS: { key: Mood; label: string }[] = [
  { key: "idle", label: "Esperando" },
  { key: "thinking", label: "Pensando" },
  { key: "happy", label: "Feliz" },
];

export default function DemoAgent() {
  const [mood, setMood] = useState<Mood>("happy");
  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-5 pb-12 pt-8">
      <section className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-3">
          <h1 className="display text-[36px] sm:text-[46px]">Resultados del agente</h1>
          <p className="max-w-[56ch] text-muted">
            Así se ve lo que Boti entrega después de investigar una idea. Cambia su ánimo para ver todas sus poses.
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Ánimo de Boti">
            {MOODS.map((m) => (
              <button
                key={m.key}
                className={`btn btn-quiet ${mood === m.key ? "!bg-ink !text-paper" : ""}`}
                aria-pressed={mood === m.key}
                onClick={() => setMood(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <Mascot mood={mood} className="mx-auto h-[220px] w-full" />
      </section>

      <div className="space-y-10">
        <AgentResults research={DEMO_RESEARCH} matches={DEMO_MATCHES} drafts={DEMO_DRAFTS} createHref="/demo/crear" />
      </div>
    </main>
  );
}
