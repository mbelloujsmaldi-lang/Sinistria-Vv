import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ImportClient from "./import-client";
import { IconTelecharger } from "../nav-icons";

// Echange (Sprint 29, point 3) — regroupe l'import en masse CSV (ex-
// /vv/importer, déplacé ici) et l'export CSV du Registre. L'export
// contextuel (filtré) reste disponible directement sur /vv — celui-ci
// exporte l'intégralité du registre, sans filtre, usage différent.
export default async function PageEchange() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase.from("profiles").select("actif").eq("id", user.id).single();
  if (!profil?.actif) redirect("/accueil");

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-lg font-bold text-ink">Echange</h1>
      <p className="mb-6 text-sm text-slate">
        Import et export en masse des dossiers de calcul, au format CSV.
      </p>

      <div className="space-y-6">
        <section className="rounded-md border border-line bg-white p-5">
          <h2 className="mb-3 text-sm font-medium text-ink">Exporter le registre</h2>
          <p className="mb-3 text-sm text-slate">
            Télécharge l&apos;intégralité du registre, sans filtre. Pour exporter une vue filtrée
            précise, utilisez le lien &laquo; Exporter en CSV &raquo; directement depuis le{" "}
            Registre.
          </p>
          <a
            href="/api/registre/export"
            className="inline-flex items-center gap-2 rounded bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light"
          >
            <IconTelecharger className="h-4 w-4 shrink-0" />
            Exporter tout le registre (CSV)
          </a>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink">Importer des dossiers</h2>
          <ImportClient />
        </section>
      </div>
    </main>
  );
}
