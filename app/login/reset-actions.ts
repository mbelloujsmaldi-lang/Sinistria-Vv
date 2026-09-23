"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Récupération de mot de passe par code (Sprint 27) — remplace le
// "récupération par admin uniquement" par un flux self-service, sur le
// mécanisme natif Supabase Auth (pas de table de codes maison) :
// - resetPasswordForEmail() envoie l'e-mail. Le modèle "Reset Password"
//   du projet a été édité (Supabase Dashboard > Authentication > Email
//   Templates) pour afficher {{ .Token }} (OTP à 6 chiffres, variable
//   documentée par Supabase — "peut être utilisé à la place de
//   {{ .ConfirmationURL }}"), au lieu du seul lien magique par défaut.
// - verifyOtp({ email, token, type: 'recovery' }) valide le code ET
//   établit la session (cookie httpOnly, comme une connexion normale).
// - updateUser({ password }) change le mot de passe sur cette session.
//
// Durée de validité / nombre d'essais : contrôlés par les réglages Auth du
// projet Supabase (expiration OTP), pas par du code applicatif — voir la
// note transmise à l'utilisateur : la limite exacte "3 essais" de l'ancien
// système n'est pas un réglage Supabase documenté indépendamment ;
// Supabase applique son propre anti-abus interne à la place.
export type EtatDemande = { erreur: string | null; envoye: boolean };

export async function demanderCode(
  _etatPrecedent: EtatDemande,
  formData: FormData
): Promise<EtatDemande> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { erreur: "Adresse e-mail requise.", envoye: false };

  const supabase = await createClient();
  // Réponse volontairement IDENTIQUE que l'e-mail existe ou non (ne pas
  // révéler quels comptes existent), comme journaliserConnexionRefusee
  // pour la connexion.
  await supabase.auth.resetPasswordForEmail(email);

  return { erreur: null, envoye: true };
}

export type EtatConfirmation = { erreur: string | null };

export async function confirmerCode(
  _etatPrecedent: EtatConfirmation,
  formData: FormData
): Promise<EtatConfirmation> {
  const email = String(formData.get("email") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const nouveauMdp = String(formData.get("nouveauMdp") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (!email || !code) return { erreur: "E-mail et code requis." };
  if (nouveauMdp.length < 6) return { erreur: "Le mot de passe doit contenir au moins 6 caractères." };
  if (nouveauMdp !== confirmation) return { erreur: "Les deux mots de passe ne correspondent pas." };

  const supabase = await createClient();
  const { error: erreurOtp } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
  if (erreurOtp) {
    return { erreur: "Code invalide ou expiré. Demandez-en un nouveau." };
  }

  const { error: erreurMdp } = await supabase.auth.updateUser({ password: nouveauMdp });
  if (erreurMdp) return { erreur: erreurMdp.message };

  redirect("/dashboard");
}
