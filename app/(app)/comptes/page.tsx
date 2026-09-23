import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acteurAdminTechnique } from "@/lib/comptes";
import type { UserRole } from "@/lib/roles";
import ComptesClient, { type Compte } from "./comptes-client";

// Console "Comptes" (Sprint 13) — admin_technique uniquement. Un autre rôle
// est renvoyé au tableau de bord (la garde est refaite dans chaque route
// /api/comptes, et la RLS + le trigger 0011 protègent les écritures).
export default async function PageComptes() {
  const acteur = await acteurAdminTechnique();
  if (!acteur) redirect("/accueil");

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: profils } = await supabase
    .from("profiles")
    .select("id, nom, role, bureau, chef_hierarchique_id, actif")
    .order("nom");

  // Email et dernière connexion : uniquement dans auth.users (client admin).
  const { data: liste } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const parId = new Map((liste?.users ?? []).map((u) => [u.id, u]));

  // Comptes "jamais utilisés" : aucune référence dans les 5 clés vers profiles.
  const utilises = new Set<string>();
  const [calculs, historique] = await Promise.all([
    admin.from("vv_calculations").select("created_by, validee_par, soumis_par"),
    admin.from("vv_calculations_historique").select("utilisateur_id"),
  ]);
  for (const c of calculs.data ?? []) {
    for (const v of [c.created_by, c.validee_par, c.soumis_par]) if (v) utilises.add(v);
  }
  for (const h of historique.data ?? []) if (h.utilisateur_id) utilises.add(h.utilisateur_id);
  for (const p of profils ?? []) if (p.chef_hierarchique_id) utilises.add(p.chef_hierarchique_id);

  const formatDate = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleString("fr-FR", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "Africa/Casablanca",
        })
      : "Jamais";

  const comptes: Compte[] = (profils ?? []).map((p) => ({
    id: p.id,
    nom: p.nom,
    email: parId.get(p.id)?.email ?? "—",
    role: p.role as UserRole,
    bureau: p.bureau,
    chefId: p.chef_hierarchique_id,
    actif: p.actif,
    derniereConnexion: formatDate(parId.get(p.id)?.last_sign_in_at),
    supprimable: !utilises.has(p.id) && p.id !== acteur.id,
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-1 text-lg font-bold text-ink">Comptes</h1>
      <p className="mb-6 text-sm text-slate">
        Gestion des utilisateurs : création, rôles, rattachement, activation et mots de passe.
      </p>
      <ComptesClient comptesInitiaux={comptes} moi={acteur.id} />
    </main>
  );
}
