import Sidebar from "./sidebar";
import { createClient } from "@/lib/supabase/server";
import { peutConsulterAudit, peutEditerReferentiel, peutValider, LABELS_ROLE, type UserRole } from "@/lib/roles";

// Shell de navigation (Sprint 24, bandeau horizontal → Sprint 28, barre
// latérale repliable) — l'utilisateur a jugé le bandeau devenu trop
// encombrant une fois toutes les tabulations des sprints suivants
// ajoutées. Toute la logique de garde par rôle reste ici (Server
// Component) ; Sidebar (Client Component) ne reçoit que des booléens déjà
// tranchés.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Le lien "Comptes" n'est qu'un confort d'affichage : la page et les
  // routes /api/comptes refont la garde admin_technique côté serveur.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiles").select("nom, role, bureau").eq("id", user.id).single()
    : { data: null };
  const estAdmin = profil?.role === "admin_technique";
  const peutReferentiel = peutEditerReferentiel(profil?.role as UserRole | undefined);
  const peutAudit = peutConsulterAudit(profil?.role as UserRole | undefined);
  const peutValiderDossiers = peutValider(profil?.role as UserRole | undefined);

  // Compteur de la pastille "Validations" (Sprint 27) — un seul petit
  // chiffre, pas une refonte visuelle généralisée du shell.
  let nbEnAttente = 0;
  if (peutValiderDossiers) {
    const { count } = await supabase
      .from("vv_calculations")
      .select("*", { count: "exact", head: true })
      .eq("statut", "soumis");
    nbEnAttente = count ?? 0;
  }

  if (!user) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        estAdmin={estAdmin}
        peutReferentiel={peutReferentiel}
        peutAudit={peutAudit}
        peutValiderDossiers={peutValiderDossiers}
        nbEnAttente={nbEnAttente}
        nom={profil?.nom ?? user.email ?? "?"}
        roleLabel={profil?.role ? LABELS_ROLE[profil.role as UserRole] : "—"}
        bureau={profil?.bureau ?? null}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
