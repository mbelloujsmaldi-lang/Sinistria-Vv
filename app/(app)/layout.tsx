import Link from "next/link";
import LogoutButton from "./logout-button";
import Logo from "../_components/logo";
import { createClient } from "@/lib/supabase/server";
import { peutConsulterAudit, peutEditerReferentiel, type UserRole } from "@/lib/roles";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Le lien "Comptes" n'est qu'un confort d'affichage : la page et les
  // routes /api/comptes refont la garde admin_technique côté serveur.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const estAdmin = profil?.role === "admin_technique";
  const peutReferentiel = peutEditerReferentiel(profil?.role as UserRole | undefined);
  const peutAudit = peutConsulterAudit(profil?.role as UserRole | undefined);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" aria-label="Sinistria Vv — tableau de bord">
            <Logo />
          </Link>
          <nav className="flex items-center gap-5">
            {user && (
              <Link href="/analyse/dashboard" className="text-sm text-slate underline hover:text-ink">
                Analyse
              </Link>
            )}
            {user && (
              <Link href="/analyse/simulateur" className="text-sm text-slate underline hover:text-ink">
                Simulateur
              </Link>
            )}
            {user && (
              <Link href="/analyse/coefficients" className="text-sm text-slate underline hover:text-ink">
                Coefficients
              </Link>
            )}
            {peutReferentiel && (
              <Link href="/referentiel" className="text-sm text-slate underline hover:text-ink">
                Marques &amp; Modèles
              </Link>
            )}
            {estAdmin && (
              <Link href="/comptes" className="text-sm text-slate underline hover:text-ink">
                Comptes
              </Link>
            )}
            {peutAudit && (
              <Link href="/audit" className="text-sm text-slate underline hover:text-ink">
                Journal d&apos;audit
              </Link>
            )}
            <LogoutButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
