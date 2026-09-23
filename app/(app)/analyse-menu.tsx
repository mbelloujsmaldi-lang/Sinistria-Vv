"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconAnalyse, IconChevronBas } from "./nav-icons";

// Regroupement "Analyse" (Sprint 24, Phase C ; converti en accordéon
// intégré au Sprint 28 — la barre latérale n'a plus de place pour un
// popup flottant) : Simulateur et Coefficients, deux outils exploratoires
// distincts du flux transactionnel principal (Nouveau calcul / Registre)
// — la comparaison face au marché (Sprint 17) reste intégrée à
// /vv/[id], jamais une entrée de menu séparée.
const LIENS = [
  { href: "/analyse/simulateur", label: "Simulateur" },
  { href: "/analyse/coefficients", label: "Coefficients" },
];

export default function AnalyseMenu({ reduit = false }: { reduit?: boolean }) {
  const pathname = usePathname();
  const actif = LIENS.some((l) => pathname === l.href || pathname.startsWith(`${l.href}/`));
  const [ouvert, setOuvert] = useState(actif);

  // Si l'utilisateur navigue directement vers une sous-page (lien direct,
  // retour navigateur), le groupe doit s'ouvrir tout seul.
  useEffect(() => {
    if (actif) setOuvert(true);
  }, [actif]);

  if (reduit) {
    return (
      <Link
        href="/analyse/simulateur"
        title="Analyse"
        className={
          actif
            ? "flex items-center justify-center rounded-md bg-signal py-2 text-canvas"
            : "flex items-center justify-center rounded-md py-2 text-line hover:bg-ink-light hover:text-canvas"
        }
      >
        <IconAnalyse />
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className={
          actif
            ? "flex w-full items-center gap-2.5 rounded-md bg-signal px-3 py-2 text-sm font-medium text-canvas"
            : "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-line hover:bg-ink-light hover:text-canvas"
        }
      >
        <IconAnalyse />
        <span className="flex-1 truncate text-left">Analyse</span>
        <IconChevronBas className={`h-3 w-3 shrink-0 transition-transform ${ouvert ? "rotate-180" : ""}`} />
      </button>
      {ouvert && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-ink-light pl-3">
          {LIENS.map((lien) => {
            const actifLien = pathname === lien.href || pathname.startsWith(`${lien.href}/`);
            return (
              <Link
                key={lien.href}
                href={lien.href}
                className={
                  actifLien
                    ? "block rounded-md px-3 py-1.5 text-sm font-medium text-signal-light no-underline"
                    : "block rounded-md px-3 py-1.5 text-sm text-line no-underline hover:text-canvas"
                }
              >
                {lien.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
