import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatutBadge } from "./statut-badge";

export default async function ListeCalculsVVPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: calculs } = await supabase
    .from("vv_calculations")
    .select(
      "id, categorie, bareme_version, valeur_neuve, valeur_calculee, valeur_definitive, statut, reference_dossier_externe, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-baseline gap-2">
        <span className="text-xl font-semibold tracking-tight text-ink">Sinistria</span>
        <span className="rounded bg-signal-bg px-1.5 py-0.5 text-xs font-medium text-signal">
          VV
        </span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium text-ink">Calculs de valeur vénale</h1>
        <Link
          href="/vv/nouveau"
          className="rounded bg-signal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-signal-light"
        >
          Nouveau calcul
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs uppercase text-slate">
            <tr>
              <th className="px-4 py-2">Catégorie</th>
              <th className="px-4 py-2">Barème</th>
              <th className="px-4 py-2">Réf. dossier</th>
              <th className="px-4 py-2">Valeur calculée</th>
              <th className="px-4 py-2">Valeur définitive</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(calculs ?? []).map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2 text-ink">{c.categorie}</td>
                <td className="px-4 py-2 text-slate">{c.bareme_version}</td>
                <td className="px-4 py-2 text-slate">
                  {c.reference_dossier_externe || "—"}
                </td>
                <td className="px-4 py-2 text-ink">
                  {Number(c.valeur_calculee).toLocaleString("fr-MA")} DH
                </td>
                <td className="px-4 py-2 text-ink">
                  {c.valeur_definitive
                    ? `${Number(c.valeur_definitive).toLocaleString("fr-MA")} DH`
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  <StatutBadge statut={c.statut} />
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/vv/${c.id}`} className="text-signal underline">
                    Détail
                  </Link>
                </td>
              </tr>
            ))}
            {(calculs ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate">
                  Aucun calcul enregistré pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-slate">
        <Link href="/dashboard" className="underline hover:text-ink">
          ← Retour au tableau de bord
        </Link>
      </p>
    </main>
  );
}
