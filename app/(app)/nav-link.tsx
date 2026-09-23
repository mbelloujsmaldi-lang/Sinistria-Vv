"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Lien de nav du shell (Sprint 26, Phase B) : pastille pleine `signal` sur
// le lien actif, gris clair (`text-line`, ≥4.5:1 sur fond ink) sinon —
// remplace l'ancien soulignement uniforme (pensé pour un bandeau clair,
// invisible/faible sur le nouveau bandeau ink plein).
export default function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const actif = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={
        actif
          ? "rounded-full bg-signal px-3 py-1 text-sm font-medium text-canvas"
          : "text-sm text-line no-underline hover:text-canvas"
      }
    >
      {children}
    </Link>
  );
}
