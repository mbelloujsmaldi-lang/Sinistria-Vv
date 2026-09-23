import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { peutValider, type UserRole } from "@/lib/roles";
import { LABELS_CATEGORIE } from "@/lib/analyse";
import type { CategorieVehicule } from "@/lib/calcul-vv";
import { IconAlerte, IconHorloge, IconValidations } from "../nav-icons";

const JOUR_MS = 24 * 60 * 60 * 1000;
const SEUIL_RETARD_JOURS = 3;

// File d'attente "Validations" (Sprint 27) — Sprint 29 point 6 : ajoute les
// 3 indicateurs (en attente / durée moyenne de traitement / en retard),
// inspirés du principe d'un exemple externe fourni par l'utilisateur, sans
// en reproduire l'apparence visuelle exacte. Réservée aux profils avec
// pouvoir de validation (peutValider, même palier que ActionsVV et la RLS
// vv_calculations_update_validation).
export default async function PageValidations() {
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
  if (!profil?.actif) redirect("/accueil");
  if (!peutValider(profil.role as UserRole)) redirect("/accueil");

  const { data: dossiers } = await supabase
    .from("vv_calculations")
    .select(
      "id, numero, reference, immatriculation, marque, modele, categorie, valeur_calculee, soumis_le, created_by"
    )
    .eq("statut", "soumis")
    .order("soumis_le", { ascending: true });

  const lignes = dossiers ?? [];

  // Durée moyenne de traitement — sur les dossiers déjà VALIDÉS (soumis_le
  // et valide_le tous deux renseignés) : pas de colonne "rejete_le" sur
  // vv_calculations pour inclure les rejets dans le même calcul, on ne
  // prétend donc mesurer que le circuit qui aboutit à une validation.
  const { data: traites } = await supabase
    .from("vv_calculations")
    .select("soumis_le, valide_le")
    .eq("statut", "valide")
    .not("soumis_le", "is", null)
    .not("valide_le", "is", null)
    .order("valide_le", { ascending: false })
    .limit(200);

  let dureeMoyenneJours: number | null = null;
  if (traites && traites.length > 0) {
    const total = traites.reduce((somme, t) => {
      const debut = new Date(t.soumis_le as string).getTime();
      const fin = new Date(t.valide_le as string).getTime();
      return somme + Math.max(0, fin - debut);
    }, 0);
    dureeMoyenneJours = total / traites.length / JOUR_MS;
  }

  const maintenant = Date.now();
  const nbEnRetard = lignes.filter(
    (l) => l.soumis_le && maintenant - new Date(l.soumis_le).getTime() > SEUIL_RETARD_JOURS * JOUR_MS
  ).length;

  const idsCreateurs = Array.from(new Set(lignes.map((l) => l.created_by).filter(Boolean)));
  const { data: createurs } = idsCreateurs.length
    ? await supabase.from("profiles").select("id, nom").in("id", idsCreateurs)
    : { data: [] as { id: string; nom: string }[] };
  const nomParId = new Map((createurs ?? []).map((c) => [c.id, c.nom]));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-lg font-bold text-ink">Validations</h1>
      <p className="mb-6 text-sm text-slate">File d&apos;attente des dossiers en attente de validation.</p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-line bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-slate">
            <IconValidations className="h-3.5 w-3.5 shrink-0" />
            En attente
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-ink">{lignes.length}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-slate">
            <IconHorloge className="h-3.5 w-3.5 shrink-0" />
            Durée moyenne de traitement
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-ink">
            {dureeMoyenneJours === null ? "—" : `${dureeMoyenneJours.toFixed(1)} j`}
          </p>
          <p className="mt-0.5 text-[11px] text-slate">
            {traites?.length ? `sur ${traites.length} dossier${traites.length > 1 ? "s" : ""} validé${traites.length > 1 ? "s" : ""}` : "aucun dossier validé pour le moment"}
          </p>
        </div>
        <div className={`rounded-md border p-4 ${nbEnRetard > 0 ? "border-error bg-error-bg" : "border-line bg-white"}`}>
          <p
            className={`flex items-center gap-1.5 text-xs uppercase tracking-widest ${nbEnRetard > 0 ? "text-error" : "text-slate"}`}
          >
            <IconAlerte className="h-3.5 w-3.5 shrink-0" />
            En retard (&gt; {SEUIL_RETARD_JOURS} j)
          </p>
          <p className={`mt-1 font-mono text-xl font-bold ${nbEnRetard > 0 ? "text-error" : "text-ink"}`}>
            {nbEnRetard}
          </p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink">File d&apos;attente — Validations</h2>
        <span className="rounded-full bg-warning px-2.5 py-0.5 text-xs font-medium text-canvas">
          {lignes.length} en attente
        </span>
      </div>

      {lignes.length === 0 ? (
        <p className="rounded-md border border-line bg-white p-6 text-center text-sm text-slate">
          Aucun dossier en attente de validation pour le moment.
        </p>
      ) : (
        <ul className="space-y-3">
          {lignes.map((d) => {
            const enRetard =
              !!d.soumis_le && maintenant - new Date(d.soumis_le).getTime() > SEUIL_RETARD_JOURS * JOUR_MS;
            return (
              <li
                key={d.id}
                className={`rounded-md border bg-white p-4 ${enRetard ? "border-error" : "border-line"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-ink">
                      {d.reference} — {d.marque || "—"} {d.modele || ""}
                      {enRetard && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-error px-2 py-0.5 text-[10px] font-medium text-canvas">
                          <IconAlerte className="h-3 w-3 shrink-0" />
                          En retard
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate">
                      {LABELS_CATEGORIE[d.categorie as CategorieVehicule] ?? d.categorie} ·{" "}
                      {d.immatriculation || "sans immat."} · soumis par{" "}
                      {(d.created_by && nomParId.get(d.created_by)) || "—"}
                      {d.soumis_le ? ` le ${new Date(d.soumis_le).toLocaleDateString("fr-MA")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm font-medium text-ink">
                      {Number(d.valeur_calculee).toLocaleString("fr-MA")} DH
                    </span>
                    <Link href={`/vv/${d.id}`} className="text-sm text-signal underline hover:text-signal-light">
                      Examiner
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
