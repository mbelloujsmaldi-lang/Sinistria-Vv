import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LABELS_ROLE, type UserRole } from "@/lib/roles";

export default async function DashboardPage() {
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

  const { count: nombreCalculs } = await supabase
    .from("vv_calculations")
    .select("*", { count: "exact", head: true });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded border border-line bg-white p-6">
        <p className="text-sm text-slate">Bienvenue,</p>
        <h1 className="mb-4 text-lg font-medium text-ink">
          {profil?.nom ?? user.email}
        </h1>

        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-slate">Rôle</dt>
          <dd className="text-ink">
            {profil?.role ? LABELS_ROLE[profil.role as UserRole] : "—"}
          </dd>
          <dt className="text-slate">Bureau</dt>
          <dd className="text-ink">{profil?.bureau ?? "—"}</dd>
          <dt className="text-slate">Calculs Vv enregistrés</dt>
          <dd className="text-ink">{nombreCalculs ?? 0}</dd>
        </dl>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/vv/nouveau"
            className="block rounded bg-signal py-2 text-center text-sm font-medium text-white transition-colors hover:bg-signal-light"
          >
            Nouveau calcul
          </Link>
          <Link
            href="/vv"
            className="block rounded border border-line py-2 text-center text-sm font-medium text-ink transition-colors hover:bg-slate-50"
          >
            Voir les calculs
          </Link>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate">
        Service de calcul de valeur vénale, isolé et appelable — sans donnée
        de dossier partagée.
      </p>
    </main>
  );
}
