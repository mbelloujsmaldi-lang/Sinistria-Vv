"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { journaliserConnexionRefusee } from "@/lib/comptes";

// Connexion (Sprint 22) — Server Action, remplace l'appel
// signInWithPassword côté navigateur. Le client Supabase server (cookies()
// de next/headers) écrit la session dans un cookie httpOnly ; le navigateur
// ne voit jamais le jeton, contrairement à l'ancien flux 100% client.
export type EtatConnexion = { erreur: string | null };

export async function connecter(
  _etatPrecedent: EtatConnexion,
  formData: FormData
): Promise<EtatConnexion> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Défense en profondeur : les champs sont "required" côté HTML, mais une
  // Server Action reste joignable par n'importe quel POST direct, hors de
  // toute validation du navigateur.
  if (!email || !password) {
    return { erreur: "Email et mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await journaliserConnexionRefusee(email);
    return {
      erreur: /banned/i.test(error.message)
        ? "Ce compte est désactivé. Contactez un administrateur."
        : "Identifiants incorrects. Vérifiez votre email et mot de passe.",
    };
  }

  redirect("/accueil");
}
