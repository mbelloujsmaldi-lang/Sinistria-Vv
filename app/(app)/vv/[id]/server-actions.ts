"use server";

import { createClient } from "@/lib/supabase/server";
import { posterMessageSysteme } from "@/lib/messagerie";
import { notifierSoumission, notifierParticipantsDossier } from "@/lib/notifications";

// Server Actions du dossier VV (Sprint 22) — soumettre/valider/rejeter.
// RLS reste la garde réelle (vv_calculations_update_soumission /
// _validation, migration 0004/0007/0012) : seul l'endroit qui exécute la
// requête change, pas les règles elles-mêmes. userId/role sont dérivés de
// la session serveur, jamais reçus du client (contrairement à
// role_utilisateur, qu'aucune policy RLS ne vérifie — le faire confiance au
// client aurait rendu l'audit falsifiable).
//
// Sprint 27 : chaque événement poste aussi un message SYSTÈME dans la
// discussion du dossier + une notification aux bonnes personnes —
// remplace le système "proposition d'e-mail" de l'ancien Google Apps
// Script. Best-effort : une erreur ici ne doit jamais faire échouer
// l'action métier elle-même (déjà enregistrée à ce stade).
type Retour = { erreur: string | null };

async function utilisateurCourant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase
    .from("profiles")
    .select("role, bureau, nom")
    .eq("id", user.id)
    .single();
  return {
    supabase,
    userId: user.id,
    role: profil?.role ?? null,
    bureau: profil?.bureau ?? null,
    nom: profil?.nom ?? "",
  };
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

  try {
    const lien = `/vv/${calculId}`;
    await posterMessageSysteme(ctx.supabase, calculId, ctx.userId, `${ctx.nom} a soumis ce dossier à validation.`);
    if (ctx.bureau) {
      await notifierSoumission(
        ctx.supabase,
        ctx.bureau,
        ctx.userId,
        `Dossier soumis à validation — ${ctx.nom}`,
        lien
      );
    }
  } catch {
    /* la messagerie/notification ne doit jamais bloquer l'action métier */
  }

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

  const { data: calcul } = await ctx.supabase
    .from("vv_calculations")
    .select("created_by")
    .eq("id", calculId)
    .single();

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

  try {
    await posterMessageSysteme(
      ctx.supabase,
      calculId,
      ctx.userId,
      `${ctx.nom} a validé ce dossier — ${valeurDefinitive} DH.`
    );
    if (calcul?.created_by) {
      await notifierParticipantsDossier(
        ctx.supabase,
        calculId,
        calcul.created_by,
        ctx.userId,
        "validation",
        `Dossier validé — ${ctx.nom}`,
        `/vv/${calculId}`
      );
    }
  } catch {
    /* la messagerie/notification ne doit jamais bloquer l'action métier */
  }

  return { erreur: null };
}

export async function rejeter(calculId: string, motifRejet: string): Promise<Retour> {
  if (!motifRejet.trim()) return { erreur: "Le motif de rejet est requis." };

  const ctx = await utilisateurCourant();
  if (!ctx) return { erreur: "Session expirée." };

  const { data: calcul } = await ctx.supabase
    .from("vv_calculations")
    .select("created_by")
    .eq("id", calculId)
    .single();

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

  try {
    await posterMessageSysteme(
      ctx.supabase,
      calculId,
      ctx.userId,
      `${ctx.nom} a retourné ce dossier pour correction — ${motifRejet}`
    );
    if (calcul?.created_by) {
      await notifierParticipantsDossier(
        ctx.supabase,
        calculId,
        calcul.created_by,
        ctx.userId,
        "rejet",
        `Dossier retourné pour correction — ${ctx.nom}`,
        `/vv/${calculId}`
      );
    }
  } catch {
    /* la messagerie/notification ne doit jamais bloquer l'action métier */
  }

  return { erreur: null };
}
