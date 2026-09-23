import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargerRegistreComplet, registreVersCsv, type FiltresRegistre } from "@/lib/registre";

// GET /api/registre/export — export CSV du Registre filtré (Sprint 25),
// mêmes filtres et même garde que /vv (tout profil actif). Volontairement
// SÉPARÉ de la pagination d'affichage (Sprint 25-bis) : exporte
// l'intégralité du résultat filtré, jamais une seule page — usage
// d'analyse hors ligne, pas un miroir de l'écran.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Accès refusé." }, { status: 403 });

  const { data: profil } = await supabase
    .from("profiles")
    .select("actif")
    .eq("id", user.id)
    .single();
  if (!profil?.actif) {
    return NextResponse.json({ erreur: "Accès refusé." }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const filtres: FiltresRegistre = {
    q: sp.get("q") || undefined,
    carburant: sp.get("carburant") || undefined,
    bareme: sp.get("bareme") || undefined,
    categorie: sp.get("categorie") || undefined,
    marque: sp.get("marque") || undefined,
    modele: sp.get("modele") || undefined,
    depuisMec: sp.get("depuisMec") || undefined,
    jusquMec: sp.get("jusquMec") || undefined,
    tri: sp.get("tri") || undefined,
    ordre: sp.get("ordre") === "asc" ? "asc" : "desc",
  };

  const lignes = await chargerRegistreComplet(supabase, filtres);
  const csv = registreVersCsv(lignes);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="registre_vv_${date}.csv"`,
    },
  });
}
