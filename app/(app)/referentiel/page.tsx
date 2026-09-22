import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peutEditerReferentiel, type UserRole } from "@/lib/roles";
import { depuisLignes, SELECT_REFERENTIEL } from "@/lib/referentiel-vehicules";
import ReferentielClient from "./referentiel-client";

// Gestion du référentiel Marques & Modèles (Sprint 14) — responsable et
// au-dessus. La garde ci-dessous n'est qu'un reflet côté serveur : le vrai
// contrôle est en base (policies RLS de la migration 0013), qui refuse
// toute écriture d'un rôle inférieur même par appel direct à l'API.
export default async function PageReferentiel() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profiles")
    .select("role, actif")
    .eq("id", user.id)
    .single();
  if (!profil?.actif || !peutEditerReferentiel(profil.role as UserRole)) {
    redirect("/dashboard");
  }

  const { data } = await supabase
    .from("vehicule_marques")
    .select(SELECT_REFERENTIEL)
    .order("nom");

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-1 text-lg font-medium text-ink">Marques &amp; Modèles</h1>
      <p className="mb-6 text-sm text-slate">
        Référentiel des véhicules : marques, modèles et valeur à neuf de référence (VN) suggérée
        dans le formulaire de calcul.
      </p>
      <ReferentielClient marquesInitiales={depuisLignes(data as Parameters<typeof depuisLignes>[0])} />
    </main>
  );
}
