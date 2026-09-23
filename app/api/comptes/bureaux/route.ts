import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acteurAdminTechnique, journaliser, REGEX_EMAIL, REGEX_UUID, sujetDepuisActeur } from "@/lib/comptes";

// POST /api/comptes/bureaux — crée un nouveau bureau (Sprint 30, point 6) :
// nom + ville (menu déroulant de villes marocaines côté client) requis,
// adresse/email officiel optionnels. Devient ensuite l'option proposée par
// le menu déroulant de "Créer un compte" (Sprint 30, point 7) — plus de
// bureau texte libre saisi à la création d'un compte.
export async function POST(request: NextRequest) {
  const acteur = await acteurAdminTechnique();
  if (!acteur) return NextResponse.json({ erreur: "Accès refusé." }, { status: 403 });

  let corps: Record<string, unknown>;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Corps de requête invalide." }, { status: 400 });
  }

  const nom = typeof corps.nom === "string" ? corps.nom.trim() : "";
  const ville = typeof corps.ville === "string" ? corps.ville.trim() : "";
  if (!nom || nom.length > 120) {
    return NextResponse.json({ erreur: "Nom du bureau requis (120 caractères maximum)." }, { status: 400 });
  }
  if (!ville || ville.length > 120) {
    return NextResponse.json({ erreur: "Ville requise." }, { status: 400 });
  }
  const adresse = typeof corps.adresse === "string" ? corps.adresse.trim() : "";
  if (adresse.length > 250) {
    return NextResponse.json({ erreur: "Adresse trop longue (250 caractères maximum)." }, { status: 400 });
  }
  const emailBrut = typeof corps.email_officiel === "string" ? corps.email_officiel.trim() : "";
  if (emailBrut && !REGEX_EMAIL.test(emailBrut)) {
    return NextResponse.json({ erreur: "Email officiel invalide." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: cree, error } = await supabase
    .from("bureaux")
    .insert({ nom, ville, adresse: adresse || null, email_officiel: emailBrut || null })
    .select("id, nom, ville, adresse, email_officiel")
    .single();
  if (error) {
    const dejaPris = /duplicate|unique/i.test(error.message);
    return NextResponse.json(
      { erreur: dejaPris ? "Un bureau porte déjà ce nom." : "Création du bureau impossible." },
      { status: dejaPris ? 409 : 500 }
    );
  }

  await journaliser({
    sujet: sujetDepuisActeur(acteur),
    action: "Création de bureau",
    nouvelleValeur: `${nom} (${ville})`,
  });

  return NextResponse.json(cree, { status: 201 });
}

// PATCH /api/comptes/bureaux — modifie un bureau existant (nom/ville/
// adresse/email officiel) désigné par `id`. Un changement de nom se
// répercute sur TOUS les comptes qui le portent (profiles.bureau reste du
// texte libre, comparaisons exactes — voir 0020_bureaux.sql).
export async function PATCH(request: NextRequest) {
  const acteur = await acteurAdminTechnique();
  if (!acteur) return NextResponse.json({ erreur: "Accès refusé." }, { status: 403 });

  let corps: Record<string, unknown>;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Corps de requête invalide." }, { status: 400 });
  }

  const id = typeof corps.id === "string" ? corps.id : "";
  if (!REGEX_UUID.test(id)) {
    return NextResponse.json({ erreur: "Bureau invalide." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: actuel } = await supabase.from("bureaux").select("nom").eq("id", id).single();
  if (!actuel) return NextResponse.json({ erreur: "Bureau introuvable." }, { status: 404 });

  const nouveauNom = typeof corps.nom === "string" ? corps.nom.trim() : actuel.nom;
  if (!nouveauNom || nouveauNom.length > 120) {
    return NextResponse.json({ erreur: "Nom du bureau requis (120 caractères maximum)." }, { status: 400 });
  }
  const ville = typeof corps.ville === "string" ? corps.ville.trim() : "";
  if (!ville || ville.length > 120) {
    return NextResponse.json({ erreur: "Ville requise." }, { status: 400 });
  }
  const adresse = typeof corps.adresse === "string" ? corps.adresse.trim() : "";
  if (adresse.length > 250) {
    return NextResponse.json({ erreur: "Adresse trop longue (250 caractères maximum)." }, { status: 400 });
  }
  const emailBrut = typeof corps.email_officiel === "string" ? corps.email_officiel.trim() : "";
  if (emailBrut && !REGEX_EMAIL.test(emailBrut)) {
    return NextResponse.json({ erreur: "Email officiel invalide." }, { status: 400 });
  }

  const { data: maj, error } = await supabase
    .from("bureaux")
    .update({ nom: nouveauNom, ville, adresse: adresse || null, email_officiel: emailBrut || null })
    .eq("id", id)
    .select("id, nom, ville, adresse, email_officiel")
    .single();
  if (error) {
    const dejaPris = /duplicate|unique/i.test(error.message);
    return NextResponse.json(
      { erreur: dejaPris ? "Un bureau porte déjà ce nom." : "Modification impossible." },
      { status: dejaPris ? 409 : 500 }
    );
  }

  let comptesModifies = 0;
  if (nouveauNom !== actuel.nom) {
    const { data: comptesMaj, error: erreurComptes } = await supabase
      .from("profiles")
      .update({ bureau: nouveauNom })
      .eq("bureau", actuel.nom)
      .select("id");
    if (erreurComptes) {
      return NextResponse.json({ erreur: "Bureau renommé, mais des comptes n'ont pas pu être mis à jour." }, { status: 500 });
    }
    comptesModifies = comptesMaj?.length ?? 0;
  }

  await journaliser({
    sujet: sujetDepuisActeur(acteur),
    action: "Modification de bureau",
    ancienneValeur: actuel.nom,
    nouvelleValeur: `${nouveauNom} (${ville})`,
    observation: comptesModifies ? `${comptesModifies} compte(s) concerné(s)` : undefined,
  });

  return NextResponse.json({ ...maj, comptesModifies });
}
