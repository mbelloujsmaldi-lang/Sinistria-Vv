import Link from "next/link";
import LogoutButton from "./logout-button";
import Logo from "../_components/logo";
import AnalyseMenu from "./analyse-menu";
import { createClient } from "@/lib/supabase/server";
import { peutConsulterAudit, peutEditerReferentiel, LABELS_ROLE, type UserRole } from "@/lib/roles";

// Shell de navigation unifié (Sprint 24). Auparavant, "Nouveau calcul" et
// "Registre" (/vv) n'existaient qu'en dur sur /dashboard, absents de ce
// nav — chaque page compensait avec ses propres liens "← Retour..."
// bricolés. Le bloc profil (nom/rôle/bureau) était lui aussi limité à
// /dashboard ; il est maintenant visible sur chaque page, à côté de
// Déconnexion (déjà globale).
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

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/dashboard" aria-label="Sinistria Vv — tableau de bord">
            <Logo />
          </Link>

          {user && (
            <nav className="flex flex-wrap items-center gap-5">
              <Link href="/vv/nouveau" className="text-sm text-slate underline hover:text-ink">
                Nouveau calcul
              </Link>
              <Link href="/vv" className="text-sm text-slate underline hover:text-ink">
                Registre
              </Link>
              <AnalyseMenu />
              {peutReferentiel && (
                <Link href="/referentiel" className="text-sm text-slate underline hover:text-ink">
                  Marques &amp; Modèles
                </Link>
              )}
              {peutAudit && (
                <Link href="/audit" className="text-sm text-slate underline hover:text-ink">
                  Journal d&apos;audit
                </Link>
              )}
              {estAdmin && (
                <Link href="/comptes" className="text-sm text-slate underline hover:text-ink">
                  Comptes
                </Link>
              )}
              <Link href="/aide-support" className="text-sm text-slate underline hover:text-ink">
                Aide &amp; Support
              </Link>
            </nav>
          )}

          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right text-xs leading-tight text-slate">
                <p className="font-medium text-ink">{profil?.nom ?? user.email}</p>
                <p>
                  {profil?.role ? LABELS_ROLE[profil.role as UserRole] : "—"}
                  {profil?.bureau ? ` · ${profil.bureau}` : ""}
                </p>
              </div>
              <LogoutButton />
            </div>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
