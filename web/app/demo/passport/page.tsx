"use client";

// Pasaporte de ejemplo: los mismos componentes que la vista real, con estado local en vez de cadena.
import { useState } from "react";
import { AddApplication, AddMilestone, EvidenceCheck } from "@/components/passport-forms";
import { ApplicationList, MilestoneList, PassportHeader, type ApplicationView, type MilestoneView } from "@/components/passport-view";
import { Term } from "@/components/Term";
import {
  DEMO_APPLICATIONS, DEMO_EVIDENCE, DEMO_FOUNDER, DEMO_ID, DEMO_MILESTONES, DEMO_URI, DEMO_VALIDATOR,
} from "@/lib/demo-data";

type Role = "visitor" | "founder" | "validator";
const ROLES: { key: Role; label: string; hint: string }[] = [
  { key: "visitor", label: "Visitante", hint: "Cualquier persona: solo puede leer." },
  { key: "founder", label: "Creador del proyecto", hint: "Conecta la billetera con la que creó el pasaporte: puede sumar avances y aplicaciones." },
  { key: "validator", label: "Validador", hint: "Tiene el rol de validador: puede verificar y anular verificaciones, salvo en avances que él mismo anotó." },
];

const nowSec = () => Math.floor(Date.now() / 1000);

export default function DemoPassport() {
  const [role, setRole] = useState<Role>("visitor");
  const [milestones, setMilestones] = useState<MilestoneView[]>(DEMO_MILESTONES);
  const [apps, setApps] = useState<ApplicationView[]>(DEMO_APPLICATIONS);

  const verifiedCount = milestones.filter((m) => m.verifiedAt !== null && m.revokedAt === null).length;
  const current = ROLES.find((r) => r.key === role)!;

  const patch = (id: number, change: Partial<MilestoneView>) =>
    setMilestones((list) => list.map((m) => (m.id === id ? { ...m, ...change } : m)));

  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-5 pb-16 pt-8">
      <section className="card-flat space-y-3" aria-label="Elegir rol">
        <p className="label">Mira esta pantalla como…</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Rol">
          {ROLES.map((r) => (
            <button
              key={r.key}
              className={`btn btn-quiet ${role === r.key ? "!bg-ink !text-paper" : ""}`}
              aria-pressed={role === r.key}
              onClick={() => setRole(r.key)}
            >
              {r.label}
            </button>
          ))}
          <button
            className="btn btn-quiet ml-auto"
            onClick={() => { setMilestones(DEMO_MILESTONES); setApps(DEMO_APPLICATIONS); }}
          >
            Restablecer ejemplo
          </button>
        </div>
        <p className="text-[14.5px] text-muted">{current.hint}</p>
      </section>

      <PassportHeader
        id={DEMO_ID}
        founder={DEMO_FOUNDER}
        uri={DEMO_URI}
        total={milestones.length}
        verified={verifiedCount}
        reportHref="/demo/reporte"
      />

      {role === "validator" && (
        <section className="card space-y-4">
          <div>
            <p className="label !text-verified">Modo validador</p>
            <p className="text-[13px] text-muted">
              Tu billetera tiene el rol de <Term k="validador" />. Verifica solo después de comparar la evidencia con su{" "}
              <Term k="hash" />. No puedes verificar un avance que tú mismo anotaste, y anular una verificación es
              definitivo: el historial conserva que fue verificado y luego invalidado.
            </p>
          </div>
          <EvidenceCheck hashes={milestones.map((m) => m.evidenceHash as `0x${string}`)} samples={DEMO_EVIDENCE} />
        </section>
      )}

      <MilestoneList
        milestones={milestones}
        founder={DEMO_FOUNDER}
        actions={(m) => {
          if (role !== "validator" || m.revokedAt !== null) return null;
          const own = m.author.toLowerCase() === DEMO_VALIDATOR.toLowerCase();
          return m.verifiedAt === null ? (
            <button
              className="btn btn-quiet"
              disabled={own}
              title={own ? "No puedes verificar un hito que tú registraste" : undefined}
              onClick={() => patch(m.id, { verifiedAt: nowSec() })}
            >
              Verificar
            </button>
          ) : (
            <button
              className="btn btn-quiet"
              onClick={() => {
                if (window.confirm("La revocación es definitiva. ¿Revocar la verificación de este hito?")) patch(m.id, { revokedAt: nowSec() });
              }}
            >
              Revocar
            </button>
          );
        }}
      />

      <ApplicationList applications={apps} />

      {role === "founder" ? (
        <div className="space-y-12">
          <AddMilestone
            tokenId={BigInt(DEMO_ID)}
            onDone={() => {}}
            demo={({ description, evidenceHash }) =>
              setMilestones((list) => [
                ...list,
                { id: list.length, description, evidenceHash, createdAt: nowSec(), verifiedAt: null, revokedAt: null, author: DEMO_FOUNDER },
              ])
            }
          />
          <AddApplication
            tokenId={BigInt(DEMO_ID)}
            onDone={() => {}}
            demo={({ name, status }) => setApps((list) => [...list, { opportunityName: name, status, recordedAt: nowSec() }])}
          />
        </div>
      ) : (
        <p className="border-t border-rule pt-4 text-[13px] text-muted">
          Si este es tu proyecto, conecta la billetera con la que lo creaste para sumar avances.
        </p>
      )}
    </main>
  );
}
