import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { peutReviser, type UserRole } from "@/lib/roles";
import FormulaireVV from "../../nouveau/formulaire-vv";

// Un seul point d'entrée pour les deux actions du Sprint 8ter : le mode
// (édition en place ou révision) découle du statut actuel de la ligne,
// exactement comme les policies RLS du Sprint 8 (vv_calculations_update_edition
// pour calcule/rejete, vv_calculations_insert pour valide). Les contrôles
// ci-dessous ne sont qu'un reflet côté UI — le vrai contrôle reste RLS.
export default async function ModifierCalculVVPage({
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
    .select("role")
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

  const calculExistant = {
    id: calcul.id,
    reference: calcul.reference,
    valeurCalculee: Number(calcul.valeur_calculee),
    valeurNeuve: Number(calcul.valeur_neuve),
    dateMiseCirculation: calcul.date_mise_circulation,
    dateSinistre: calcul.date_sinistre,
    categorie: calcul.categorie,
    baremeVersion: calcul.bareme_version,
    carburant: calcul.carburant,
    puissanceFiscale: Number(calcul.puissance_fiscale),
    kilometrageTotal: calcul.kilometrage_total !== null ? Number(calcul.kilometrage_total) : null,
    typeKilometrage: calcul.type_kilometrage,
    entretien: calcul.entretien,
    correctifCommercialPct: Number(calcul.correctif_commercial_pct ?? 0),
    referenceDossierExterne: calcul.reference_dossier_externe,
    marque: calcul.marque ?? null,
    modele: calcul.modele ?? null,
    immatriculation: calcul.immatriculation ?? null,
  };

  if (calcul.statut !== "valide") {
    // Édition en place — réservée au créateur, tant que non validé
    // (miroir de vv_calculations_update_edition, 0007).
    if (calcul.created_by !== user.id) {
      redirect(`/vv/${id}`);
    }

    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-1 text-lg font-medium text-ink">
          Modifier le calcul {calcul.reference}
        </h1>
        <p className="mb-6 text-sm text-slate">
          Les valeurs sont mises à jour sur cette même ligne — le calcul n&apos;étant pas
          encore validé, aucune révision n&apos;est nécessaire.
        </p>
        <FormulaireVV userId={user.id} mode="modifier" calculExistant={calculExistant} />
      </main>
    );
  }

  // Révision — réservée à un rang strictement supérieur à celui du
  // validateur d'origine (miroir de vv_calculations_insert, 0007).
  const { data: validateur } = calcul.validee_par
    ? await supabase.from("profiles").select("role").eq("id", calcul.validee_par).single()
    : { data: null };

  const autorise = peutReviser(
    profil?.role as UserRole | undefined,
    validateur?.role as UserRole | undefined
  );

  if (!autorise) {
    redirect(`/vv/${id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-lg font-medium text-ink">Réviser le calcul {calcul.reference}</h1>
      <p className="mb-6 text-sm text-slate">
        Ce calcul est déjà validé — une nouvelle ligne de révision sera créée à la
        soumission. La ligne originale ({calcul.reference}) reste intacte et consultable.
      </p>
      <FormulaireVV userId={user.id} mode="reviser" calculExistant={calculExistant} />
    </main>
  );
}
