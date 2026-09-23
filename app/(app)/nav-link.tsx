"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Lien de nav du shell (Sprint 26, Phase B) : pastille pleine `signal` sur
// le lien actif, gris clair (`text-line`, ≥4.5:1 sur fond ink) sinon —
// remplace l'ancien soulignement uniforme (pensé pour un bandeau clair,
// invisible/faible sur le nouveau bandeau ink plein).
export default function NavLink({
  href,
  children,
  compteur,
}: {
  href: string;
  children: React.ReactNode;
  compteur?: number;
}) {
  const pathname = usePathname();
  const actif = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={
        actif
          ? "flex items-center gap-1.5 rounded-full bg-signal px-3 py-1 text-sm font-medium text-canvas"
          : "flex items-center gap-1.5 text-sm text-line no-underline hover:text-canvas"
      }
    >
      {children}
      {!!compteur && (
        <span
          className={
            actif
              ? "rounded-full bg-canvas/20 px-1.5 text-[11px] font-semibold text-canvas"
              : "rounded-full bg-error px-1.5 text-[11px] font-semibold text-canvas"
          }
        >
          {compteur}
        </span>
      )}
    </Link>
  );
}
