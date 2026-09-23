import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LABELS_ROLE, type UserRole } from "@/lib/roles";
import ProfilClient from "./profil-client";

// Mon profil (Sprint 27) — accessible depuis le nouveau menu Profil
// compact du bandeau. Rôle et bureau affichés en lecture seule (colonnes
// protégées, réservées à admin_technique — voir profil-actions.ts) ;
// seul le nom est modifiable par soi-même.
export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profiles")
    .select("nom, role, bureau, actif")
    .eq("id", user.id)
    .single();
  if (!profil?.actif) redirect("/accueil");

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="mb-1 text-lg font-bold text-ink">Mon profil</h1>
      <p className="mb-6 text-sm text-slate">Informations de votre compte.</p>

      <ProfilClient
        nom={profil.nom}
        email={user.email ?? ""}
        roleLabel={LABELS_ROLE[profil.role as UserRole]}
        bureau={profil.bureau}
      />
    </main>
  );
}
