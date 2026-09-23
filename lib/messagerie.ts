import type { SupabaseClient } from "@supabase/supabase-js";

// Discussion par dossier (Sprint 27) — remplace le système "proposition
// d'e-mail" de l'ancien Google Apps Script : chaque événement du circuit
// de validation poste un message SYSTÈME ici, en plus de la notification
// (lib/notifications.ts). Participants (imposés par la RLS de 0019) :
// créateur du dossier + tout profil avec pouvoir de validation.

export type MessageDossier = {
  id: string;
  vv_calculation_id: string;
  auteur_id: string;
  type: "utilisateur" | "systeme";
  corps: string;
  created_at: string;
  profiles: { nom: string } | null;
};

export async function chargerMessages(
  supabase: SupabaseClient,
  calculId: string
): Promise<MessageDossier[]> {
  const { data } = await supabase
    .from("dossier_messages")
    .select("id, vv_calculation_id, auteur_id, type, corps, created_at, profiles(nom)")
    .eq("vv_calculation_id", calculId)
    .order("created_at", { ascending: true });
  return (data as unknown as MessageDossier[] | null) ?? [];
}

// Message système posté par l'acteur d'un événement (soumission/validation/
// retour pour correction/révision) — jamais par un tiers non impliqué,
// l'appelant transmet toujours l'utilisateur qui a déclenché l'action.
export async function posterMessageSysteme(
  supabase: SupabaseClient,
  calculId: string,
  auteurId: string,
  corps: string
): Promise<void> {
  await supabase.from("dossier_messages").insert({
    vv_calculation_id: calculId,
    auteur_id: auteurId,
    type: "systeme",
    corps,
  });
}
