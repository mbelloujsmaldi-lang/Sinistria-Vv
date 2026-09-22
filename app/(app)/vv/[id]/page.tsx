import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { StatutBadge } from "../statut-badge";
import ActionsVV from "./actions-vv";
import PdfVV from "./pdf-vv";
import type { DonneesFiche } from "@/lib/fiche-pdf";
import { peutReviser, LABELS_ROLE, type UserRole } from "@/lib/roles";
import { chargerComparaisonMarche } from "@/lib/comparaison-marche";

// Affiche "X DH TTC (Y DH HT)" — le HT n'est calculable que si un taux de
// TVA a été enregistré pour ce calcul (colonne ajoutée au Sprint 8bis :
// les calculs plus anciens n'en ont pas, et on n'invente pas un taux
// "actuel" rétroactivement, voir 0008_ht_ttc.sql).
function ttcHt(montantTTC: number, tauxTva: number | null, montantHT?: number | null): string {
  const ttc = `${montantTTC.toLocaleString("fr-MA")} DH TTC`;
  const ht = montantHT ?? (tauxTva !== null ? montantTTC / (1 + tauxTva) : null);
  if (ht === null) return ttc;
  return `${ttc} (${ht.toLocaleString("fr-MA", { maximumFractionDigits: 2 })} DH HT)`;
}

