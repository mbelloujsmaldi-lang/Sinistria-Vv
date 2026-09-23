"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { deconnecter } from "./logout-actions";
import { IconProfil, IconDeconnexion, IconChevronBas } from "./nav-icons";

// Bouton "Profil" compact (Sprint 27) — remplace le bloc nom/rôle/bureau +
// Déconnexion affiché en permanence dans le bandeau (jugé trop large/haut
// par l'utilisateur). Toutes ces infos passent dans un menu déroulant,
// derrière une seule icône/avatar — inspiré du principe d'un exemple
// externe fourni par l'utilisateur (avatar + nom + chevron), sans en
// reproduire l'apparence visuelle exacte.
function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

export default function ProfileMenu({
  nom,
  roleLabel,
  bureau,
  reduit = false,
}: {
  nom: string;
  roleLabel: string;
  bureau: string | null;
  reduit?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, startTransition] = useTransition();
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
        aria-expanded={ouvert}
        aria-label="Menu du profil"
        title={reduit ? nom : undefined}
        className={
          reduit
            ? "flex w-full items-center justify-center rounded-md py-1.5 text-line hover:text-canvas"
            : "flex w-full items-center gap-1.5 rounded-md py-0.5 pl-0.5 pr-1.5 text-line hover:text-canvas"
        }
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal text-[11px] font-semibold text-canvas">
          {initiales(nom)}
        </span>
        {!reduit && (
          <>
            <span className="flex-1 truncate text-left text-sm text-canvas">{nom}</span>
            <IconChevronBas className={`h-3 w-3 shrink-0 transition-transform ${ouvert ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {ouvert && (
        // `bottom-full` (pas `top-full`) : ce menu vit maintenant en bas de
        // la barre latérale (Sprint 28) — s'ouvrir vers le bas déborderait
        // sous la fenêtre.
        <div className="absolute bottom-full left-0 z-20 mb-2 w-56 rounded-md border border-line bg-surface shadow-sm">
          <div className="border-b border-line px-3 py-2.5">
            <p className="text-sm font-medium text-ink">{nom}</p>
            <p className="text-xs text-slate">
              {roleLabel}
              {bureau ? ` · ${bureau}` : ""}
            </p>
          </div>
          <Link
            href="/profil"
            onClick={() => setOuvert(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink no-underline hover:bg-canvas"
          >
            <IconProfil className="h-4 w-4 shrink-0 text-slate" />
            Mon profil
          </Link>
          <button
            type="button"
            onClick={() => startTransition(() => deconnecter())}
            disabled={enCours}
            className="flex w-full items-center gap-2 border-t border-line px-3 py-2 text-left text-sm text-ink hover:bg-canvas disabled:opacity-60"
          >
            <IconDeconnexion className="h-4 w-4 shrink-0 text-slate" />
            {enCours ? "Déconnexion…" : "Déconnexion"}
          </button>
        </div>
      )}
    </div>
  );
}
