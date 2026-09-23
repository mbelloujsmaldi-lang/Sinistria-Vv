import type { SupabaseClient } from "@supabase/supabase-js";

// Discussion par dossier (Sprint 27) — remplace le système "proposition
// d'e-mail" de l'ancien Google Apps Script : chaque événement du circuit
// de validation poste un message SYSTÈME ici, en plus de la notification
// (lib/notifications.ts). Participants (imposés par la RLS de 0019) :
// créateur du dossier + tout profil avec pouvoir de validation.

export type LectureMessage = { utilisateur_id: string; nom: string; lu_le: string };

export type MessageDossier = {
  id: string;
  vv_calculation_id: string;
  auteur_id: string;
  type: "utilisateur" | "systeme";
  corps: string;
  created_at: string;
  profiles: { nom: string } | null;
  lecteurs: LectureMessage[];
};

export async function chargerMessages(
  supabase: SupabaseClient,
  calculId: string
): Promise<MessageDossier[]> {
  // "profiles!dossier_messages_auteur_id_fkey" (pas juste "profiles") :
  // depuis 0021, dossier_messages_lectures ouvre un second chemin
  // dossier_messages -> profiles (via message_id + utilisateur_id) —
  // PostgREST refuse un embed "profiles(nom)" ambigu (erreur PGRST201).
  const { data, error } = await supabase
    .from("dossier_messages")
    .select("id, vv_calculation_id, auteur_id, type, corps, created_at, profiles!dossier_messages_auteur_id_fkey(nom)")
    .eq("vv_calculation_id", calculId)
    .order("created_at", { ascending: true });
  if (error) return [];
  const messages = (data as unknown as Omit<MessageDossier, "lecteurs">[] | null) ?? [];
  if (messages.length === 0) return [];

  const { data: lectures } = await supabase
    .from("dossier_messages_lectures")
    .select("message_id, utilisateur_id, lu_le, profiles(nom)")
    .in(
      "message_id",
      messages.map((m) => m.id)
    );
  const lecteursParMessage = new Map<string, LectureMessage[]>();
  for (const l of (lectures as unknown as { message_id: string; utilisateur_id: string; lu_le: string; profiles: { nom: string } | null }[]) ?? []) {
    const liste = lecteursParMessage.get(l.message_id) ?? [];
    liste.push({ utilisateur_id: l.utilisateur_id, nom: l.profiles?.nom ?? "—", lu_le: l.lu_le });
    lecteursParMessage.set(l.message_id, liste);
  }

  return messages.map((m) => ({ ...m, lecteurs: lecteursParMessage.get(m.id) ?? [] }));
}

// Accusés de lecture (Sprint 31) — appelé à l'ouverture de l'onglet
// Discussion : marque comme lus tous les messages du dossier PAS déjà lus
// par l'utilisateur courant (upsert idempotent, ignore ses propres
// messages — inutile de "lire" ce qu'on a soi-même écrit).
export async function marquerMessagesLus(
  supabase: SupabaseClient,
  calculId: string,
  userId: string
): Promise<void> {
  const { data: messages } = await supabase
    .from("dossier_messages")
    .select("id")
    .eq("vv_calculation_id", calculId)
    .neq("auteur_id", userId);
  if (!messages || messages.length === 0) return;

  await supabase
    .from("dossier_messages_lectures")
    .upsert(
      messages.map((m) => ({ message_id: m.id, utilisateur_id: userId })),
      { onConflict: "message_id,utilisateur_id", ignoreDuplicates: true }
    );
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
