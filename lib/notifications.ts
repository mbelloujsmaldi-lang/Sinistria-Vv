import type { SupabaseClient } from "@supabase/supabase-js";
import { ROLES, peutValider } from "@/lib/roles";

// Notifications (Sprint 27) — clochette in-app, activée par défaut pour
// tous. Remplace le système "proposition d'e-mail" de l'ancien Google
// Apps Script : chaque événement du circuit de validation notifie les
// bonnes personnes directement dans l'appli, pas par e-mail.

export type TypeNotification = "soumission" | "validation" | "rejet" | "revision" | "annonce";

export type Notification = {
  id: string;
  type: TypeNotification;
  titre: string;
  corps: string | null;
  lien: string | null;
  lu: boolean;
  created_at: string;
};

export async function chargerNotifications(
  supabase: SupabaseClient,
  limite = 30
): Promise<{ notifications: Notification[]; nonLues: number }> {
  const { data } = await supabase
    .from("notifications")
    .select("id, type, titre, corps, lien, lu, created_at")
    .order("created_at", { ascending: false })
    .limit(limite);
  const notifications = (data as Notification[] | null) ?? [];
  const nonLues = notifications.filter((n) => !n.lu).length;
  return { notifications, nonLues };
}

export async function marquerNotificationsLues(
  supabase: SupabaseClient,
  ids: string[] | null
): Promise<void> {
  let requete = supabase.from("notifications").update({ lu: true }).eq("lu", false);
  if (ids && ids.length) requete = requete.in("id", ids);
  await requete;
}

const ROLES_VALIDATEURS = ROLES.filter(peutValider);

// Soumission à validation : validateurs (responsable+) du MÊME bureau que
// le créateur du dossier UNIQUEMENT (décision explicite — pas tous les
// validateurs de tous les bureaux).
export async function notifierSoumission(
  supabase: SupabaseClient,
  bureauCreateur: string,
  exclureUserId: string,
  titre: string,
  lien: string
): Promise<void> {
  const { data: destinataires } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ROLES_VALIDATEURS)
    .eq("actif", true)
    .eq("bureau", bureauCreateur);

  const lignes = (destinataires ?? [])
    .filter((p) => p.id !== exclureUserId)
    .map((p) => ({
      destinataire_id: p.id,
      type: "soumission" as const,
      titre,
      lien,
    }));
  if (lignes.length) await supabase.from("notifications").insert(lignes);
}

// Validation / retour pour correction / révision : créateur du dossier +
// tout profil ayant déjà participé à la discussion de ce dossier.
export async function notifierParticipantsDossier(
  supabase: SupabaseClient,
  calculId: string,
  createurId: string,
  exclureUserId: string,
  type: TypeNotification,
  titre: string,
  lien: string
): Promise<void> {
  const { data: messages } = await supabase
    .from("dossier_messages")
    .select("auteur_id")
    .eq("vv_calculation_id", calculId);

  const destinataires = new Set<string>([createurId]);
  (messages ?? []).forEach((m) => destinataires.add(m.auteur_id));
  destinataires.delete(exclureUserId);

  const lignes = Array.from(destinataires).map((id) => ({
    destinataire_id: id,
    type,
    titre,
    lien,
  }));
  if (lignes.length) await supabase.from("notifications").insert(lignes);
}

// Annonce de bureau : tout profil actif du bureau ciblé, sauf l'auteur.
export async function notifierAnnonce(
  supabase: SupabaseClient,
  bureau: string,
  exclureUserId: string,
  titre: string,
  corps: string
): Promise<void> {
  const { data: destinataires } = await supabase
    .from("profiles")
    .select("id")
    .eq("actif", true)
    .eq("bureau", bureau);

  const lignes = (destinataires ?? [])
    .filter((p) => p.id !== exclureUserId)
    .map((p) => ({
      destinataire_id: p.id,
      type: "annonce" as const,
      titre,
      corps,
      lien: "/annonces",
    }));
  if (lignes.length) await supabase.from("notifications").insert(lignes);
}
