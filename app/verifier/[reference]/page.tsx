import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { LABELS_ROLE, type UserRole } from "@/lib/roles";

// Page de vérification publique (Sprint 9) — SANS authentification,
// accessible via le QR code de la fiche PDF. Utilise le client
// service_role (RLS exige normalement un utilisateur authentifié) mais
// ne renvoie au navigateur QUE les champs listés ci-dessous — jamais les
// paramètres de calcul internes (VN, km, catégorie, β, λ, nom du client),
// à l'identique du principe de l'ancien système (Code.gs:284-288).
function masquerImmatriculation(immat: string | null): string {
  if (!immat) return "—";
  return immat.length > 3 ? immat.slice(0, 2) + "••••" + immat.slice(-2) : immat;
}

function formatTTC(montant: number, tauxTva: number | null): string {
  const ttc = `${montant.toLocaleString("fr-MA")} DH TTC`;
  if (tauxTva === null) return ttc;
  const ht = montant / (1 + tauxTva);
  return `${ttc} (${ht.toLocaleString("fr-MA", { maximumFractionDigits: 2 })} DH HT)`;
}

const CARTE = "w-full max-w-sm rounded-lg border border-line bg-white p-6 text-center shadow-sm";

export default async function PageVerificationPublique({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const admin = createAdminClient();

  const { data: calcul } = await admin
    .from("vv_calculations")
    .select(
      "id, numero, reference, statut, marque, immatriculation, valeur_definitive, taux_tva_applique, validee_par, valide_le"
    )
    .eq("reference", reference)
    .single();

  if (!calcul) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className={CARTE}>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-slate">
            Expertise automobile
          </p>
          <h1 className="mb-4 text-lg font-medium text-ink">Vérification de dossier</h1>
          <p className="inline-block rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-700">
            Dossier introuvable
          </p>
          <p className="mt-3 text-xs text-slate">
            Aucun dossier ne correspond à cette référence.
          </p>
        </div>
      </main>
    );
  }

  // Lignée de révision (Sprint 8/9) : ne jamais laisser paraître une
  // donnée périmée comme faisant foi. Si une autre ligne de la même
  // lignée a un revision_index supérieur, cette référence n'est plus la
  // version courante.
  const { data: tip } = await admin
    .from("vv_calculations")
    .select("id, reference")
    .eq("numero", calcul.numero)
    .order("revision_index", { ascending: false })
    .limit(1)
    .single();

  if (tip && tip.id !== calcul.id) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className={CARTE}>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-slate">
            Expertise automobile
          </p>
          <h1 className="mb-4 text-lg font-medium text-ink">Vérification de dossier</h1>
          <p className="inline-block rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-700">
            Document périmé
          </p>
          <p className="mt-3 text-sm text-ink">
            Ce document a été révisé depuis son émission — il ne reflète plus la valeur
            actuelle.
          </p>
          <Link
            href={`/verifier/${tip.reference}`}
            className="mt-4 inline-block rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light"
          >
            Voir la révision en vigueur : {tip.reference}
          </Link>
        </div>
      </main>
    );
  }

  let validateur: { nom: string; role: UserRole } | null = null;
  if (calcul.statut === "valide" && calcul.validee_par) {
    const { data } = await admin
      .from("profiles")
      .select("nom, role")
      .eq("id", calcul.validee_par)
      .single();
    validateur = data;
  }

  const valide = calcul.statut === "valide";

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className={CARTE}>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-slate">
          Expertise automobile
        </p>
        <h1 className="mb-4 text-lg font-medium text-ink">Vérification de dossier</h1>

        {valide ? (
          <p className="inline-block rounded-full border border-signal bg-signal-bg px-4 py-1.5 text-sm font-semibold text-signal">
            ✓ Dossier validé et authentique
          </p>
        ) : (
          <p className="inline-block rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-700">
            ⏳ Dossier non encore validé (statut : {calcul.statut})
          </p>
        )}

        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-left text-sm">
          <div className="flex justify-between border-b border-line pb-2">
            <dt className="text-slate">N° dossier</dt>
            <dd className="text-ink">{calcul.numero}</dd>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <dt className="text-slate">Référence</dt>
            <dd className="font-medium text-ink">{calcul.reference}</dd>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <dt className="text-slate">Marque</dt>
            <dd className="text-ink">{calcul.marque || "—"}</dd>
          </div>
          <div className="flex justify-between pb-2">
            <dt className="text-slate">Immatriculation</dt>
            <dd className="text-ink">{masquerImmatriculation(calcul.immatriculation)}</dd>
          </div>
        </dl>

        {valide && calcul.valeur_definitive !== null && (
          <>
            <p className="mt-4 font-mono text-2xl font-bold text-signal">
              {formatTTC(Number(calcul.valeur_definitive), calcul.taux_tva_applique !== null ? Number(calcul.taux_tva_applique) : null)}
            </p>
            <dl className="mt-3 space-y-2 border-t border-line pt-3 text-left text-sm">
              <div className="flex justify-between border-b border-line pb-2">
                <dt className="text-slate">Validé par</dt>
                <dd className="text-ink">
                  {validateur?.nom ?? "—"}
                  {validateur?.role ? ` · ${LABELS_ROLE[validateur.role]}` : ""}
                </dd>
              </div>
              {calcul.valide_le && (
                <div className="flex justify-between pb-2">
                  <dt className="text-slate">Date de validation</dt>
                  <dd className="text-ink">
                    {new Date(calcul.valide_le).toLocaleDateString("fr-MA")}
                  </dd>
                </div>
              )}
            </dl>
          </>
        )}
      </div>
    </main>
  );
}
