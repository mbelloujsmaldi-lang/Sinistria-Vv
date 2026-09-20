import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acteurAdminTechnique, genererMotDePasseTemporaire, REGEX_UUID } from "@/lib/comptes";

// POST /api/comptes/[id]/reset — réinitialisation du mot de passe
// (admin_technique uniquement). Nouveau mot de passe aléatoire, renvoyé
// une seule fois dans cette réponse, jamais stocké ni journalisé.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const acteur = await acteurAdminTechnique();
  if (!acteur) return NextResponse.json({ erreur: "Accès refusé." }, { status: 403 });

  const { id } = await params;
  if (!REGEX_UUID.test(id)) {
    return NextResponse.json({ erreur: "Identifiant invalide." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profil } = await admin.from("profiles").select("id").eq("id", id).single();
  if (!profil) return NextResponse.json({ erreur: "Compte introuvable." }, { status: 404 });

  const motDePasse = genererMotDePasseTemporaire();
  const { error } = await admin.auth.admin.updateUserById(id, { password: motDePasse });
  if (error) {
    return NextResponse.json({ erreur: "Réinitialisation impossible." }, { status: 500 });
  }
  return NextResponse.json({ motDePasseTemporaire: motDePasse });
}
