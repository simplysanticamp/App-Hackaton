"use client";

import { useState } from "react";
import { ReportBody, ReportHeader } from "@/components/report-view";
import { DEMO_ID, DEMO_MILESTONES, DEMO_SETTLE_TX, toReport } from "@/lib/demo-data";

export default function DemoReport() {
  const [step, setStep] = useState<"connect" | "pay" | "paid">("connect");
  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-5 pb-16 pt-8">
      <ReportHeader id={DEMO_ID} passportHref="/demo/passport" />

      {step !== "paid" ? (
        <section className="space-y-4">
          <ol className="flex flex-wrap gap-2 text-[14px]" aria-label="Pasos">
            {[
              { k: "connect", t: "1. Conectar billetera" },
              { k: "pay", t: "2. Pagar el micropago" },
            ].map((s) => (
              <li key={s.k} className={`rounded-full border-2 border-ink px-3 py-0.5 font-semibold ${step === s.k ? "bg-sun text-[#26211a]" : "opacity-60"}`}>
                {s.t}
              </li>
            ))}
          </ol>
          {step === "connect" ? (
            <div className="card-flat flex flex-wrap items-center gap-4">
              <p className="text-muted">Conecta la billetera con la que vas a pagar. (Simulado en la demo.)</p>
              <button className="btn" onClick={() => setStep("pay")}>Conectar billetera</button>
            </div>
          ) : (
            <div className="card-flat space-y-2">
              <p className="text-muted">
                Pagas desde <span className="mono">0xDE00…0003</span>. En la app real necesitas USDC de prueba en Base
                Sepolia; lo apruebas con una firma, sin pagar comisión de red, y un facilitador lo liquida.
              </p>
              <button className="btn" onClick={() => setStep("paid")}>Pagar USD 0.01 y ver el reporte</button>
            </div>
          )}
        </section>
      ) : (
        <>
          <ReportBody report={toReport(DEMO_MILESTONES)} settleTx={DEMO_SETTLE_TX} />
          <button className="btn btn-quiet" onClick={() => setStep("connect")}>Volver al paso de pago</button>
        </>
      )}
    </main>
  );
}
