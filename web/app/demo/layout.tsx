import Link from "next/link";
import type { ReactNode } from "react";

// Todas las rutas /demo comparten este aviso: son datos de ejemplo y nada toca la cadena ni Supabase.
export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mx-auto mt-4 w-full max-w-5xl px-5">
        <p className="notice flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="tag tag-demo !border-ink !text-ink">Modo demo</span>
          <span>
            Todo lo que ves aquí son datos de ejemplo. Nada se guarda en la cadena ni en ninguna base de datos.
          </span>
          <Link href="/demo" className="link ml-auto">Índice de la demo</Link>
        </p>
      </div>
      {children}
    </>
  );
}
