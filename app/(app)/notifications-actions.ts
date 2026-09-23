"use server";

import { createClient } from "@/lib/supabase/server";
import { chargerNotifications, marquerNotificationsLues } from "@/lib/notifications";
import type { Notification } from "@/lib/notifications";

// Clochette de notifications (Sprint 27) — appelées directement depuis le
// composant client (pas de formulaire), mêmes principe que logout-button.tsx
// (Sprint 22) : Server Action invoquée par clic/minuterie, jamais un appel
// HTTP interne.
export async function obtenirNotifications(): Promise<{
  notifications: Notification[];
  nonLues: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { notifications: [], nonLues: 0 };
  return chargerNotifications(supabase);
}

export async function marquerLues(ids: string[] | null): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await marquerNotificationsLues(supabase, ids);
  return { ok: true };
}
