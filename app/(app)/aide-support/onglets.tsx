"use client";

import { useState, type ReactNode } from "react";

// Sous-onglets (Sprint 24, Phase D) — pure présentation, aucune nouvelle
// logique : le contenu de chaque onglet est celui du Sprint 23, rendu
// côté serveur dans page.tsx et transmis ici tel quel. Le contenu inactif
// reste monté (masqué en CSS, pas démonté) pour ne pas perdre la saisie
// en cours d'un formulaire si l'utilisateur change d'onglet puis revient.
const ONGLETS = [
  { id: "methodologie", label: "Méthodologie" },
  { id: "support", label: "Support" },
] as const;
type OngletId = (typeof ONGLETS)[number]["id"];

export default function OngletsAideSupport({
  methodologie,
  support,
}: {
  methodologie: ReactNode;
  support: ReactNode;
}) {
  const [actif, setActif] = useState<OngletId>("methodologie");

  return (
    <div>
      <div className="mb-8 flex gap-1 border-b border-line">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setActif(o.id)}
            aria-current={actif === o.id ? "true" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              actif === o.id
                ? "border-signal text-signal"
                : "border-transparent text-slate hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className={actif === "methodologie" ? "space-y-12" : "hidden"}>{methodologie}</div>
      <div className={actif === "support" ? "space-y-12" : "hidden"}>{support}</div>
    </div>
  );
}
