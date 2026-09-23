import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { peutValider, type UserRole } from "@/lib/roles";
import { LABELS_CATEGORIE } from "@/lib/analyse";
import type { CategorieVehicule } from "@/lib/calcul-vv";

// File d'attente "Validations" (Sprint 27) — remplace le passage obligé
// par les filtres du Registre pour retrouver les dossiers en attente : une
// vue directe, réservée aux profils avec pouvoir de validation
// (peutValider, même palier que ActionsVV et la RLS
// vv_calculations_update_validation).
export default async function PageValidations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profiles")
    .select("role, actif")
    .eq("id", user.id)
    .single();
  if (!profil?.actif) redirect("/dashboard");
  if (!peutValider(profil.role as UserRole)) redirect("/dashboard");

  const { data: dossiers } = await supabase
    .from("vv_calculations")
    .select(
      "id, numero, reference, immatriculation, marque, modele, categorie, valeur_calculee, soumis_le, created_by"
    )
    .eq("statut", "soumis")
    .order("soumis_le", { ascending: true });

  const lignes = dossiers ?? [];

  const idsCreateurs = Array.from(new Set(lignes.map((l) => l.created_by).filter(Boolean)));
  const { data: createurs } = idsCreateurs.length
    ? await supabase.from("profiles").select("id, nom").in("id", idsCreateurs)
    : { data: [] as { id: string; nom: string }[] };
  const nomParId = new Map((createurs ?? []).map((c) => [c.id, c.nom]));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-lg font-bold text-ink">Validations</h1>
      <p className="mb-6 text-sm text-slate">
        Dossiers en attente de validation — {lignes.length} dossier{lignes.length > 1 ? "s" : ""}.
      </p>

      {lignes.length === 0 ? (
        <p className="rounded-md border border-line bg-white p-6 text-center text-sm text-slate">
          Aucun dossier en attente de validation.
        </p>
      ) : (
        <ul className="space-y-3">
          {lignes.map((d) => (
            <li key={d.id} className="rounded-md border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {d.reference} — {d.marque || "—"} {d.modele || ""}
                  </p>
                  <p className="text-xs text-slate">
                    {LABELS_CATEGORIE[d.categorie as CategorieVehicule] ?? d.categorie} ·{" "}
                    {d.immatriculation || "sans immat."} · soumis par{" "}
                    {(d.created_by && nomParId.get(d.created_by)) || "—"}
                    {d.soumis_le ? ` le ${new Date(d.soumis_le).toLocaleDateString("fr-MA")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-medium text-ink">
                    {Number(d.valeur_calculee).toLocaleString("fr-MA")} DH
                  </span>
                  <Link href={`/vv/${d.id}`} className="text-sm text-signal underline hover:text-signal-light">
                    Examiner
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
