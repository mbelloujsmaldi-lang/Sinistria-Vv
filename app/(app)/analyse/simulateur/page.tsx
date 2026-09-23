import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SimulateurClient from "./simulateur-client";

// Simulateur "Et si ?" (Sprint 18) — tout profil actif, même philosophie
// que le tableau de bord et la comparaison : outil exploratoire, aucune
// écriture en base. proxy.ts a déjà écarté tout compte inactif ou sans
// profil avant d'atteindre cette page.
export default async function PageSimulateur() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-1 text-lg font-bold text-ink">Simulateur &laquo; Et si ? &raquo;</h1>
      <p className="mb-6 text-sm text-slate">
        Explorez l&apos;effet de chaque paramètre sur la valeur vénale, sans créer de dossier.
        Rien n&apos;est enregistré ici.
      </p>
      <SimulateurClient />
    </main>
  );
}
