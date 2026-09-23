import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acteurAdminTechnique, journaliser, sujetDepuisActeur } from "@/lib/comptes";

// PATCH /api/comptes/bureaux — renomme un bureau sur TOUS les comptes qui
// le portent (Sprint 29, point 7). `bureau` reste un champ texte libre sur
// profiles (pas de table dédiée, pas de migration) — "ajouter" un bureau
// se fait déjà simplement en le tapant lors de la création d'un compte
// (app/(app)/comptes/comptes-client.tsx) ; ce qui manquait réellement était
// la possibilité de corriger/renommer un bureau existant partout à la fois.
export async function PATCH(request: NextRequest) {
  const acteur = await acteurAdminTechnique();
  if (!acteur) return NextResponse.json({ erreur: "Accès refusé." }, { status: 403 });

  let corps: Record<string, unknown>;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Corps de requête invalide." }, { status: 400 });
  }

  const ancien = typeof corps.ancien === "string" ? corps.ancien.trim() : "";
  const nouveau = typeof corps.nouveau === "string" ? corps.nouveau.trim() : "";
  if (!ancien) return NextResponse.json({ erreur: "Bureau à renommer requis." }, { status: 400 });
  if (!nouveau || nouveau.length > 120) {
    return NextResponse.json({ erreur: "Nouveau nom de bureau requis (120 caractères maximum)." }, { status: 400 });
  }
  if (ancien === nouveau) return NextResponse.json({ erreur: "Le nom est identique." }, { status: 400 });

  const supabase = await createClient();
  // Écriture via la session de l'administrateur (RLS profiles_admin_write +
  // trigger 0011, comme toute autre modification de compte) — jamais
  // service_role, pour rester sous les mêmes garde-fous.
  const { data: maj, error } = await supabase
    .from("profiles")
    .update({ bureau: nouveau })
    .eq("bureau", ancien)
    .select("id");
  if (error) return NextResponse.json({ erreur: "Renommage impossible." }, { status: 500 });

  await journaliser({
    sujet: sujetDepuisActeur(acteur),
    action: "Renommage de bureau",
    ancienneValeur: ancien,
    nouvelleValeur: nouveau,
    observation: `${maj?.length ?? 0} compte(s) concerné(s)`,
  });

  return NextResponse.json({ ok: true, comptesModifies: maj?.length ?? 0 });
}
