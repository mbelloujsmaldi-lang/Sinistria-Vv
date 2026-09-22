import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peutConsulterAudit, type UserRole } from "@/lib/roles";
import { chargerJournalUnifie, type FiltresAudit } from "@/lib/audit";

const CHAMP =
  "w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal";

// Journal d'audit unifié (Sprint 15) — responsable et au-dessus. La garde
// ci-dessous n'est qu'un reflet côté serveur : la vraie protection est la
// RLS de journal_audit (lecture responsable+, 0014) et le fait que
// vv_calculations_historique exige déjà une session pour être lu.
export default async function PageAudit({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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
  if (!profil?.actif || !peutConsulterAudit(profil.role as UserRole)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const uneVal = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const filtres: FiltresAudit = {
    utilisateur: uneVal(sp.utilisateur) || undefined,
    action: uneVal(sp.action) || undefined,
    depuis: uneVal(sp.depuis) || undefined,
    jusqu: uneVal(sp.jusqu) || undefined,
  };

  const entrees = await chargerJournalUnifie(supabase, filtres);

  const paramsExport = new URLSearchParams();
  if (filtres.utilisateur) paramsExport.set("utilisateur", filtres.utilisateur);
  if (filtres.action) paramsExport.set("action", filtres.action);
  if (filtres.depuis) paramsExport.set("depuis", filtres.depuis);
  if (filtres.jusqu) paramsExport.set("jusqu", filtres.jusqu);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-1 text-lg font-medium text-ink">Journal d&apos;audit</h1>
      <p className="mb-6 text-sm text-slate">
        Actions sur les calculs, les comptes, et tentatives de connexion refusées — {entrees.length}{" "}
        entrée{entrees.length > 1 ? "s" : ""}.
      </p>

      <form
        method="get"
        className="mb-4 grid gap-3 rounded border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div>
          <label htmlFor="utilisateur" className="mb-1 block text-xs text-slate">
            Utilisateur
          </label>
          <input
            id="utilisateur"
            name="utilisateur"
            defaultValue={filtres.utilisateur ?? ""}
            className={CHAMP}
            placeholder="Nom…"
          />
        </div>
        <div>
          <label htmlFor="action" className="mb-1 block text-xs text-slate">
            Action
          </label>
          <input
            id="action"
            name="action"
            defaultValue={filtres.action ?? ""}
            className={CHAMP}
            placeholder="Ex. Validation…"
          />
        </div>
        <div>
          <label htmlFor="depuis" className="mb-1 block text-xs text-slate">
            Depuis
          </label>
          <input
            id="depuis"
            name="depuis"
            type="date"
            defaultValue={filtres.depuis ?? ""}
            className={CHAMP}
          />
        </div>
        <div>
          <label htmlFor="jusqu" className="mb-1 block text-xs text-slate">
            Jusqu&apos;au
          </label>
          <input
            id="jusqu"
            name="jusqu"
            type="date"
            defaultValue={filtres.jusqu ?? ""}
            className={CHAMP}
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 rounded bg-signal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-signal-light"
          >
            Filtrer
          </button>
          <a href="/audit" className="rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-canvas">
            Réinitialiser
          </a>
        </div>
      </form>

      <div className="mb-4">
        <a
          href={`/api/audit/export?${paramsExport.toString()}`}
          className="text-sm text-signal underline hover:text-signal-light"
        >
          Exporter en CSV ({entrees.length} ligne{entrees.length > 1 ? "s" : ""})
        </a>
      </div>

      <div className="overflow-x-auto rounded border border-line bg-white">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-slate">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Utilisateur</th>
              <th className="px-3 py-2 font-medium">Rôle</th>
              <th className="px-3 py-2 font-medium">Dossier</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Ancienne valeur</th>
              <th className="px-3 py-2 font-medium">Nouvelle valeur</th>
              <th className="px-3 py-2 font-medium">Observation</th>
            </tr>
          </thead>
          <tbody>
            {entrees.map((e) => (
              <tr key={`${e.source}-${e.id}`} className="border-b border-line last:border-0 align-top">
                <td className="whitespace-nowrap px-3 py-2 text-slate">
                  {new Date(e.date).toLocaleString("fr-MA", { timeZone: "Africa/Casablanca" })}
                </td>
                <td className="px-3 py-2 text-ink">{e.utilisateur}</td>
                <td className="px-3 py-2 text-slate">{e.role}</td>
                <td className="px-3 py-2 text-slate">{e.dossier ?? "—"}</td>
                <td className="px-3 py-2 text-ink">{e.action}</td>
                <td className="px-3 py-2 text-slate">{e.ancienneValeur ?? "—"}</td>
                <td className="px-3 py-2 text-slate">{e.nouvelleValeur ?? "—"}</td>
                <td className="px-3 py-2 text-slate">{e.observation ?? "—"}</td>
              </tr>
            ))}
            {entrees.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate">
                  Aucune entrée pour ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
