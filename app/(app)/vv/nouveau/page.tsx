import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FormulaireVV from "./formulaire-vv";

export default async function NouveauCalculVVPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-lg font-medium text-ink">Nouveau calcul de valeur vénale</h1>
      <p className="mb-6 text-sm text-slate">
        Saisissez les caractéristiques du véhicule pour calculer la VVADE et
        l&apos;enregistrer.
      </p>

      <FormulaireVV userId={user.id} />

      <p className="mt-8 text-xs text-slate">
        <a href="/dashboard" className="underline hover:text-ink">
          ← Retour au tableau de bord
        </a>
      </p>
    </main>
  );
}
