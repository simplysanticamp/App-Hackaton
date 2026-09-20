"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WalletButton } from "./WalletButton";

export function Header() {
  const router = useRouter();
  const [id, setId] = useState("");
  return (
    <header className="border-b border-foreground/10">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold">Bootstrap</Link>
        <nav className="flex items-center gap-4 text-sm opacity-80">
          <Link href="/">Agente</Link>
          <Link href="/passport/new">Crear Passport</Link>
        </nav>
        <form
          className="ml-auto flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d{1,20}$/.test(id)) router.push(`/passport/${id}`);
          }}
        >
          <input
            className="w-28 rounded border border-foreground/20 bg-transparent px-2 py-1 text-sm"
            placeholder="Passport #"
            inputMode="numeric"
            value={id}
            onChange={(e) => setId(e.target.value.trim())}
            aria-label="Abrir passport por id"
          />
          <button className="rounded border border-foreground/20 px-2 py-1 text-sm" type="submit">Abrir</button>
        </form>
        <WalletButton />
      </div>
    </header>
  );
}
