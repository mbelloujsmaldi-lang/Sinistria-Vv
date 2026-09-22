"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Déconnexion (Sprint 22) — Server Action. Doit utiliser le client server
// (lib/supabase/server.ts) : lui seul peut écrire le Set-Cookie qui efface
// effectivement un cookie httpOnly. Le client navigateur ne le pourrait
// plus depuis que la session vit dans un cookie httpOnly (voir
// app/login/actions.ts).
export async function deconnecter(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
