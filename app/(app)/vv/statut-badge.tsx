export const LABELS_STATUT: Record<string, string> = {
  calcule: "Calculé",
  soumis: "Soumis à validation",
  valide: "Validé",
  rejete: "Rejeté",
};

const STYLES_STATUT: Record<string, string> = {
  calcule: "bg-slate-100 text-slate-700",
  soumis: "bg-amber-100 text-amber-800",
  valide: "bg-emerald-100 text-emerald-800",
  rejete: "bg-red-100 text-red-700",
};

export function StatutBadge({ statut }: { statut: string }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        STYLES_STATUT[statut] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {LABELS_STATUT[statut] ?? statut}
    </span>
  );
}
