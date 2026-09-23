"use server";

import { createClient } from "@/lib/supabase/server";
import { notifierAnnonce } from "@/lib/notifications";

// Annonces de bureau (Sprint 27) — publication réservée à admin_technique
// (RLS bureau_annonces_insert, 0019), lecture réservée au bureau ciblé
// (bureau_annonces_select). Diffuse aussi une notification à tous les
// profils actifs de ce bureau.
type Retour = { erreur: string | null };

export async function publierAnnonce(bureau: string, titre: string, corps: string): Promise<Retour> {
  const b = bureau.trim();
  const t = titre.trim();
  const c = corps.trim();
  if (!b) return { erreur: "Bureau requis." };
  if (!t) return { erreur: "Titre requis." };
  if (!c) return { erreur: "Message requis." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: "Session expirée." };

  const { error } = await supabase
    .from("bureau_annonces")
    .insert({ auteur_id: user.id, bureau: b, titre: t, corps: c });
  if (error) return { erreur: error.message };

  try {
    await notifierAnnonce(supabase, b, user.id, t, c);
  } catch {
    /* la notification ne doit jamais bloquer la publication */
  }

  return { erreur: null };
}
