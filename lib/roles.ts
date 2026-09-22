export type UserRole =
  | "technicien"
  | "gestionnaire"
  | "chef_equipe"
  | "superviseur"
  | "responsable"
  | "adjoint_directeur"
  | "directeur"
  | "admin_technique";

// Les 8 rôles, du plus bas au plus haut niveau (ordre de user_role en base).
export const ROLES: UserRole[] = [
  "technicien",
  "gestionnaire",
  "chef_equipe",
  "superviseur",
  "responsable",
  "adjoint_directeur",
  "directeur",
  "admin_technique",
];

export const LABELS_ROLE: Record<UserRole, string> = {
  technicien: "Technicien",
  gestionnaire: "Gestionnaire",
  chef_equipe: "Chef d'équipe",
  superviseur: "Superviseur",
  responsable: "Responsable",
  adjoint_directeur: "Adjoint directeur",
  directeur: "Directeur",
  admin_technique: "Administrateur technique",
};

const NIVEAU_ROLE: Record<UserRole, number> = {
  technicien: 1,
  gestionnaire: 2,
  chef_equipe: 3,
  superviseur: 4,
  responsable: 5,
  adjoint_directeur: 6,
  directeur: 7,
  admin_technique: 8,
};

// Miroir de current_role_niveau()/role_niveau() en base (0001_init.sql) —
// utilisé uniquement pour l'affichage ; l'application réelle des droits se
// fait par RLS côté serveur (vv_calculations_update_validation, 0004).
export function peutValider(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return NIVEAU_ROLE[role] >= NIVEAU_ROLE.responsable;
}

// Édition du référentiel Marques & Modèles (renommer, supprimer, prix VN) :
// responsable et au-dessus. Miroir des policies RLS de 0013
// (current_role_niveau() >= role_niveau('responsable')) — affichage seulement.
export function peutEditerReferentiel(role: UserRole | null | undefined): boolean {
  return peutValider(role);
}

// Journal d'audit (Sprint 15) : responsable et au-dessus, même garde que
// l'ancien système (requireValidateurOuAdmin_) et que la RLS de
// journal_audit (0014).
export function peutConsulterAudit(role: UserRole | null | undefined): boolean {
  return peutValider(role);
}

// Miroir de la policy RLS "vv_calculations_insert" (0007) : une révision
// n'est acceptée que si le rang du demandeur est STRICTEMENT supérieur à
// celui du validateur d'origine. Affichage uniquement — le vrai contrôle
// est côté RLS.
export function peutReviser(
  roleDemandeur: UserRole | null | undefined,
  roleValidateur: UserRole | null | undefined
): boolean {
  if (!roleDemandeur || !roleValidateur) return false;
  return NIVEAU_ROLE[roleDemandeur] > NIVEAU_ROLE[roleValidateur];
}
