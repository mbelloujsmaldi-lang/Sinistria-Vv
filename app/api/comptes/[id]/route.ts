import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES, type UserRole } from "@/lib/roles";
import { acteurAdminTechnique, BAN_DEFINITIF, REGEX_UUID } from "@/lib/comptes";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/comptes/[id] — modification de rôle, bureau, responsable
// hiérarchique et/ou statut actif (Sprint 13, admin_technique uniquement).
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const acteur = await acteurAdminTechnique();
  if (!acteur) return NextResponse.json({ erreur: "Accès refusé." }, { status: 403 });

  const { id } = await params;
  if (!REGEX_UUID.test(id)) {
    return NextResponse.json({ erreur: "Identifiant invalide." }, { status: 400 });
  }

  let corps: Record<string, unknown>;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Corps de requête invalide." }, { status: 400 });
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: cible } = await supabase
    .from("profiles")
    .select("id, role, actif, chef_hierarchique_id")
    .eq("id", id)
    .single();
  if (!cible) return NextResponse.json({ erreur: "Compte introuvable." }, { status: 404 });

  const patch: {
    role?: UserRole;
    bureau?: string;
    chef_hierarchique_id?: string | null;
    actif?: boolean;
  } = {};

  if (corps.role !== undefined) {
    if (!ROLES.includes(corps.role as UserRole)) {
      return NextResponse.json({ erreur: "Rôle invalide." }, { status: 400 });
    }
    patch.role = corps.role as UserRole;
  }
  if (corps.bureau !== undefined) {
    const bureau = typeof corps.bureau === "string" ? corps.bureau.trim() : "";
    if (!bureau || bureau.length > 120) {
      return NextResponse.json({ erreur: "Bureau requis (120 caractères maximum)." }, { status: 400 });
    }
    patch.bureau = bureau;
  }
  if (corps.actif !== undefined) {
    if (typeof corps.actif !== "boolean") {
      return NextResponse.json({ erreur: "Statut invalide." }, { status: 400 });
    }
    patch.actif = corps.actif;
  }
  if (corps.chef_hierarchique_id !== undefined) {
    const chef = corps.chef_hierarchique_id;
    if (chef !== null && (typeof chef !== "string" || !REGEX_UUID.test(chef))) {
      return NextResponse.json({ erreur: "Responsable invalide." }, { status: 400 });
    }
    if (chef === id) {
      return NextResponse.json({ erreur: "Un compte ne peut pas être son propre responsable." }, { status: 400 });
    }
    if (chef) {
      // Le responsable doit exister et ne doit pas créer de boucle
      // hiérarchique (chef -> ... -> ce compte).
      let courant: string | null = chef;
      for (let i = 0; i < 50 && courant; i++) {
        if (courant === id) {
          return NextResponse.json({ erreur: "Ce choix créerait une boucle hiérarchique." }, { status: 400 });
        }
        const res: { data: { chef_hierarchique_id: string | null } | null } = await supabase
          .from("profiles")
          .select("chef_hierarchique_id")
          .eq("id", courant)
          .single();
        if (i === 0 && !res.data) {
          return NextResponse.json({ erreur: "Responsable introuvable." }, { status: 400 });
        }
        courant = res.data?.chef_hierarchique_id ?? null;
      }
    }
    patch.chef_hierarchique_id = chef as string | null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ erreur: "Aucune modification demandée." }, { status: 400 });
  }

  const changeRole = patch.role !== undefined && patch.role !== cible.role;
  const desactive = patch.actif === false && cible.actif;

  // Garde-fous : personne ne se rétrograde ni ne se désactive soi-même, et
  // le dernier administrateur actif ne peut être ni rétrogradé ni désactivé.
  if (id === acteur.id && (changeRole || patch.actif === false)) {
    return NextResponse.json(
      { erreur: "Vous ne pouvez pas modifier votre propre rôle ni vous désactiver." },
      { status: 400 }
    );
  }
  if (cible.role === "admin_technique" && cible.actif && ((changeRole) || desactive)) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin_technique")
      .eq("actif", true)
      .neq("id", id);
    if (!count) {
      return NextResponse.json(
        { erreur: "Impossible : ce serait le dernier administrateur technique actif." },
        { status: 409 }
      );
    }
  }

  // Écriture via la session de l'administrateur (RLS + trigger 0011).
  const { data: maj, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select("id, role, bureau, chef_hierarchique_id, actif")
    .single();
  if (error || !maj) {
    return NextResponse.json({ erreur: "Modification refusée." }, { status: 403 });
  }

  // Désactivation effective : blocage côté Auth (plus de connexion ni de
  // renouvellement de session). Si cela échoue, on annule le changement de
  // statut pour ne jamais afficher « désactivé » un compte encore utilisable.
  if (patch.actif !== undefined && patch.actif !== cible.actif) {
    const { error: erreurBan } = await admin.auth.admin.updateUserById(id, {
      ban_duration: patch.actif ? "none" : BAN_DEFINITIF,
    });
    if (erreurBan) {
      await supabase.from("profiles").update({ actif: cible.actif }).eq("id", id);
      return NextResponse.json(
        { erreur: "Le blocage du compte n'a pas pu être appliqué ; statut inchangé." },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(maj);
}

// DELETE /api/comptes/[id] — suppression définitive, RESTREINTE aux comptes
// jamais utilisés : aucune ligne ne doit référencer le profil (calculs créés,
// soumis ou validés, historique, responsable hiérarchique d'un autre compte).
// Les clés vers profiles(id) n'ont pas de ON DELETE : la base refuserait de
// toute façon, mais avec une erreur opaque — d'où ce contrôle explicite.
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const acteur = await acteurAdminTechnique();
  if (!acteur) return NextResponse.json({ erreur: "Accès refusé." }, { status: 403 });

  const { id } = await params;
  if (!REGEX_UUID.test(id)) {
    return NextResponse.json({ erreur: "Identifiant invalide." }, { status: 400 });
  }
  if (id === acteur.id) {
    return NextResponse.json({ erreur: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: cible } = await admin.from("profiles").select("id").eq("id", id).single();
  if (!cible) return NextResponse.json({ erreur: "Compte introuvable." }, { status: 404 });

  const compter = async (table: string, colonne: string) => {
    const { count, error } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(colonne, id);
    if (error) throw new Error(error.message);
    return count ?? 0;
  };

  let refs: Record<string, number>;
  try {
    refs = {
      "calculs créés": await compter("vv_calculations", "created_by"),
      "calculs validés": await compter("vv_calculations", "validee_par"),
      "calculs soumis": await compter("vv_calculations", "soumis_par"),
      "entrées d'historique": await compter("vv_calculations_historique", "utilisateur_id"),
      "comptes rattachés comme responsable": await compter("profiles", "chef_hierarchique_id"),
    };
  } catch {
    return NextResponse.json({ erreur: "Vérification des références impossible." }, { status: 500 });
  }

  const utilise = Object.entries(refs).filter(([, n]) => n > 0);
  if (utilise.length > 0) {
    return NextResponse.json(
      {
        erreur:
          "Suppression impossible : ce compte est référencé (" +
          utilise.map(([k, n]) => `${n} ${k}`).join(", ") +
          "). Désactivez-le plutôt.",
      },
      { status: 409 }
    );
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ erreur: "Suppression impossible." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
