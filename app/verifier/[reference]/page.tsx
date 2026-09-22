import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import Link from "next/link";
import { LABELS_ROLE, type UserRole } from "@/lib/roles";
import Logo from "../../_components/logo";

// Page de vérification publique (Sprint 9) — SANS authentification,
// accessible via le QR code de la fiche PDF. Utilise le client
// service_role (RLS exige normalement un utilisateur authentifié) mais
// ne renvoie au navigateur QUE les champs listés ci-dessous — jamais les
// paramètres de calcul internes (VN, km, catégorie, β, λ, nom du client),
// à l'identique du principe de l'ancien système (Code.gs:284-288).

// Limitation de débit (Sprint 21, rapport d'audit Sprint 20 point #3) — PAR
// IP, pas globale : contrairement à vv_api_calls (0006) et
// journal_audit_connexion_calls (0014), cette page reçoit un trafic public
// légitime et simultané (chaque client scanne SA propre fiche), un
// compteur global bloquerait des utilisateurs innocents à cause du trafic
// des autres. Seuil choisi par analogie avec /api/connexion-refusee (0014,
// 10/minute — même ordre de grandeur pour un usage humain occasionnel) :
// large pour un utilisateur légitime qui recharge ou repartage son lien
// (1-2 requêtes), trivialement dépassé par un balayage séquentiel des
// références (VV-000001, VV-000002...).
const LIMITE_PAR_IP_PAR_MINUTE = 10;

async function debitDepasse(): Promise<boolean> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";

  const admin = createAdminClient();

  await admin
    .from("verifier_rate_calls")
    .delete()
    .lt("called_at", new Date(Date.now() - 2 * 60 * 1000).toISOString());

  await admin.from("verifier_rate_calls").insert({ ip });

  const { count } = await admin
    .from("verifier_rate_calls")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gt("called_at", new Date(Date.now() - 60 * 1000).toISOString());

  return (count ?? 0) > LIMITE_PAR_IP_PAR_MINUTE;
}

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

// En-tête commun aux 3 états de la page : le même composant Logo que le
// reste du produit, pour un tiers qui arrive ici depuis le QR code.
function EnTete() {
  return (
    <div className="mb-4 flex flex-col items-center gap-2">
      <Logo />
      <p className="text-xs font-medium uppercase tracking-widest text-slate">
        Expertise automobile
      </p>
    </div>
  );
}

// Réponse commune à "référence inexistante" ET "débit dépassé" — le
// dépassement ne doit jamais être distingué d'une référence introuvable
// (sinon un balayeur détecte lui-même le blocage et adapte son rythme).
function Introuvable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className={CARTE}>
        <EnTete />
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

export default async function PageVerificationPublique({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  // Enregistré avant toute recherche en base, comme /api/calculer et
  // /api/connexion-refusee : un balayage doit être bloqué même s'il ne
  // trouve jamais de référence valide.
  if (await debitDepasse()) {
    return <Introuvable />;
  }

  const admin = createAdminClient();

  const { data: calcul } = await admin
    .from("vv_calculations")
    .select(
      "id, numero, reference, statut, marque, immatriculation, valeur_definitive, taux_tva_applique, validee_par, valide_le"
    )
    .eq("reference", reference)
    .single();

  if (!calcul) {
    return <Introuvable />;
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
          <EnTete />
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
        <EnTete />
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
