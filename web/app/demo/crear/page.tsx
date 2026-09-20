"use client";

import { MintForm } from "@/components/MintForm";
import { Term } from "@/components/Term";

export default function DemoCreate() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:pt-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
        <div>
          <h1 className="display text-[38px] sm:text-[52px]">Crea el pasaporte de tu proyecto</h1>
          <p className="mt-5 max-w-[46ch] text-[17px] text-muted">
            Es el registro público de tu proyecto. Cada avance que sumes queda anotado <Term k="onchain" />, con la{" "}
            <Term k="hash" /> de tu evidencia, para que cualquiera pueda comprobarlo.
          </p>
        </div>
        <MintForm demo />
      </div>
    </main>
  );
}
