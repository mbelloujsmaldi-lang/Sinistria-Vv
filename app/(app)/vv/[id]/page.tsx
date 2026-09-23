import type { ComponentType } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { StatutBadge, ActionHistoriqueBadge } from "../statut-badge";
import ActionsVV from "./actions-vv";
import PdfVV from "./pdf-vv";
import Discussion from "./discussion";
import Pipeline from "./pipeline";
import {
  IconModifier,
  IconDossier,
  IconCalculatrice,
  IconComparaison,
  IconValidations,
  IconHistorique,
  IconDiscussion,
} from "../../nav-icons";
import type { DonneesFiche } from "@/lib/fiche-pdf";
import { peutReviser, peutValider, LABELS_ROLE, type UserRole } from "@/lib/roles";
import { chargerComparaisonMarche } from "@/lib/comparaison-marche";
import { chargerMessages } from "@/lib/messagerie";

const ONGLETS = ["dossier", "calcule", "vam", "validation", "historique", "discussion"] as const;
type Onglet = (typeof ONGLETS)[number];

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sp = await searchParams;
  const ongletBrut = Array.isArray(sp.onglet) ? sp.onglet[0] : sp.onglet;
  const onglet: Onglet = (ONGLETS as readonly string[]).includes(ongletBrut ?? "")
    ? (ongletBrut as Onglet)
    : "dossier";

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

  // Discussion (Sprint 27) : réservée aux participants (créateur +
  // validateurs), miroir de la RLS dossier_messages_select (0019) — un
  // non-participant ne verrait de toute façon rien via la RLS, l'onglet
  // lui-même n'est donc pas proposé.
  const estParticipant = estCreateur || peutValider(profil?.role as UserRole | undefined);

  // Chaque onglet coûteux n'est interrogé QUE s'il est actif (même principe
  // que Validations, Sprint 30, point 5) — éviter 4 requêtes à chaque
  // chargement de page alors qu'une seule vue est affichée à la fois.
  const comparaison =
    onglet === "vam"
      ? await chargerComparaisonMarche(supabase, {
          marque: calcul.marque,
          modele: calcul.modele,
          dateMiseCirculation: calcul.date_mise_circulation,
          exclureId: calcul.id,
          valeurDossier: Number(calcul.valeur_definitive ?? calcul.valeur_calculee),
        })
      : null;

  const { data: historique } =
    onglet === "historique"
      ? await supabase
          .from("vv_calculations_historique")
          .select("id, action, ancienne_valeur, nouvelle_valeur, observation, created_at, utilisateur_id, profiles(nom)")
          .eq("vv_calculation_id", id)
          .order("created_at", { ascending: false })
      : { data: null };

  const messages = onglet === "discussion" && estParticipant ? await chargerMessages(supabase, id) : [];

  function urlOnglet(o: Onglet): string {
    return o === "dossier" ? `/vv/${id}` : `/vv/${id}?onglet=${o}`;
  }

  const TABS: { cle: Onglet; label: string; icone: ComponentType<{ className?: string }> }[] = [
    { cle: "dossier", label: "Dossier", icone: IconDossier },
    { cle: "calcule", label: "Calculé", icone: IconCalculatrice },
    { cle: "vam", label: "VAM", icone: IconComparaison },
    { cle: "validation", label: "Validation", icone: IconValidations },
    { cle: "historique", label: "Historique", icone: IconHistorique },
    ...(estParticipant ? [{ cle: "discussion" as Onglet, label: "Discussion", icone: IconDiscussion }] : []),
  ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink">
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

      <div className="rounded-md border border-line bg-white p-6">
        <Pipeline statut={calcul.statut} />
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.cle}
            href={urlOnglet(t.cle)}
            className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
              onglet === t.cle ? "border-signal text-signal" : "border-transparent text-slate hover:text-ink"
            }`}
          >
            <t.icone className="h-4 w-4 shrink-0" />
            {t.label}
          </Link>
        ))}
      </div>

      {onglet === "dossier" && (
        <div className="mt-6 rounded-md border border-line bg-white p-6">
          <p className="mb-4 text-xs text-slate">
            Données du dossier, à commencer par la carte grise — saisies manuellement aujourd&apos;hui ;
            une lecture automatique par agent IA est prévue prochainement.
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Réf. dossier externe</dt>
              <dd className="text-ink">{calcul.reference_dossier_externe || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Marque / Modèle</dt>
              <dd className="text-ink">
                {calcul.marque || "—"} {calcul.modele || ""}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Immatriculation</dt>
              <dd className="text-ink">{calcul.immatriculation || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Carburant</dt>
              <dd className="text-ink">{calcul.carburant || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Puissance fiscale</dt>
              <dd className="text-ink">{calcul.puissance_fiscale ?? "—"} CV</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Date de mise en circulation</dt>
              <dd className="text-ink">
                {new Date(calcul.date_mise_circulation).toLocaleDateString("fr-MA")}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Date du sinistre</dt>
              <dd className="text-ink">{new Date(calcul.date_sinistre).toLocaleDateString("fr-MA")}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Kilométrage</dt>
              <dd className="text-ink">
                {calcul.kilometrage_total !== null
                  ? `${Number(calcul.kilometrage_total).toLocaleString("fr-MA")} km`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Entretien</dt>
              <dd className="text-ink">{calcul.entretien || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Créé par</dt>
              <dd className="text-ink">{createurNom || "—"}</dd>
            </div>
          </dl>

          {(peutModifier || peutReviserCeCalcul) && (
            <div className="mt-6 border-t border-line pt-4">
              <Link
                href={`/vv/${calcul.id}/modifier`}
                className="inline-flex items-center gap-2 rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50"
              >
                <IconModifier className="h-4 w-4 shrink-0" />
                {peutModifier ? "Modifier" : "Réviser"}
              </Link>
            </div>
          )}
        </div>
      )}

      {onglet === "calcule" && (
        <div className="mt-6 rounded-md border border-line bg-white p-6">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Valeur à neuf</dt>
              <dd className="text-ink">{Number(calcul.valeur_neuve).toLocaleString("fr-MA")} DH</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">VVADE sans correctif</dt>
              <dd className="text-ink">
                {Number(calcul.vvade_sans_correctif).toLocaleString("fr-MA")} DH
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Correctif entretien (β)</dt>
              <dd className="text-ink">
                {(Number(calcul.correctif_beta_pct) * 100).toFixed(1)}% (
                {Number(calcul.correctif_beta_montant).toLocaleString("fr-MA")} DH)
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Correctif kilométrage (λ)</dt>
              <dd className="text-ink">
                {(Number(calcul.correctif_lambda_pct) * 100).toFixed(1)}% (
                {Number(calcul.correctif_lambda_montant).toLocaleString("fr-MA")} DH)
              </dd>
            </div>
            {calcul.correctif_commercial_pct !== null && Number(calcul.correctif_commercial_pct) !== 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate">Correctif commercial</dt>
                <dd className="text-ink">{Number(calcul.correctif_commercial_pct).toFixed(1)}%</dd>
              </div>
            )}
          </dl>

          <div className="mt-5 rounded-md bg-canvas p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">Valeur calculée</span>
              <span className="font-medium text-signal">
                {ttcHt(
                  Number(calcul.valeur_calculee),
                  calcul.taux_tva_applique !== null ? Number(calcul.taux_tva_applique) : null,
                  calcul.vvade_finale_ht !== null ? Number(calcul.vvade_finale_ht) : null
                )}
              </span>
            </div>
            {calcul.valeur_definitive && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                <span className="text-sm font-medium text-ink">Valeur définitive</span>
                <span className="font-medium text-emerald-700">
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
                </span>
              </div>
            )}
            {calcul.justification_ecart && (
              <p className="mt-2 border-t border-line pt-2 text-xs text-slate">
                Justification de l&apos;écart : <span className="text-ink">{calcul.justification_ecart}</span>
              </p>
            )}
            {calcul.motif_rejet && (
              <p className="mt-2 border-t border-error/30 pt-2 text-xs text-error">
                Motif de rejet : {calcul.motif_rejet}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            {(peutModifier || peutReviserCeCalcul) && calcul.statut !== "valide" && (
              <Link
                href={`/vv/${calcul.id}/modifier`}
                className="inline-flex items-center gap-2 rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50"
              >
                <IconModifier className="h-4 w-4 shrink-0" />
                Modifier la méthode de calcul
              </Link>
            )}
            {peutReviserCeCalcul && calcul.statut === "valide" && (
              <Link
                href={`/vv/${calcul.id}/modifier`}
                className="inline-flex items-center gap-2 rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50"
              >
                <IconModifier className="h-4 w-4 shrink-0" />
                Réviser
              </Link>
            )}
            <PdfVV donnees={donneesFiche} />
          </div>
        </div>
      )}

      {onglet === "vam" && (
        <div className="mt-6 rounded-md border border-line bg-white p-6">
          <p className="mb-3 text-xs text-slate">
            VAM — valeur au marché, comparée aux autres dossiers validés (même marque, modèle et année
            de mise en circulation). Alimentée automatiquement aujourd&apos;hui ; enrichie par agent IA
            prochainement.
          </p>
          {comparaison?.cas === "insuffisant" && (
            <p className="text-sm text-slate">
              Marque et modèle non renseignés sur ce dossier — comparaison indisponible.
            </p>
          )}
          {comparaison?.cas === "aucune" && (
            <p className="text-sm text-slate">Pas assez de données pour comparer.</p>
          )}
          {comparaison?.cas === "une" && (
            <p className="text-sm text-ink">
              Un seul autre dossier comparable (même marque, modèle et année de mise en circulation) :
              valeur enregistrée :{" "}
              <span className="font-medium text-signal">
                {comparaison.valeur.toLocaleString("fr-MA")} DH
              </span>
              .
            </p>
          )}
          {comparaison?.cas === "plusieurs" && (
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
      )}

      {onglet === "validation" && (
        <div className="mt-6 rounded-md border border-line bg-white p-6">
          <ActionsVV
            calculId={calcul.id}
            statut={calcul.statut}
            valeurCalculee={Number(calcul.valeur_calculee)}
            creePar={calcul.created_by}
            userId={user.id}
            role={profil?.role ?? null}
          />
        </div>
      )}

      {onglet === "historique" && (
        <div className="mt-6 rounded-md border border-line bg-white p-6">
          {(historique ?? []).length === 0 ? (
            <p className="text-sm text-slate">Aucun évènement enregistré pour ce dossier.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {(historique ?? []).map((h) => (
                <li key={h.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                  <p className="flex flex-wrap items-center gap-2 text-ink">
                    <span className="font-medium">
                      {(h.profiles as unknown as { nom: string } | null)?.nom ?? "—"}
                    </span>
                    <ActionHistoriqueBadge action={h.action} />
                    {h.observation ? <span>— {h.observation}</span> : null}
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
          )}
        </div>
      )}

      {onglet === "discussion" && estParticipant && (
        <div className="mt-6 rounded-md border border-line bg-white p-6">
          <Discussion calculId={id} messages={messages} userId={user.id} />
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
