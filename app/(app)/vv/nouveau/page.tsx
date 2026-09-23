import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FormulaireVV, { type ValeursInitiales } from "./formulaire-vv";
import type { UserRole } from "@/lib/roles";
import {
  BAREME_VERSIONS,
  CARBURANTS,
  CATEGORIES_VEHICULE,
  ENTRETIENS,
  TYPES_KILOMETRAGE,
} from "@/lib/calcul-vv";

// Passerelle depuis le simulateur "Et si ?" (Sprint 18) : une entrée par
// paramètre d'URL, jamais fait confiance aveuglément — chaque valeur est
// validée contre l'énumération réelle du moteur avant d'être utilisée.
// Une URL malformée ne doit jamais faire planter la page ni glisser une
// valeur invalide dans le formulaire ; elle est simplement ignorée.
function construireValeursInitiales(
  sp: { [key: string]: string | string[] | undefined }
): ValeursInitiales | undefined {
  const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const nombrePositif = (v: string | undefined) => {
    if (v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const dateValide = (v: string | undefined) =>
    v !== undefined && !Number.isNaN(new Date(v).getTime()) ? v : undefined;

  const v: ValeursInitiales = {};
  const bareme = un(sp.baremeVersion);
  if (bareme && (BAREME_VERSIONS as readonly string[]).includes(bareme)) {
    v.baremeVersion = bareme as ValeursInitiales["baremeVersion"];
  }
  const categorie = un(sp.categorie);
  if (categorie && (CATEGORIES_VEHICULE as readonly string[]).includes(categorie)) {
    v.categorie = categorie as ValeursInitiales["categorie"];
  }
  const carburant = un(sp.carburant);
  if (carburant && (CARBURANTS as readonly string[]).includes(carburant)) {
    v.carburant = carburant as ValeursInitiales["carburant"];
  }
  const entretien = un(sp.entretien);
  if (entretien && (ENTRETIENS as readonly string[]).includes(entretien)) {
    v.entretien = entretien as ValeursInitiales["entretien"];
  }
  const typeKm = un(sp.typeKilometrage);
  if (typeKm && (TYPES_KILOMETRAGE as readonly string[]).includes(typeKm)) {
    v.typeKilometrage = typeKm as ValeursInitiales["typeKilometrage"];
  }
  const puissanceFiscale = nombrePositif(un(sp.puissanceFiscale));
  if (puissanceFiscale !== undefined) v.puissanceFiscale = puissanceFiscale;
  const valeurNeuve = nombrePositif(un(sp.valeurNeuve));
  if (valeurNeuve !== undefined) v.valeurNeuve = valeurNeuve;
  const kilometrageTotal = nombrePositif(un(sp.kilometrageTotal));
  if (kilometrageTotal !== undefined) v.kilometrageTotal = kilometrageTotal;
  const dateMiseCirculation = dateValide(un(sp.dateMiseCirculation));
  if (dateMiseCirculation) v.dateMiseCirculation = dateMiseCirculation;
  const dateSinistre = dateValide(un(sp.dateSinistre));
  if (dateSinistre) v.dateSinistre = dateSinistre;

  return Object.keys(v).length > 0 ? v : undefined;
}

export default async function NouveauCalculVVPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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

  const valeursInitiales = construireValeursInitiales(await searchParams);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-lg font-bold text-ink">Nouveau calcul de valeur vénale</h1>
      <p className="mb-6 text-sm text-slate">
        Saisissez les caractéristiques du véhicule pour calculer la VVADE et
        l&apos;enregistrer.
      </p>
      {valeursInitiales && (
        <p className="mb-4 rounded border border-signal bg-signal-bg px-3 py-2 text-xs text-signal">
          Formulaire pré-rempli depuis le simulateur — vérifiez les valeurs avant d&apos;enregistrer.
        </p>
      )}

      <FormulaireVV
        userId={user.id}
        role={profil?.role as UserRole | undefined}
        valeursInitiales={valeursInitiales}
      />

      <p className="mt-8 text-xs text-slate">
        <a href="/dashboard" className="underline hover:text-ink">
          ← Retour au tableau de bord
        </a>
      </p>
    </main>
  );
}
