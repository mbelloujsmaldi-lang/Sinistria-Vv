import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CoefficientsClient from "./coefficients-client";

// Table des coefficients (Sprint 19) — tout profil actif, même
// philosophie que le reste d'Analyse. proxy.ts a déjà écarté tout compte
// inactif ou sans profil avant d'atteindre cette page.
export default async function PageCoefficients() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-lg font-medium text-ink">Table des coefficients</h1>
      <p className="mb-6 text-sm text-slate">
        Référence pure sur 25 ans, indépendante de tout dossier réel.
      </p>
      <CoefficientsClient />
    </main>
  );
}
