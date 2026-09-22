import { randomInt } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/roles";

// Console "Comptes" (Sprint 13) — helpers serveur uniquement.

export type Acteur = { id: string; role: UserRole; nom: string };

// Garde partagée par la page /comptes et toutes les routes /api/comptes :
// renvoie l'utilisateur connecté seulement s'il est admin_technique ET actif,
// sinon null. Le contrôle réel des droits reste en base (RLS
// profiles_admin_write + trigger 0011) : les écritures de profil passent par
// le client de la session, pas par service_role.
export async function acteurAdminTechnique(): Promise<Acteur | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from("profiles")
    .select("role, actif, nom")
    .eq("id", user.id)
    .single();

  if (!profil || !profil.actif || profil.role !== "admin_technique") return null;
  return { id: user.id, role: profil.role as UserRole, nom: profil.nom };
}

// Écrit une ligne dans journal_audit (Sprint 15) — toujours via le client
// admin (RLS n'autorise aucune écriture authentifiée sur cette table, par
// conception). Comme l'ancien auditLog_ : l'audit ne doit JAMAIS faire
// échouer l'action appelante — erreurs avalées silencieusement.
export async function journaliser(entree: {
  acteur: Acteur;
  action: string;
  ancienneValeur?: string | null;
  nouvelleValeur?: string | null;
  observation?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("journal_audit").insert({
      utilisateur_id: entree.acteur.id,
      utilisateur_label: entree.acteur.nom,
      action: entree.action,
      ancienne_valeur: entree.ancienneValeur ?? null,
      nouvelle_valeur: entree.nouvelleValeur ?? null,
      observation: entree.observation ?? null,
    });
  } catch {
    // volontaire : voir commentaire ci-dessus.
  }
}

const MAJ = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MIN = "abcdefghijkmnpqrstuvwxyz";
const NUM = "23456789";
const SYM = "!@#$%*?";

function tirer(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)];
}

// Mot de passe temporaire aléatoire (CSPRNG), 16 caractères, sans caractères
// ambigus (0/O, 1/l/I), avec au moins une majuscule, minuscule, chiffre et
// symbole. Affiché une seule fois à l'administrateur, jamais stocké.
export function genererMotDePasseTemporaire(): string {
  const tous = MAJ + MIN + NUM + SYM;
  const car = [tirer(MAJ), tirer(MIN), tirer(NUM), tirer(SYM)];
  while (car.length < 16) car.push(tirer(tous));
  for (let i = car.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [car[i], car[j]] = [car[j], car[i]];
  }
  return car.join("");
}

export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Durée de blocage Auth d'un compte désactivé (~100 ans), levée par "none".
export const BAN_DEFINITIF = "876000h";
