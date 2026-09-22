"use server";

import { createClient } from "@/lib/supabase/server";

// Server Actions du dossier VV (Sprint 22) — soumettre/valider/rejeter.
// RLS reste la garde réelle (vv_calculations_update_soumission /
// _validation, migration 0004/0007/0012) : seul l'endroit qui exécute la
// requête change, pas les règles elles-mêmes. userId/role sont dérivés de
// la session serveur, jamais reçus du client (contrairement à
// role_utilisateur, qu'aucune policy RLS ne vérifie — le faire confiance au
// client aurait rendu l'audit falsifiable).
type Retour = { erreur: string | null };

async function utilisateurCourant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, userId: user.id, role: profil?.role ?? null };
}

export async function soumettre(calculId: string): Promise<Retour> {
  const ctx = await utilisateurCourant();
  if (!ctx) return { erreur: "Session expirée." };

  const { error } = await ctx.supabase
    .from("vv_calculations")
    .update({
      statut: "soumis",
      soumis_par: ctx.userId,
      soumis_le: new Date().toISOString(),
    })
    .eq("id", calculId);
  if (error) return { erreur: error.message };

  await ctx.supabase.from("vv_calculations_historique").insert({
    vv_calculation_id: calculId,
    utilisateur_id: ctx.userId,
    role_utilisateur: ctx.role,
    action: "Soumission à validation",
  });

  return { erreur: null };
}

export async function valider(
  calculId: string,
  valeurCalculee: number,
  valeurDefinitive: number,
  justification: string
): Promise<Retour> {
  const ctx = await utilisateurCourant();
  if (!ctx) return { erreur: "Session expirée." };

  const ecartDh = Math.round((valeurDefinitive - valeurCalculee) * 100) / 100;
  const ecartPct =
    valeurCalculee !== 0 ? Math.round((ecartDh / valeurCalculee) * 10000) / 100 : 0;

  const { error } = await ctx.supabase
    .from("vv_calculations")
    .update({
      statut: "valide",
      valeur_definitive: valeurDefinitive,
      ecart_dh: ecartDh,
      ecart_pct: ecartPct,
      justification_ecart: justification || null,
      validee_par: ctx.userId,
      valide_le: new Date().toISOString(),
    })
    .eq("id", calculId);
  if (error) return { erreur: error.message };

  await ctx.supabase.from("vv_calculations_historique").insert({
    vv_calculation_id: calculId,
    utilisateur_id: ctx.userId,
    role_utilisateur: ctx.role,
    action: "Validation",
    ancienne_valeur: valeurCalculee,
    nouvelle_valeur: valeurDefinitive,
    observation: justification || null,
  });

  return { erreur: null };
}

export async function rejeter(calculId: string, motifRejet: string): Promise<Retour> {
  if (!motifRejet.trim()) return { erreur: "Le motif de rejet est requis." };

  const ctx = await utilisateurCourant();
  if (!ctx) return { erreur: "Session expirée." };

  const { error } = await ctx.supabase
    .from("vv_calculations")
    .update({ statut: "rejete", motif_rejet: motifRejet })
    .eq("id", calculId);
  if (error) return { erreur: error.message };

  await ctx.supabase.from("vv_calculations_historique").insert({
    vv_calculation_id: calculId,
    utilisateur_id: ctx.userId,
    role_utilisateur: ctx.role,
    action: "Retour pour correction",
    observation: motifRejet,
  });

  return { erreur: null };
}
