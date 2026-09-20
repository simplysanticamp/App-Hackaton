"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { WalletButton } from "./WalletButton";

const NAV = [
  { href: "/", label: "Agente" },
  { href: "/passport/new", label: "Crear passport" },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [id, setId] = useState("");
  return (
    <header className="border-b" style={{ borderColor: "var(--rule-strong)" }}>
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-end gap-x-8 gap-y-3 px-5 pb-3 pt-4">
        <Link href="/" className="display text-[26px] leading-none">
          Bootstrap
        </Link>

        <nav className="order-3 flex w-full items-end gap-6 text-sm sm:order-none sm:w-auto" aria-label="Principal">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`pb-0.5 ${active ? "border-b-2 border-ink" : "text-muted hover:text-ink"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <form
          className="order-4 flex items-end gap-2 sm:order-none sm:ml-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d{1,20}$/.test(id)) router.push(`/passport/${id}`);
          }}
        >
          <label className="label whitespace-nowrap" htmlFor="open-passport">
            Passport Nº
          </label>
          <input
            id="open-passport"
            className="field mono w-16 !py-0.5 text-center"
            inputMode="numeric"
            value={id}
            onChange={(e) => setId(e.target.value.trim())}
          />
          <button className="btn btn-quiet" type="submit" disabled={!/^\d{1,20}$/.test(id)}>
            Abrir
          </button>
        </form>

        <div className="ml-auto sm:ml-0">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
