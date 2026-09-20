import type { ReactNode } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";

/**
 * Palabra técnica con su explicación al pasar el cursor o al tocarla/enfocarla con teclado.
 * Es CSS puro (sin estado), así que funciona también en componentes de servidor.
 */
export function Term({ k, children }: { k: GlossaryKey; children?: ReactNode }) {
  const t = GLOSSARY[k];
  return (
    <span className="term" tabIndex={0}>
      {children ?? t.label}
      <span role="tooltip" className="term-tip">
        <strong>{t.label}.</strong> {t.short}
      </span>
    </span>
  );
}
