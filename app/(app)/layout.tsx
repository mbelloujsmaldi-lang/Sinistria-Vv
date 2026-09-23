import Link from "next/link";
import Logo from "../_components/logo";
import AnalyseMenu from "./analyse-menu";
import NavLink from "./nav-link";
import NotificationBell from "./notification-bell";
import ProfileMenu from "./profile-menu";
import {
  IconNouveauCalcul,
  IconRegistre,
  IconValidations,
  IconReferentiel,
  IconAudit,
  IconComptes,
  IconAnnonces,
  IconAide,
} from "./nav-icons";
import { createClient } from "@/lib/supabase/server";
import {
  peutConsulterAudit,
  peutEditerReferentiel,
  peutValider,
  LABELS_ROLE,
  type UserRole,
} from "@/lib/roles";

// Shell de navigation unifié (Sprint 24). Auparavant, "Nouveau calcul" et
// "Registre" (/vv) n'existaient qu'en dur sur /dashboard, absents de ce
// nav — chaque page compensait avec ses propres liens "← Retour..."
// bricolés. Le bloc profil (nom/rôle/bureau) était lui aussi limité à
// /dashboard ; il est maintenant visible sur chaque page, à côté de
// Déconnexion (déjà globale).
//
// Bandeau ink plein (Sprint 26, Phase B — direction "Confident System") :
// remplace le bandeau clair + bordure d'origine, jugé plat/sans relief.
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

  // Compteur de la pastille "Validations" (Sprint 27, Phase H) — un seul
  // petit chiffre, pas une refonte visuelle généralisée du shell.
  let nbEnAttente = 0;
  if (peutValiderDossiers) {
    const { count } = await supabase
      .from("vv_calculations")
      .select("*", { count: "exact", head: true })
      .eq("statut", "soumis");
    nbEnAttente = count ?? 0;
  }

  return (
    <div className="min-h-screen">
      <header className="bg-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-2.5">
          <Link href="/dashboard" aria-label="Sinistria Vv — tableau de bord">
            <Logo variante="sombre" hauteur={30} />
          </Link>

          {user && (
            <nav className="flex flex-wrap items-center gap-4">
              <NavLink href="/vv/nouveau" icon={<IconNouveauCalcul />}>
                Nouveau calcul
              </NavLink>
              <NavLink href="/vv" icon={<IconRegistre />}>
                Registre
              </NavLink>
              {peutValiderDossiers && (
                <NavLink href="/validations" icon={<IconValidations />} compteur={nbEnAttente}>
                  Validations
                </NavLink>
              )}
              <AnalyseMenu />
              {peutReferentiel && (
                <NavLink href="/referentiel" icon={<IconReferentiel />}>
                  Marques &amp; Modèles
                </NavLink>
              )}
              {peutAudit && (
                <NavLink href="/audit" icon={<IconAudit />}>
                  Journal d&apos;audit
                </NavLink>
              )}
              {estAdmin && (
                <NavLink href="/comptes" icon={<IconComptes />}>
                  Comptes
                </NavLink>
              )}
              <NavLink href="/annonces" icon={<IconAnnonces />}>
                Annonces
              </NavLink>
              <NavLink href="/aide-support" icon={<IconAide />}>
                Aide &amp; Support
              </NavLink>
            </nav>
          )}

          {user && (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <ProfileMenu
                nom={profil?.nom ?? user.email ?? "?"}
                roleLabel={profil?.role ? LABELS_ROLE[profil.role as UserRole] : "—"}
                bureau={profil?.bureau ?? null}
              />
            </div>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
