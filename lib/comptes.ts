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

// Identité à consigner dans journal_audit : normalement l'acteur (l'admin
// qui agit), sauf pour une connexion refusée où il n'y a pas d'acteur au
// sens propre — c'est alors le compte visé par la tentative (ou un
// identifiant nul si aucun compte ne correspond à l'email essayé).
export type SujetJournal = { id: string | null; label: string; role: UserRole | null };

export function sujetDepuisActeur(acteur: Acteur): SujetJournal {
  return { id: acteur.id, label: acteur.nom, role: acteur.role };
}

// Écrit une ligne dans journal_audit (Sprint 15) — toujours via le client
// admin (RLS n'autorise aucune écriture authentifiée sur cette table, par
// conception). Comme l'ancien auditLog_ : l'audit ne doit JAMAIS faire
// échouer l'action appelante — erreurs avalées silencieusement.
export async function journaliser(entree: {
  sujet: SujetJournal;
  action: string;
  ancienneValeur?: string | null;
  nouvelleValeur?: string | null;
  observation?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("journal_audit").insert({
      utilisateur_id: entree.sujet.id,
      utilisateur_label: entree.sujet.label,
      role_utilisateur: entree.sujet.role,
      action: entree.action,
      ancienne_valeur: entree.ancienneValeur ?? null,
      nouvelle_valeur: entree.nouvelleValeur ?? null,
      observation: entree.observation ?? null,
    });
  } catch {
    // volontaire : voir commentaire ci-dessus.
  }
}

// Limitation de débit + détermination du motif réel + journalisation d'une
// tentative de connexion échouée (Sprint 15). Extraite au Sprint 22 pour
// être appelée directement par la Server Action de connexion
// (app/login/actions.ts) — plus d'appel HTTP vers une route dédiée
// (app/api/connexion-refusee, orpheline depuis ce changement, supprimée).
//
// Le VRAI motif (compte introuvable / désactivé / mot de passe incorrect)
// est redéterminé ICI, côté serveur, avec l'API admin — jamais déduit du
// message d'erreur renvoyé à l'utilisateur. Nécessaire car Supabase Auth
// renvoie volontairement le MÊME message ("Invalid login credentials")
// pour un compte introuvable et un mauvais mot de passe (anti-énumération).
//
// Jamais bloquante : toute erreur est avalée, comme journaliser(). Doit
// être attendue (await) par l'appelant — contrairement à l'ancien appel
// fire-and-forget depuis le navigateur, une Server Action s'exécute dans
// une fonction serverless de courte durée : une promesse non attendue
// risque d'être interrompue avant d'écrire quoi que ce soit.
export async function journaliserConnexionRefusee(email: string): Promise<void> {
  const propre = email.trim().toLowerCase();
  if (!propre || propre.length > 254) return;

  const admin = createAdminClient();

  try {
    // Limitation de débit — avant toute autre logique, comme /api/calculer :
    // un flot d'appels doit être bloqué même s'il ne mène à rien d'exploitable.
    await admin
      .from("journal_audit_connexion_calls")
      .delete()
      .lt("called_at", new Date(Date.now() - 2 * 60 * 1000).toISOString());
    await admin.from("journal_audit_connexion_calls").insert({});
    const { count } = await admin
      .from("journal_audit_connexion_calls")
      .select("*", { count: "exact", head: true })
      .gt("called_at", new Date(Date.now() - 60 * 1000).toISOString());
    if ((count ?? 0) > 10) return;

    // Base d'utilisateurs réduite (projet interne) : filtrage côté
    // application, comme le reste de ce projet le fait déjà.
    const { data: liste } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const compte = liste?.users.find((u) => u.email?.toLowerCase() === propre);

    if (!compte) {
      await journaliser({
        sujet: { id: null, label: propre, role: null },
        action: "Connexion refusée",
        nouvelleValeur: propre,
        observation: "compte introuvable",
      });
      return;
    }

    const banni = !!compte.banned_until && new Date(compte.banned_until) > new Date();
    const { data: profil } = await admin
      .from("profiles")
      .select("nom, role, actif")
      .eq("id", compte.id)
      .maybeSingle();

    const label = profil?.nom ?? propre;
    const role = (profil?.role as UserRole | undefined) ?? null;

    let observation: string;
    if (banni || profil?.actif === false) {
      observation = "compte désactivé";
    } else if (!profil) {
      observation = "compte sans profil";
    } else {
      observation = "mot de passe incorrect";
    }

    await journaliser({
      sujet: { id: compte.id, label, role },
      action: "Connexion refusée",
      nouvelleValeur: propre,
      observation,
    });
  } catch {
    // volontaire : l'audit ne doit jamais faire échouer la connexion elle-même.
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
