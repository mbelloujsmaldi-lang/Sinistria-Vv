export const LABELS_STATUT: Record<string, string> = {
  calcule: "Calculé",
  soumis: "Soumis à validation",
  valide: "Validé",
  rejete: "Rejeté",
};

// Remplissage plein (Sprint 26, Phase D — direction "Confident System") :
// remplace l'ancienne palette pastel. calcule reste neutre (slate, aucun
// des 3 statuts signal/warning/error du brief ne le couvre).
const STYLES_STATUT: Record<string, string> = {
  calcule: "bg-slate text-canvas",
  soumis: "bg-warning text-canvas",
  valide: "bg-signal text-canvas",
  rejete: "bg-error text-canvas",
};

export function StatutBadge({ statut }: { statut: string }) {
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
        STYLES_STATUT[statut] ?? "bg-slate text-canvas"
      }`}
    >
      {LABELS_STATUT[statut] ?? statut}
    </span>
  );
}

// Historique (Sprint 26, Phase D) : jusqu'ici du texte brut (aucun badge à
// remplacer) — ajouté pour satisfaire l'exigence de vérification du sprint
// ("badges cohérents sur Registre ET fiche détail ET historique").
// Mapping sémantique sur les 5 libellés réels de vv_calculations_historique
// (server-actions.ts / formulaire-vv-actions.ts) ; "Modification"/"Révision"
// restent neutres (ni succès ni rejet).
const STYLES_ACTION: Record<string, string> = {
  Validation: "bg-signal text-canvas",
  "Retour pour correction": "bg-error text-canvas",
  "Soumission à validation": "bg-warning text-canvas",
  Modification: "bg-slate text-canvas",
  Révision: "bg-slate text-canvas",
};

export function ActionHistoriqueBadge({ action }: { action: string }) {
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
        STYLES_ACTION[action] ?? "bg-slate text-canvas"
      }`}
    >
      {action}
    </span>
  );
}
