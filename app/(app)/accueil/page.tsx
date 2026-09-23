import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LABELS_ROLE, type UserRole } from "@/lib/roles";
import { IconNouveauCalcul, IconRegistre, IconTableauBord } from "../nav-icons";

// Accueil (Sprint 29, point 1) — devient le point d'entrée officiel après
// connexion (redirect() dans app/login/actions.ts et proxy.ts), séparé du
// tableau de bord analytique (désormais /dashboard, son propre onglet de
// nav). Jusqu'au Sprint 24 c'était fusionné en une seule page ; l'utilisateur
// a explicitement demandé la scission inverse.
export default async function AccueilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profil } = await supabase
    .from("profiles")
    .select("nom, role, bureau")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="rounded-md border border-line bg-white p-6">
        <p className="text-sm text-slate">Bienvenue,</p>
        <h1 className="mb-4 text-lg font-bold text-ink">{profil?.nom ?? user.email}</h1>

        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-slate">Rôle</dt>
          <dd className="text-ink">{profil?.role ? LABELS_ROLE[profil.role as UserRole] : "—"}</dd>
          <dt className="text-slate">Bureau</dt>
          <dd className="text-ink">{profil?.bureau ?? "—"}</dd>
        </dl>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/vv/nouveau"
            className="flex items-center justify-center gap-2 rounded bg-signal py-2 text-center text-sm font-medium text-white transition-colors hover:bg-signal-light"
          >
            <IconNouveauCalcul className="h-4 w-4 shrink-0" />
            Nouveau calcul
          </Link>
          <Link
            href="/vv"
            className="flex items-center justify-center gap-2 rounded border border-line py-2 text-center text-sm font-medium text-ink transition-colors hover:bg-slate-50"
          >
            <IconRegistre className="h-4 w-4 shrink-0" />
            Voir les calculs
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded border border-line py-2 text-center text-sm font-medium text-ink transition-colors hover:bg-slate-50"
          >
            <IconTableauBord className="h-4 w-4 shrink-0" />
            Tableau de bord
          </Link>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate">
        Service de calcul de valeur vénale, isolé et appelable — sans donnée de dossier partagée.
      </p>
    </main>
  );
}
