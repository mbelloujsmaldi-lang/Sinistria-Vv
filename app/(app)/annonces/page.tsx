import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AnnonceForm from "./annonce-form";

// Annonces de bureau (Sprint 27) — tout profil actif consulte les
// annonces de SON bureau (RLS bureau_annonces_select) ; seul
// admin_technique peut en publier.
export default async function PageAnnonces() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profiles")
    .select("role, bureau, actif")
    .eq("id", user.id)
    .single();
  if (!profil?.actif) redirect("/dashboard");

  const estAdmin = profil.role === "admin_technique";

  const { data: annonces } = await supabase
    .from("bureau_annonces")
    .select("id, titre, corps, created_at, auteur_id, profiles(nom)")
    .order("created_at", { ascending: false });

  let bureauxDistincts: string[] = [];
  if (estAdmin) {
    const { data: tousProfils } = await supabase.from("profiles").select("bureau");
    bureauxDistincts = Array.from(
      new Set((tousProfils ?? []).map((p) => p.bureau).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "fr"));
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-1 text-lg font-bold text-ink">Annonces</h1>
      <p className="mb-6 text-sm text-slate">
        Communications internes pour le bureau {profil.bureau}.
      </p>

      {estAdmin && <AnnonceForm bureaux={bureauxDistincts} />}

      {(annonces ?? []).length === 0 ? (
        <p className="rounded-md border border-line bg-white p-6 text-center text-sm text-slate">
          Aucune annonce pour votre bureau pour le moment.
        </p>
      ) : (
        <ul className="space-y-3">
          {(annonces ?? []).map((a) => (
            <li key={a.id} className="rounded-md border border-line bg-white p-4">
              <p className="text-sm font-medium text-ink">{a.titre}</p>
              <p className="mt-1 text-sm text-ink">{a.corps}</p>
              <p className="mt-2 text-xs text-slate">
                {(a.profiles as unknown as { nom: string } | null)?.nom ?? "—"} ·{" "}
                {new Date(a.created_at).toLocaleString("fr-MA")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
