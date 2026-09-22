"use client";

import { useTransition } from "react";
import { deconnecter } from "./logout-actions";

export default function LogoutButton() {
  const [enCours, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => deconnecter())}
      disabled={enCours}
      className="text-sm text-slate underline hover:text-ink disabled:opacity-60"
    >
      {enCours ? "Déconnexion…" : "Déconnexion"}
    </button>
  );
}
