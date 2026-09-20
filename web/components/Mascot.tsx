"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import type { Mood } from "./Mascot3D";

/** Plano B estático de Boti: se ve mientras carga el 3D, sin WebGL o con "reducir movimiento". */
export function MascotSvg() {
  return (
    <svg viewBox="0 0 200 250" className="h-full w-full" aria-hidden>
      <ellipse cx="100" cy="236" rx="62" ry="8" fill="#000" opacity=".14" />
      <ellipse cx="72" cy="216" rx="24" ry="16" fill="#a9662f" />
      <ellipse cx="72" cy="226" rx="26" ry="8" fill="#f3dcae" />
      <ellipse cx="128" cy="216" rx="24" ry="16" fill="#a9662f" />
      <ellipse cx="128" cy="226" rx="26" ry="8" fill="#f3dcae" />
      <ellipse cx="100" cy="128" rx="80" ry="88" fill="#5fcf80" />
      <ellipse cx="24" cy="146" rx="13" ry="24" fill="#5fcf80" transform="rotate(20 24 146)" />
      <ellipse cx="176" cy="146" rx="13" ry="24" fill="#5fcf80" transform="rotate(-20 176 146)" />
      <ellipse cx="70" cy="112" rx="19" ry="22" fill="#fff" />
      <ellipse cx="130" cy="112" rx="19" ry="22" fill="#fff" />
      <circle cx="72" cy="114" r="9" fill="#26211a" />
      <circle cx="128" cy="114" r="9" fill="#26211a" />
      <ellipse cx="46" cy="146" rx="12" ry="8" fill="#ff9aa8" />
      <ellipse cx="154" cy="146" rx="12" ry="8" fill="#ff9aa8" />
      <path d="M86 146 Q100 162 114 146" fill="none" stroke="#26211a" strokeWidth="4" strokeLinecap="round" />
      <rect x="97" y="26" width="6" height="26" rx="3" fill="#3a9c5a" />
      <ellipse cx="80" cy="26" rx="22" ry="10" fill="#9be59a" transform="rotate(-24 80 26)" />
      <ellipse cx="120" cy="26" rx="22" ry="10" fill="#9be59a" transform="rotate(24 120 26)" />
    </svg>
  );
}

const Mascot3D = dynamic(() => import("./Mascot3D"), { ssr: false, loading: () => <MascotSvg /> });

// WebGL se comprueba una sola vez por sesión (crear un canvas en cada render sería caro). En el servidor, false.
let cachedGl: boolean | null = null;
const hasWebGl = () => {
  if (cachedGl === null) {
    try {
      const c = document.createElement("canvas");
      cachedGl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      cachedGl = false;
    }
  }
  return cachedGl;
};
const noSubscribe = () => () => {};

const reducedQuery = "(prefers-reduced-motion: reduce)";
const prefersReduced = () => window.matchMedia(reducedQuery).matches;
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function Mascot({ mood = "idle", className = "" }: { mood?: Mood; className?: string }) {
  const webgl = useSyncExternalStore(noSubscribe, hasWebGl, () => false);
  const reduced = useSyncExternalStore(subscribeReduced, prefersReduced, () => false);
  return (
    <div className={className} role="img" aria-label="Boti, la mascota de Bootstrap: una semilla verde con botas">
      {webgl ? <Mascot3D mood={mood} still={reduced} /> : <MascotSvg />}
    </div>
  );
}
