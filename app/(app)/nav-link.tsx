"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hrefLePlusSpecifique } from "./nav-actif";

// Ligne de nav du shell (Sprint 28 — bandeau devenu barre latérale) :
// pastille pleine `signal` sur le lien actif, gris clair (`text-line`,
// ≥4.5:1 sur fond ink) sinon. En mode réduit (collapsed), seule l'icône
// reste visible ; `title` sert de repère minimal au survol.
export default function NavLink({
  href,
  children,
  icon,
  compteur,
  reduit = false,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  compteur?: number;
  reduit?: boolean;
}) {
  const pathname = usePathname();
  const actif = hrefLePlusSpecifique(pathname) === href;

  return (
    <Link
      href={href}
      title={reduit ? String(children) : undefined}
      className={
        actif
          ? `flex items-center gap-2.5 rounded-md bg-signal py-2 text-sm font-medium text-canvas ${reduit ? "justify-center px-0" : "px-3"}`
          : `flex items-center gap-2.5 rounded-md py-2 text-sm text-line no-underline hover:bg-ink-light hover:text-canvas ${reduit ? "justify-center px-0" : "px-3"}`
      }
    >
      {icon}
      {!reduit && <span className="flex-1 truncate">{children}</span>}
      {!!compteur && !reduit && (
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
      {!!compteur && reduit && (
        <span className="absolute ml-5 mt-[-14px] flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold text-canvas">
          {compteur}
        </span>
      )}
    </Link>
  );
}
