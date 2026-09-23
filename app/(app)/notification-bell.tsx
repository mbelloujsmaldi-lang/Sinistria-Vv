"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { obtenirNotifications, marquerLues } from "./notifications-actions";
import type { Notification } from "@/lib/notifications";

const INTERVALLE_MS = 30_000;

const LABELS_TYPE: Record<string, string> = {
  soumission: "Soumission",
  validation: "Validation",
  rejet: "Retour pour correction",
  revision: "Révision",
  annonce: "Annonce",
};

// Clochette de notifications (Sprint 27) — sondage périodique (pas de
// temps réel dans cette appli, aucun canal websocket existant) via Server
// Action, même approche que logout-button.tsx.
export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nonLues, setNonLues] = useState(0);
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function rafraichir() {
    const { notifications: n, nonLues: nl } = await obtenirNotifications();
    // La liste affichée ne montre que le non-lu : le compteur du badge et
    // le nombre de lignes de la liste restent ainsi toujours identiques.
    setNotifications(n.filter((x) => !x.lu));
    setNonLues(nl);
  }

  useEffect(() => {
    rafraichir();
    const id = setInterval(rafraichir, INTERVALLE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!ouvert) return;
    function surClicExterieur(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, [ouvert]);

  function ouvrir() {
    setOuvert((v) => !v);
  }

  // Une notification cliquée disparaît de la liste (pas de "tout marquer lu"
  // à l'ouverture — bug relevé par l'utilisateur : le compteur retombait à
  // zéro alors que le reste n'avait pas vraiment été consulté). Seule celle
  // cliquée est marquée lue, et seulement elle quitte la liste affichée.
  async function surClicNotification(n: Notification) {
    setOuvert(false);
    if (n.lu) return;
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    setNonLues((prev) => Math.max(0, prev - 1));
    await marquerLues([n.id]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={ouvrir}
        aria-label="Notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-line hover:text-canvas"
      >
        <span aria-hidden className="text-lg">
          🔔
        </span>
        {nonLues > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-medium text-canvas">
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        // `bottom-full` (pas `top-full`) : la clochette vit maintenant en
        // bas de la barre latérale (Sprint 28) — s'ouvrir vers le bas
        // débordait sous la fenêtre (bug réel constaté au Sprint 27 avec
        // l'ancien bandeau, cause différente ici mais même symptôme).
        <div className="absolute bottom-full left-0 z-20 mb-2 w-80 rounded-md border border-line bg-surface shadow-sm">
          <div className="border-b border-line px-3 py-2 text-xs font-medium uppercase tracking-widest text-slate">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate">Aucune notification non lue.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="border-b border-line last:border-0">
                  <Link
                    href={n.lien ?? "#"}
                    onClick={() => surClicNotification(n)}
                    className="block px-3 py-2 no-underline hover:bg-canvas"
                  >
                    <p className="text-xs font-medium uppercase tracking-widest text-signal">
                      {LABELS_TYPE[n.type] ?? n.type}
                    </p>
                    <p className="text-sm text-ink">{n.titre}</p>
                    {n.corps && <p className="mt-0.5 text-xs text-slate">{n.corps}</p>}
                    <p className="mt-1 text-[10px] text-slate">
                      {new Date(n.created_at).toLocaleString("fr-MA")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
