"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { MascotSvg } from "./Mascot";
import { WalletButton } from "./WalletButton";

const NAV = [
  { href: "/", label: "Empezar" },
  { href: "/passport/new", label: "Crear pasaporte" },
  { href: "/glosario", label: "Glosario" },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [id, setId] = useState("");
  const validId = /^\d{1,20}$/.test(id);
  return (
    <header className="mx-auto w-full max-w-5xl px-5 pt-4">
      <div className="card-flat flex flex-wrap items-center gap-x-3 gap-y-2 !px-3 !py-3 sm:gap-x-6 sm:!px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="block h-10 w-8"><MascotSvg /></span>
          <span className="display text-[22px] sm:text-[24px]">Bootstrap</span>
        </Link>

        <nav className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto sm:gap-2" aria-label="Principal">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-2.5 py-1 text-[14px] font-semibold sm:px-3 sm:text-[15px] ${active ? "bg-ink text-paper" : "hover:bg-paper-2"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <form
          className="order-4 flex items-center gap-2 sm:order-none sm:ml-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (validId) router.push(`/passport/${id}`);
          }}
        >
          <label className="label whitespace-nowrap" htmlFor="open-passport">Buscar pasaporte Nº</label>
          <input
            id="open-passport"
            className="field mono !w-16 !px-2 !py-1 text-center"
            inputMode="numeric"
            value={id}
            onChange={(e) => setId(e.target.value.trim())}
          />
          <button className="btn btn-quiet" type="submit" disabled={!validId}>Ir</button>
        </form>

        <div className="ml-auto sm:ml-0">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
