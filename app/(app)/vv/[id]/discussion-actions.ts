"use server";

import { createClient } from "@/lib/supabase/server";

// Discussion par dossier (Sprint 27) — message libre. La RLS
// (0019, dossier_messages_insert) est la garde réelle : créateur du
// dossier ou profil avec pouvoir de validation uniquement.
type Retour = { erreur: string | null };

export async function envoyerMessageDossier(calculId: string, corps: string): Promise<Retour> {
  const texte = corps.trim();
  if (!texte) return { erreur: "Message vide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: "Session expirée." };

  const { error } = await supabase.from("dossier_messages").insert({
    vv_calculation_id: calculId,
    auteur_id: user.id,
    type: "utilisateur",
    corps: texte,
  });
  if (error) return { erreur: error.message };

  return { erreur: null };
}
