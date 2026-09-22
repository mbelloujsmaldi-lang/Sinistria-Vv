import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { peutConsulterAudit, type UserRole } from "@/lib/roles";
import { chargerJournalUnifie, versCsv, type FiltresAudit } from "@/lib/audit";

// GET /api/audit/export — export CSV du journal unifié (Sprint 15), mêmes
// filtres et même garde que /audit (responsable et au-dessus). Réutilise
// exactement la même requête (lib/audit.ts) pour ne jamais diverger de ce
// que montre la page.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Accès refusé." }, { status: 403 });

  const { data: profil } = await supabase
    .from("profiles")
    .select("role, actif")
    .eq("id", user.id)
    .single();
  if (!profil?.actif || !peutConsulterAudit(profil.role as UserRole)) {
    return NextResponse.json({ erreur: "Accès refusé." }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const filtres: FiltresAudit = {
    utilisateur: sp.get("utilisateur") || undefined,
    action: sp.get("action") || undefined,
    depuis: sp.get("depuis") || undefined,
    jusqu: sp.get("jusqu") || undefined,
  };

  const entrees = await chargerJournalUnifie(supabase, filtres);
  const csv = versCsv(entrees);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="journal_audit_${date}.csv"`,
    },
  });
}
