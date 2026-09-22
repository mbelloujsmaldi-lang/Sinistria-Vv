import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/comptes";
import type { UserRole } from "@/lib/roles";

// POST /api/connexion-refusee — journalise une tentative de connexion
// échouée (Sprint 15). Surface volontairement minimale et non
// authentifiée par nature (par définition, il n'y a pas de session à ce
// stade) — conçue avec la même rigueur que /api/calculer en son temps :
//
//   - Corps accepté : { email } SEULEMENT. Jamais le mot de passe.
//   - Le VRAI motif (compte introuvable / désactivé / mot de passe
//     incorrect) est redéterminé ICI, côté serveur, avec l'API admin —
//     jamais fait confiance à un motif envoyé par le client. Nécessaire
//     car Supabase Auth renvoie volontairement le MÊME message
//     ("Invalid login credentials") pour un compte introuvable et un
//     mauvais mot de passe (anti-énumération) : le navigateur ne peut
//     objectivement pas savoir lequel des deux s'est produit.
//   - Réponse TOUJOURS identique ({ok:true}), quel que soit le résultat
//     réel — rien à apprendre en sondant cette route directement.
//   - Aucun GET. Écriture uniquement via le client admin (service_role) :
//     journal_audit n'a aucune policy RLS d'écriture pour anon/authenticated.
//   - Limitation de débit séparée de celle de /api/calculer (Sprint 6) :
//     table dédiée journal_audit_connexion_calls.
export async function POST(request: NextRequest) {
  const REPONSE_NEUTRE = NextResponse.json({ ok: true });

  const admin = createAdminClient();

  // Limitation de débit — enregistrée avant toute autre logique, comme
  // /api/calculer : un flot d'appels doit être bloqué même s'il ne mène à
  // rien d'exploitable derrière.
  await admin
    .from("journal_audit_connexion_calls")
    .delete()
    .lt("called_at", new Date(Date.now() - 2 * 60 * 1000).toISOString());
  await admin.from("journal_audit_connexion_calls").insert({});
  const { count } = await admin
    .from("journal_audit_connexion_calls")
    .select("*", { count: "exact", head: true })
    .gt("called_at", new Date(Date.now() - 60 * 1000).toISOString());
  if ((count ?? 0) > 10) {
    return REPONSE_NEUTRE;
  }

  let corps: Record<string, unknown>;
  try {
    corps = await request.json();
  } catch {
    return REPONSE_NEUTRE;
  }
  const email = typeof corps.email === "string" ? corps.email.trim().toLowerCase() : "";
  if (!email || email.length > 254) {
    return REPONSE_NEUTRE;
  }

  try {
    // Base d'utilisateurs réduite (projet interne) : filtrage côté
    // application, comme le reste de ce projet le fait déjà.
    const { data: liste } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const compte = liste?.users.find((u) => u.email?.toLowerCase() === email);

    if (!compte) {
      await journaliser({
        sujet: { id: null, label: email, role: null },
        action: "Connexion refusée",
        nouvelleValeur: email,
        observation: "compte introuvable",
      });
      return REPONSE_NEUTRE;
    }

    const banni = !!compte.banned_until && new Date(compte.banned_until) > new Date();
    const { data: profil } = await admin
      .from("profiles")
      .select("nom, role, actif")
      .eq("id", compte.id)
      .maybeSingle();

    const label = profil?.nom ?? email;
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
      nouvelleValeur: email,
      observation,
    });
  } catch {
    // L'audit ne doit jamais faire échouer quoi que ce soit ; ici, il n'y
    // a même rien d'autre à faire échouer — on avale silencieusement.
  }

  return REPONSE_NEUTRE;
}
