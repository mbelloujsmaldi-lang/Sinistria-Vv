"use server";

import { createClient } from "@/lib/supabase/server";

// Mon profil (Sprint 27) — nom modifiable par soi-même (RLS
// profiles_self_update, 0001/0011 : rôle/bureau restent réservés à
// admin_technique, colonnes protégées par trigger). Mot de passe : la
// session active ne suffit pas seule à en changer un — on revérifie
// l'ancien mot de passe via signInWithPassword avant updateUser (défense
// en profondeur : une session laissée ouverte ne doit pas suffire à
// prendre le compte en permanence).
type Retour = { erreur: string | null; succes?: boolean };

export async function modifierNom(nom: string): Promise<Retour> {
  const n = nom.trim();
  if (!n) return { erreur: "Le nom ne peut pas être vide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: "Session expirée." };

  const { error } = await supabase.from("profiles").update({ nom: n }).eq("id", user.id);
  if (error) return { erreur: error.message };

  return { erreur: null, succes: true };
}

export async function changerMotDePasse(
  ancienMdp: string,
  nouveauMdp: string,
  confirmation: string
): Promise<Retour> {
  if (nouveauMdp.length < 6) return { erreur: "Le nouveau mot de passe doit contenir au moins 6 caractères." };
  if (nouveauMdp !== confirmation) return { erreur: "Les deux mots de passe ne correspondent pas." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { erreur: "Session expirée." };

  const { error: erreurVerif } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: ancienMdp,
  });
  if (erreurVerif) return { erreur: "Mot de passe actuel incorrect." };

  const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
  if (error) return { erreur: error.message };

  return { erreur: null, succes: true };
}
