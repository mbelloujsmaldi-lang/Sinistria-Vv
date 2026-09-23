import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ImportClient from "./import-client";

// Import en masse (Sprint 27) — ouvert à tout profil actif, mêmes règles
// que "Nouveau calcul" un par un (RLS vv_calculations_insert, 0012) :
// aucun palier de rôle supplémentaire n'est justifié ici.
export default async function PageImporter() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase.from("profiles").select("actif").eq("id", user.id).single();
  if (!profil?.actif) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-lg font-bold text-ink">Import en masse</h1>
      <p className="mb-6 text-sm text-slate">
        Créer plusieurs dossiers de calcul à partir d&apos;un fichier CSV.
      </p>
      <ImportClient />
    </main>
  );
}
