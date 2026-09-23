import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { peutValider, type UserRole } from "@/lib/roles";
import { LABELS_CATEGORIE } from "@/lib/analyse";
import type { CategorieVehicule } from "@/lib/calcul-vv";
import { StatutBadge } from "../vv/statut-badge";
import { IconAlerte, IconHorloge, IconValidations, IconFileAttente, IconHistorique } from "../nav-icons";

const JOUR_MS = 24 * 60 * 60 * 1000;
const SEUIL_RETARD_JOURS = 3;

// Durée écoulée en toutes lettres (Sprint 30, point 4) — ans/mois/jours,
// unités décroissantes, seulement celles pertinentes (pas de "0 mois").
// Approximation calendaire volontaire (mois = 30j, an = 365j) : suffisant
// pour un indicateur de retard, pas un décompte comptable exact.
function dureeEcoulee(ms: number): string {
  const jours = Math.floor(ms / JOUR_MS);
  if (jours < 1) return "moins d'un jour";
  const ans = Math.floor(jours / 365);
  const moisRestants = Math.floor((jours % 365) / 30);
  const joursRestants = jours % 30;
  const parts: string[] = [];
  if (ans > 0) parts.push(`${ans} an${ans > 1 ? "s" : ""}`);
  if (moisRestants > 0) parts.push(`${moisRestants} mois`);
  if (ans === 0 && joursRestants > 0) parts.push(`${joursRestants} jour${joursRestants > 1 ? "s" : ""}`);
  return parts.join(" et ");
}

// File d'attente + Historique "Validations" (Sprint 27, étendu Sprint 30) —
// 2 sous-onglets pilotés par ?onglet= (mêmes principes que le Registre :
// état dans l'URL, partageable par lien, pas de useState). Réservée aux
// profils avec pouvoir de validation (peutValider, même palier que
// ActionsVV et la RLS vv_calculations_update_validation).
export default async function PageValidations({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const ongletBrut = Array.isArray(sp.onglet) ? sp.onglet[0] : sp.onglet;
  const onglet = ongletBrut === "historique" ? "historique" : "attente";

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

  // Historique (Sprint 30, point 5) — journal des DÉCISIONS (validation /
  // retour pour correction), pas un second filtre sur vv_calculations : la
  // seule source qui porte un horodatage fiable pour un rejet est
  // vv_calculations_historique (vv_calculations n'a pas de "rejete_le").
  type EvenementHistorique = {
    id: string;
    vv_calculation_id: string;
    action: string;
    created_at: string;
    utilisateur_id: string;
    observation: string | null;
  };
  let evenements: EvenementHistorique[] = [];
  let dossiersHistoriqueParId = new Map<
    string,
    { reference: string; marque: string | null; modele: string | null; immatriculation: string | null; valeur_definitive: number | null; statut: string }
  >();
  let nomDecideurParId = new Map<string, string>();

  if (onglet === "historique") {
    const { data: ev } = await supabase
      .from("vv_calculations_historique")
      .select("id, vv_calculation_id, action, created_at, utilisateur_id, observation")
      .in("action", ["Validation", "Retour pour correction"])
      .order("created_at", { ascending: false })
      .limit(100);
    evenements = ev ?? [];

    const idsDossiers = Array.from(new Set(evenements.map((e) => e.vv_calculation_id)));
    const { data: dossiersHist } = idsDossiers.length
      ? await supabase
          .from("vv_calculations")
          .select("id, reference, marque, modele, immatriculation, valeur_definitive, statut")
          .in("id", idsDossiers)
      : { data: [] as { id: string; reference: string; marque: string | null; modele: string | null; immatriculation: string | null; valeur_definitive: number | null; statut: string }[] };
    dossiersHistoriqueParId = new Map((dossiersHist ?? []).map((d) => [d.id, d]));

    const idsDecideurs = Array.from(new Set(evenements.map((e) => e.utilisateur_id)));
    const { data: decideurs } = idsDecideurs.length
      ? await supabase.from("profiles").select("id, nom").in("id", idsDecideurs)
      : { data: [] as { id: string; nom: string }[] };
    nomDecideurParId = new Map((decideurs ?? []).map((d) => [d.id, d.nom]));
  }

  function urlOnglet(o: "attente" | "historique"): string {
    return o === "attente" ? "/validations" : "/validations?onglet=historique";
  }

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

      <div className="mb-4 flex gap-1 border-b border-line">
        <Link
          href={urlOnglet("attente")}
          className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
            onglet === "attente"
              ? "border-signal text-signal"
              : "border-transparent text-slate hover:text-ink"
          }`}
        >
          <IconFileAttente className="h-4 w-4 shrink-0" />
          File d&apos;attente
        </Link>
        <Link
          href={urlOnglet("historique")}
          className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
            onglet === "historique"
              ? "border-signal text-signal"
              : "border-transparent text-slate hover:text-ink"
          }`}
        >
          <IconHistorique className="h-4 w-4 shrink-0" />
          Historique
        </Link>
      </div>

      {onglet === "attente" ? (
        <>
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
                          En retard · {dureeEcoulee(maintenant - new Date(d.soumis_le as string).getTime())}
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
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink">Historique des décisions</h2>
            <span className="rounded-full bg-slate px-2.5 py-0.5 text-xs font-medium text-canvas">
              {evenements.length} dernières
            </span>
          </div>

          {evenements.length === 0 ? (
            <p className="rounded-md border border-line bg-white p-6 text-center text-sm text-slate">
              Aucune décision de validation enregistrée pour le moment.
            </p>
          ) : (
            <ul className="space-y-3">
              {evenements.map((e) => {
                const dossier = dossiersHistoriqueParId.get(e.vv_calculation_id);
                const estValidation = e.action === "Validation";
                return (
                  <li key={e.id} className="rounded-md border border-line bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium text-ink">
                          {dossier?.reference ?? "—"} — {dossier?.marque || "—"} {dossier?.modele || ""}
                          {dossier && <StatutBadge statut={dossier.statut} />}
                        </p>
                        <p className="text-xs text-slate">
                          {dossier?.immatriculation || "sans immat."} ·{" "}
                          {estValidation ? "validé" : "retourné pour correction"} par{" "}
                          {nomDecideurParId.get(e.utilisateur_id) || "—"} le{" "}
                          {new Date(e.created_at).toLocaleDateString("fr-MA")}
                          {e.observation ? ` · ${e.observation}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {dossier?.valeur_definitive !== null && dossier?.valeur_definitive !== undefined && (
                          <span className="font-mono text-sm font-medium text-ink">
                            {Number(dossier.valeur_definitive).toLocaleString("fr-MA")} DH
                          </span>
                        )}
                        <Link
                          href={`/vv/${e.vv_calculation_id}`}
                          className="text-sm text-signal underline hover:text-signal-light"
                        >
                          Examiner
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
