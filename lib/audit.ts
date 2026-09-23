import type { SupabaseClient } from "@supabase/supabase-js";
import { LABELS_ROLE, type UserRole } from "@/lib/roles";
import { construireCsv } from "@/lib/csv";

// Vue unifiée du journal d'audit (Sprint 15) : journal_audit (connexions
// refusées, actions sur les comptes) ET vv_calculations_historique
// (actions sur les calculs, Sprint 8) — deux tables séparées, jamais
// fusionnées en base, jamais migrées. Fusion et tri faits ici, à la
// lecture, pour l'affichage seulement.

export type EntreeAudit = {
  id: string;
  source: "journal_audit" | "historique";
  date: string;
  utilisateur: string;
  role: string; // libellé déjà résolu (ou message d'absence, jamais le rôle courant)
  dossier: string | null;
  action: string;
  ancienneValeur: string | null;
  nouvelleValeur: string | null;
  observation: string | null;
};

export type FiltresAudit = {
  utilisateur?: string;
  action?: string;
  depuis?: string; // date ISO (YYYY-MM-DD), inclus
  jusqu?: string; // date ISO (YYYY-MM-DD), inclus
};

const LIMITE_PAR_SOURCE = 500;
const ROLE_NON_ENREGISTRE = "Rôle non enregistré à l'époque";

function libelleRole(role: string | null): string {
  if (!role) return ROLE_NON_ENREGISTRE;
  return LABELS_ROLE[role as UserRole] ?? role;
}

function bornesDates(f: FiltresAudit): { gte?: string; lte?: string } {
  const out: { gte?: string; lte?: string } = {};
  if (f.depuis) out.gte = `${f.depuis}T00:00:00.000Z`;
  if (f.jusqu) out.lte = `${f.jusqu}T23:59:59.999Z`;
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function chargerJournalUnifie(
  supabase: SupabaseClient,
  filtres: FiltresAudit
): Promise<EntreeAudit[]> {
  const { gte, lte } = bornesDates(filtres);

  let q1 = supabase
    .from("journal_audit")
    .select(
      "id, horodatage, utilisateur_label, role_utilisateur, action, ancienne_valeur, nouvelle_valeur, observation, reference_calcul"
    )
    .order("horodatage", { ascending: false })
    .limit(LIMITE_PAR_SOURCE);
  if (filtres.action) q1 = q1.ilike("action", `%${filtres.action}%`);
  if (gte) q1 = q1.gte("horodatage", gte);
  if (lte) q1 = q1.lte("horodatage", lte);

  let q2 = supabase
    .from("vv_calculations_historique")
    .select(
      "id, created_at, action, role_utilisateur, ancienne_valeur, nouvelle_valeur, observation, profiles(nom), vv_calculations(reference)"
    )
    .order("created_at", { ascending: false })
    .limit(LIMITE_PAR_SOURCE);
  if (filtres.action) q2 = q2.ilike("action", `%${filtres.action}%`);
  if (gte) q2 = q2.gte("created_at", gte);
  if (lte) q2 = q2.lte("created_at", lte);

  const [r1, r2] = await Promise.all([q1, q2]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deJournalAudit: EntreeAudit[] = (r1.data ?? []).map((l: any) => ({
    id: l.id,
    source: "journal_audit",
    date: l.horodatage,
    utilisateur: l.utilisateur_label,
    role: libelleRole(l.role_utilisateur),
    dossier: l.reference_calcul,
    action: l.action,
    ancienneValeur: l.ancienne_valeur,
    nouvelleValeur: l.nouvelle_valeur,
    observation: l.observation,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deHistorique: EntreeAudit[] = (r2.data ?? []).map((l: any) => ({
    id: l.id,
    source: "historique",
    date: l.created_at,
    utilisateur: l.profiles?.nom ?? "—",
    role: libelleRole(l.role_utilisateur),
    dossier: l.vv_calculations?.reference ?? null,
    action: l.action,
    ancienneValeur: l.ancienne_valeur === null ? null : String(l.ancienne_valeur),
    nouvelleValeur: l.nouvelle_valeur === null ? null : String(l.nouvelle_valeur),
    observation: l.observation,
  }));

  let fusion = [...deJournalAudit, ...deHistorique];

  // Filtre utilisateur : appliqué après fusion — les deux sources
  // résolvent le nom différemment (instantané figé vs jointure profiles),
  // un filtre SQL unique et cohérent sur les deux n'est pas naturel.
  if (filtres.utilisateur) {
    const q = filtres.utilisateur.toLowerCase();
    fusion = fusion.filter((e) => e.utilisateur.toLowerCase().includes(q));
  }

  fusion.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return fusion;
}

export const COLONNES_CSV = [
  "Date",
  "Utilisateur",
  "Rôle",
  "Dossier",
  "Action",
  "Ancienne valeur",
  "Nouvelle valeur",
  "Observation",
] as const;

export function versCsv(entrees: EntreeAudit[]): string {
  const lignes = entrees.map((e) => [
    new Date(e.date).toLocaleString("fr-MA", { timeZone: "Africa/Casablanca" }),
    e.utilisateur,
    e.role,
    e.dossier ?? "",
    e.action,
    e.ancienneValeur ?? "",
    e.nouvelleValeur ?? "",
    e.observation ?? "",
  ]);
  return construireCsv(COLONNES_CSV, lignes);
}
