import { IconValider, IconRejeter, IconHorloge } from "../../nav-icons";

// Ligne de production du dossier (Sprint 29, point 8) — inspirée du
// principe d'un exemple externe fourni par l'utilisateur (étapes reliées,
// statut visuel par nœud), adaptée aux 4 statuts réels de cette
// application (pas de tabs/sous-modules fabriqués qui n'existent pas ici).
// "Calculé" est considéré acquis dès la création du dossier (le calcul lui-
// même est la première étape, jamais "à venir").
const ETAPES = [
  { cle: "calcule", label: "Calculé" },
  { cle: "soumis", label: "Soumis à validation" },
  { cle: "resultat", label: "Résultat" }, // libellé dynamique : "Validé" ou "Rejeté"
] as const;

type EtatNoeud = "termine" | "actuel_attente" | "actuel_ok" | "actuel_ko" | "a_venir";

export default function Pipeline({ statut }: { statut: string }) {
  const indexActuel = statut === "calcule" ? 0 : statut === "soumis" ? 1 : 2;
  const rejete = statut === "rejete";

  function etatDuNoeud(i: number): EtatNoeud {
    if (i < indexActuel) return "termine";
    if (i > indexActuel) return "a_venir";
    // i === indexActuel
    if (i === 0) return "actuel_attente"; // calculé mais pas encore soumis
    if (i === 1) return "actuel_attente"; // soumis, en attente de décision
    return rejete ? "actuel_ko" : "actuel_ok"; // 3ᵉ nœud : validé ou rejeté
  }

  const styles: Record<EtatNoeud, string> = {
    termine: "bg-signal text-canvas border-signal",
    actuel_attente: "bg-warning text-canvas border-warning",
    actuel_ok: "bg-signal text-canvas border-signal",
    actuel_ko: "bg-error text-canvas border-error",
    a_venir: "bg-white text-line border-line",
  };

  return (
    <div className="flex items-center">
      {ETAPES.map((etape, i) => {
        const etat = etatDuNoeud(i);
        const label = etape.cle === "resultat" ? (rejete ? "Rejeté" : "Validé") : etape.label;
        return (
          <div key={etape.cle} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${styles[etat]}`}
              >
                {etat === "termine" && <IconValider className="h-4 w-4 shrink-0" />}
                {etat === "actuel_attente" && <IconHorloge className="h-4 w-4 shrink-0" />}
                {etat === "actuel_ok" && <IconValider className="h-4 w-4 shrink-0" />}
                {etat === "actuel_ko" && <IconRejeter className="h-4 w-4 shrink-0" />}
              </div>
              <span
                className={`whitespace-nowrap text-[11px] font-medium ${
                  etat === "a_venir" ? "text-slate" : "text-ink"
                }`}
              >
                {label}
              </span>
            </div>
            {i < ETAPES.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 ${i < indexActuel ? "bg-signal" : "bg-line"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
