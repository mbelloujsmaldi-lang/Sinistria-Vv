import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES, type UserRole } from "@/lib/roles";
import {
  acteurAdminTechnique,
  genererMotDePasseTemporaire,
  journaliser,
  REGEX_EMAIL,
  sujetDepuisActeur,
} from "@/lib/comptes";
import { LABELS_ROLE } from "@/lib/roles";

// POST /api/comptes — création d'un compte (Sprint 13, admin_technique
// uniquement). Crée l'utilisateur Auth PUIS la ligne profiles ; si la
// seconde étape échoue, l'utilisateur Auth est supprimé (pas de compte
// à moitié créé). Le mot de passe temporaire n'est renvoyé qu'une fois.
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
  const email = typeof corps.email === "string" ? corps.email.trim().toLowerCase() : "";
  const bureau = typeof corps.bureau === "string" ? corps.bureau.trim() : "";
  const role = corps.role as UserRole;

  if (!nom || nom.length > 120) {
    return NextResponse.json({ erreur: "Nom requis (120 caractères maximum)." }, { status: 400 });
  }
  if (!REGEX_EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ erreur: "Adresse email invalide." }, { status: 400 });
  }
  if (!bureau || bureau.length > 120) {
    return NextResponse.json({ erreur: "Bureau requis (120 caractères maximum)." }, { status: 400 });
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ erreur: "Rôle invalide." }, { status: 400 });
  }

  const admin = createAdminClient();
  const motDePasse = genererMotDePasseTemporaire();

  const { data: cree, error: erreurAuth } = await admin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
  });
  if (erreurAuth || !cree.user) {
    const dejaPris = /already|registered|exists/i.test(erreurAuth?.message ?? "");
    return NextResponse.json(
      { erreur: dejaPris ? "Cette adresse email est déjà utilisée." : "Création du compte impossible." },
      { status: dejaPris ? 409 : 500 }
    );
  }

  // Ligne profiles via la session de l'administrateur : la RLS
  // (profiles_admin_write) reste la garde, pas service_role.
  const supabase = await createClient();
  const { error: erreurProfil } = await supabase
    .from("profiles")
    .insert({ id: cree.user.id, nom, role, bureau });

  if (erreurProfil) {
    await admin.auth.admin.deleteUser(cree.user.id);
    return NextResponse.json({ erreur: "Création du profil impossible." }, { status: 500 });
  }

  await journaliser({
    sujet: sujetDepuisActeur(acteur),
    action: "Création de compte",
    nouvelleValeur: `${nom} (${email}) — ${LABELS_ROLE[role]}`,
  });

  return NextResponse.json(
    { id: cree.user.id, email, nom, role, bureau, motDePasseTemporaire: motDePasse },
    { status: 201 }
  );
}
