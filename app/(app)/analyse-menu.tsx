"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Regroupement "Analyse" (Sprint 24, Phase C) : Simulateur et Coefficients,
// deux outils exploratoires distincts du flux transactionnel principal
// (Nouveau calcul / Registre) — la comparaison face au marché (Sprint 17)
// reste intégrée à /vv/[id], jamais une entrée de menu séparée.
const LIENS = [
  { href: "/analyse/simulateur", label: "Simulateur" },
  { href: "/analyse/coefficients", label: "Coefficients" },
];

export default function AnalyseMenu() {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    function surClicExterieur(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, [ouvert]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="flex items-center gap-1 text-sm text-slate underline hover:text-ink"
        aria-expanded={ouvert}
      >
        Analyse
        <span aria-hidden className="text-xs">
          {ouvert ? "▲" : "▼"}
        </span>
      </button>
      {ouvert && (
        <div className="absolute left-0 top-full z-10 mt-2 w-44 rounded border border-line bg-white py-1 shadow-sm">
          {LIENS.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              onClick={() => setOuvert(false)}
              className="block px-3 py-2 text-sm text-ink no-underline hover:bg-canvas"
            >
              {lien.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
