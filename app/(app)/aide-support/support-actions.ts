"use server";

import { createClient } from "@/lib/supabase/server";
import { peutGererSupport, type UserRole } from "@/lib/roles";

// Support technique (Sprint 23). RLS reste la garde réelle
// (support_messages_select / _insert / _update_admin, migration 0018) :
// ces contrôles sont une défense en profondeur / un message d'erreur
// propre, pas la source de vérité.

type Retour = { erreur: string | null };

const STATUTS = ["nouveau", "en_cours", "resolu"] as const;
type Statut = (typeof STATUTS)[number];

export async function envoyerMessage(sujet: string, message: string): Promise<Retour> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: "Session expirée." };

  const sujetPropre = sujet.trim();
  const messagePropre = message.trim();
  if (!sujetPropre || sujetPropre.length > 200) {
    return { erreur: "Le sujet est requis (200 caractères maximum)." };
  }
  if (!messagePropre || messagePropre.length > 5000) {
    return { erreur: "Le message est requis (5000 caractères maximum)." };
  }

  const { error } = await supabase.from("support_messages").insert({
    auteur_id: user.id,
    sujet: sujetPropre,
    message: messagePropre,
  });
  if (error) return { erreur: error.message };
  return { erreur: null };
}

// Répond à un message ET/OU change son statut (les deux capacités décrites
// dans le sprint, réunies en une seule action) : si le champ réponse est
// laissé vide, seul le statut est modifié (ex. passer "en_cours" avant
// d'avoir rédigé la réponse finale).
export async function repondreMessage(
  id: string,
  reponse: string,
  statut: Statut
): Promise<Retour> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: "Session expirée." };

  const { data: profil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!peutGererSupport(profil?.role as UserRole | undefined)) {
    return { erreur: "Accès refusé." };
  }

  if (!STATUTS.includes(statut)) {
    return { erreur: "Statut invalide." };
  }

  const reponsePropre = reponse.trim();
  if (reponsePropre.length > 5000) {
    return { erreur: "La réponse est trop longue (5000 caractères maximum)." };
  }

  const patch: {
    statut: Statut;
    reponse?: string;
    repondu_par?: string;
    repondu_le?: string;
  } = { statut };
  if (reponsePropre) {
    patch.reponse = reponsePropre;
    patch.repondu_par = user.id;
    patch.repondu_le = new Date().toISOString();
  }

  const { error } = await supabase.from("support_messages").update(patch).eq("id", id);
  if (error) return { erreur: error.message };
  return { erreur: null };
}
