"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Récupération de mot de passe par lien (Sprint 27) — remplace le
// "récupération par admin uniquement" par un flux self-service, sur le
// mécanisme natif Supabase Auth (pas de table de codes maison).
//
// Un flux par code à 6 chiffres (comme l'ancien Google Apps Script) aurait
// exigé d'éditer le modèle d'e-mail "Reset Password" pour y ajouter
// {{ .Token }} — verrouillé tant qu'aucun SMTP personnalisé n'est
// configuré sur le projet (constaté dans le tableau de bord Supabase :
// "Set up custom SMTP to edit templates"). Le lien magique par défaut, lui,
// ne nécessite aucune édition de modèle — décision confirmée avec
// l'utilisateur, qui a lui-même ajouté https://sinistria-vv.vercel.app aux
// Redirect URLs autorisées (Authentication > URL Configuration).
//
// - resetPasswordForEmail(email, { redirectTo }) envoie l'e-mail (modèle
//   par défaut, lien contenant token_hash + type=recovery).
// - Le lien mène à /login/confirmer, qui appelle verifyOtp({ token_hash,
//   type }) : valide le lien ET établit la session (cookie httpOnly).
// - updateUser({ password }) change le mot de passe sur cette session déjà
//   établie (definirNouveauMotDePasse ci-dessous).
export type EtatDemande = { erreur: string | null; envoye: boolean };

export async function demanderLien(
  _etatPrecedent: EtatDemande,
  formData: FormData
): Promise<EtatDemande> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { erreur: "Adresse e-mail requise.", envoye: false };

  const supabase = await createClient();
  // Réponse volontairement IDENTIQUE que l'e-mail existe ou non (ne pas
  // révéler quels comptes existent), comme journaliserConnexionRefusee
  // pour la connexion.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://sinistria-vv.vercel.app/login/confirmer",
  });

  return { erreur: null, envoye: true };
}

export type EtatNouveauMdp = { erreur: string | null };

export async function definirNouveauMotDePasse(
  _etatPrecedent: EtatNouveauMdp,
  formData: FormData
): Promise<EtatNouveauMdp> {
  const nouveauMdp = String(formData.get("nouveauMdp") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (nouveauMdp.length < 6) return { erreur: "Le mot de passe doit contenir au moins 6 caractères." };
  if (nouveauMdp !== confirmation) return { erreur: "Les deux mots de passe ne correspondent pas." };

  const supabase = await createClient();
  // La session a déjà été établie par verifyOtp() dans /login/confirmer
  // (cookie httpOnly) avant que ce formulaire ne soit affiché.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: "Session de réinitialisation expirée. Redemandez un lien." };

  const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
  if (error) return { erreur: error.message };

  redirect("/dashboard");
}