export default async function DetailCalculVVPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profil } = await supabase
    .from("profiles")
    .select("nom, role")
    .eq("id", user.id)
    .single();

  const { data: calcul } = await supabase
    .from("vv_calculations")
    .select("*")
    .eq("id", id)
    .single();

  if (!calcul) {
    notFound();
  }

  // Lignée de révision (Sprint 8) : lien vers la ligne précédente et,
  // si elle a été révisée depuis, vers la révision la plus récente.
  const { data: revisionPrecedente } = calcul.revision_de
    ? await supabase
        .from("vv_calculations")
        .select("id, reference")
        .eq("id", calcul.revision_de)
        .single()
    : { data: null };

  const { data: revisionSuivante } = await supabase
    .from("vv_calculations")
    .select("id, reference")
    .eq("revision_de", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const estCreateur = user.id === calcul.created_by;
  const peutModifier = estCreateur && calcul.statut !== "valide";

  let peutReviserCeCalcul = false;
  let validateur: { nom: string; role: UserRole } | null = null;
  if (calcul.statut === "valide" && calcul.validee_par) {
    const { data } = await supabase
      .from("profiles")
      .select("nom, role")
      .eq("id", calcul.validee_par)
      .single();
    validateur = data;
    peutReviserCeCalcul = peutReviser(profil?.role as UserRole | undefined, validateur?.role);
  }

  let createurNom: string | null = null;
  if (calcul.created_by) {
    const { data } = await supabase
      .from("profiles")
      .select("nom")
      .eq("id", calcul.created_by)
      .single();
    createurNom = data?.nom ?? null;
  }

  const nombreOuNull = (v: unknown): number | null =>
    v === null || v === undefined ? null : Number(v);

  const donneesFiche: DonneesFiche = {
    reference: calcul.reference,
    numero: Number(calcul.numero),
    statut: calcul.statut,
    enregistreLe: calcul.created_at,
    referenceDossierExterne: calcul.reference_dossier_externe,
    marque: calcul.marque,
    modele: calcul.modele ?? null,
    immatriculation: calcul.immatriculation,
    categorie: calcul.categorie,
    baremeVersion: calcul.bareme_version,
    carburant: calcul.carburant,
    puissanceFiscale: nombreOuNull(calcul.puissance_fiscale),
    dateMiseCirculation: calcul.date_mise_circulation,
    dateSinistre: calcul.date_sinistre,
    valeurNeuve: Number(calcul.valeur_neuve),
    kilometrageTotal: nombreOuNull(calcul.kilometrage_total),
    entretien: calcul.entretien,
    vvadeSansCorrectif: nombreOuNull(calcul.vvade_sans_correctif),
    correctifBetaPct: nombreOuNull(calcul.correctif_beta_pct),
    correctifBetaMontant: nombreOuNull(calcul.correctif_beta_montant),
    correctifLambdaPct: nombreOuNull(calcul.correctif_lambda_pct),
    correctifLambdaMontant: nombreOuNull(calcul.correctif_lambda_montant),
    correctifCommercialPct: nombreOuNull(calcul.correctif_commercial_pct),
    valeurCalculee: Number(calcul.valeur_calculee),
    valeurDefinitive: nombreOuNull(calcul.valeur_definitive),
    ecartDh: nombreOuNull(calcul.ecart_dh),
    ecartPct: nombreOuNull(calcul.ecart_pct),
    tauxTvaApplique: nombreOuNull(calcul.taux_tva_applique),
    createurNom,
    validateurNom: validateur?.nom ?? null,
    validateurFonction: validateur?.role ? LABELS_ROLE[validateur.role] : null,
    valideLe: calcul.valide_le,
  };

  const comparaison = await chargerComparaisonMarche(supabase, {
    marque: calcul.marque,
    modele: calcul.modele,
    dateMiseCirculation: calcul.date_mise_circulation,
    exclureId: calcul.id,
    valeurDossier: Number(calcul.valeur_definitive ?? calcul.valeur_calculee),
  });

  const { data: historique } = await supabase
    .from("vv_calculations_historique")
    .select("id, action, ancienne_valeur, nouvelle_valeur, observation, created_at, utilisateur_id, profiles(nom)")
    .eq("vv_calculation_id", id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-medium text-ink">
          {calcul.categorie} — {calcul.bareme_version}
        </h1>
        <StatutBadge statut={calcul.statut} />
      </div>

      <p className="mb-2 text-sm font-medium text-ink">Référence : {calcul.reference}</p>

      {(revisionPrecedente || revisionSuivante) && (
        <p className="mb-6 space-x-3 text-xs text-slate">
          {revisionPrecedente && (
            <Link href={`/vv/${revisionPrecedente.id}`} className="underline hover:text-ink">
              ← Version précédente : {revisionPrecedente.reference}
            </Link>
          )}
          {revisionSuivante && (
            <Link href={`/vv/${revisionSuivante.id}`} className="underline hover:text-ink">
              Révision plus récente : {revisionSuivante.reference} →
            </Link>
          )}
        </p>
      )}
      {!revisionPrecedente && !revisionSuivante && <div className="mb-6" />}

      <div className="rounded border border-line bg-white p-6">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate">Réf. dossier externe</dt>
          <dd className="text-ink">{calcul.reference_dossier_externe || "—"}</dd>

          <dt className="text-slate">Valeur à neuf</dt>
          <dd className="text-ink">{Number(calcul.valeur_neuve).toLocaleString("fr-MA")} DH</dd>

          <dt className="text-slate">VVADE sans correctif</dt>
          <dd className="text-ink">
            {Number(calcul.vvade_sans_correctif).toLocaleString("fr-MA")} DH
          </dd>

          <dt className="text-slate">Correctif entretien (β)</dt>
          <dd className="text-ink">
            {(Number(calcul.correctif_beta_pct) * 100).toFixed(1)}% (
            {Number(calcul.correctif_beta_montant).toLocaleString("fr-MA")} DH)
          </dd>

          <dt className="text-slate">Correctif kilométrage (λ)</dt>
          <dd className="text-ink">
            {(Number(calcul.correctif_lambda_pct) * 100).toFixed(1)}% (
            {Number(calcul.correctif_lambda_montant).toLocaleString("fr-MA")} DH)
          </dd>

          <dt className="font-medium text-ink">Valeur calculée</dt>
          <dd className="font-medium text-signal">
            {ttcHt(
              Number(calcul.valeur_calculee),
              calcul.taux_tva_applique !== null ? Number(calcul.taux_tva_applique) : null,
              calcul.vvade_finale_ht !== null ? Number(calcul.vvade_finale_ht) : null
            )}
          </dd>

          {calcul.valeur_definitive && (
            <>
              <dt className="font-medium text-ink">Valeur définitive</dt>
              <dd className="font-medium text-emerald-700">
                {ttcHt(
                  Number(calcul.valeur_definitive),
                  calcul.taux_tva_applique !== null ? Number(calcul.taux_tva_applique) : null
                )}
                {calcul.ecart_dh !== null && (
                  <span className="ml-2 text-xs font-normal text-slate">
                    (écart {Number(calcul.ecart_dh).toLocaleString("fr-MA")} DH ·{" "}
                    {Number(calcul.ecart_pct).toFixed(1)}%)
                  </span>
                )}
              </dd>
            </>
          )}

          {calcul.justification_ecart && (
            <>
              <dt className="text-slate">Justification écart</dt>
              <dd className="text-ink">{calcul.justification_ecart}</dd>
            </>
          )}

          {calcul.motif_rejet && (
            <>
              <dt className="text-slate">Motif de rejet</dt>
              <dd className="text-ink">{calcul.motif_rejet}</dd>
            </>
          )}
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          {(peutModifier || peutReviserCeCalcul) && (
            <Link
              href={`/vv/${calcul.id}/modifier`}
              className="inline-block rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50"
            >
              {peutModifier ? "Modifier" : "Réviser"}
            </Link>
          )}
          <PdfVV donnees={donneesFiche} />
        </div>

        <ActionsVV
          calculId={calcul.id}
          statut={calcul.statut}
          valeurCalculee={Number(calcul.valeur_calculee)}
          creePar={calcul.created_by}
          userId={user.id}
          role={profil?.role ?? null}
        />
      </div>

      <div className="mt-6 rounded border border-line bg-white p-6">
        <h2 className="mb-3 text-sm font-medium text-ink">Comparaison face au marché</h2>
        {comparaison.cas === "insuffisant" && (
          <p className="text-sm text-slate">
            Marque et modèle non renseignés sur ce dossier — comparaison indisponible.
          </p>
        )}
        {comparaison.cas === "aucune" && (
          <p className="text-sm text-slate">Pas assez de données pour comparer.</p>
        )}
        {comparaison.cas === "une" && (
          <p className="text-sm text-ink">
            Un seul autre dossier comparable (même marque, modèle et année de mise en circulation) :
            valeur enregistrée :{" "}
            <span className="font-medium text-signal">
              {comparaison.valeur.toLocaleString("fr-MA")} DH
            </span>
            .
          </p>
        )}
        {comparaison.cas === "plusieurs" && (
          <div className="text-sm text-ink">
            <p className="mb-3 text-slate">
              {comparaison.n} dossiers comparables (même marque, modèle et année de mise en
              circulation), sinistres du{" "}
              {new Date(comparaison.dateMin).toLocaleDateString("fr-MA")} au{" "}
              {new Date(comparaison.dateMax).toLocaleDateString("fr-MA")}.
            </p>
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded bg-canvas p-3">
                <dt className="text-xs text-slate">Moyenne</dt>
                <dd className="mt-1 font-mono font-medium text-ink">
                  {Math.round(comparaison.moyenne).toLocaleString("fr-MA")} DH
                </dd>
              </div>
              <div className="rounded bg-canvas p-3">
                <dt className="text-xs text-slate">Min</dt>
                <dd className="mt-1 font-mono font-medium text-ink">
                  {Math.round(comparaison.min).toLocaleString("fr-MA")} DH
                </dd>
              </div>
              <div className="rounded bg-canvas p-3">
                <dt className="text-xs text-slate">Max</dt>
                <dd className="mt-1 font-mono font-medium text-ink">
                  {Math.round(comparaison.max).toLocaleString("fr-MA")} DH
                </dd>
              </div>
            </dl>
            <p
              className={`mt-3 text-xs font-medium ${
                comparaison.position === "dans_la_fourchette" ? "text-signal" : "text-amber-700"
              }`}
            >
              {comparaison.position === "dans_la_fourchette" &&
                "Ce dossier se situe dans la fourchette du marché."}
              {comparaison.position === "au_dessus_du_max" &&
                "⚠ Ce dossier dépasse le maximum observé sur le marché."}
              {comparaison.position === "en_dessous_du_min" &&
                "⚠ Ce dossier est en-dessous du minimum observé sur le marché."}
            </p>
          </div>
        )}
      </div>

      {(historique ?? []).length > 0 && (
        <div className="mt-6 rounded border border-line bg-white p-6">
          <h2 className="mb-3 text-sm font-medium text-ink">Historique</h2>
          <ul className="space-y-3 text-sm">
            {(historique ?? []).map((h) => (
              <li key={h.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <p className="text-ink">
                  <span className="font-medium">
                    {(h.profiles as unknown as { nom: string } | null)?.nom ?? "—"}
                  </span>{" "}
                  — {h.action}
                  {h.observation ? ` — ${h.observation}` : ""}
                </p>
                {(h.ancienne_valeur !== null || h.nouvelle_valeur !== null) && (
                  <p className="text-xs text-slate">
                    {h.ancienne_valeur !== null &&
                      `Ancienne : ${ttcHt(
                        Number(h.ancienne_valeur),
                        calcul.taux_tva_applique !== null ? Number(calcul.taux_tva_applique) : null
                      )}`}
                    {h.ancienne_valeur !== null && h.nouvelle_valeur !== null && " → "}
                    {h.nouvelle_valeur !== null &&
                      `Nouvelle : ${ttcHt(
                        Number(h.nouvelle_valeur),
                        calcul.taux_tva_applique !== null ? Number(calcul.taux_tva_applique) : null
                      )}`}
                  </p>
                )}
                <p className="text-xs text-slate">
                  {new Date(h.created_at).toLocaleString("fr-MA")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-xs text-slate">
        <Link href="/vv" className="underline hover:text-ink">
          ← Retour à la liste des calculs
        </Link>
      </p>
    </main>
  );
}
