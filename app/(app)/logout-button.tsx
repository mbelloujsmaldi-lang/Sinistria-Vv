"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  async function deconnecter() {
    setEnCours(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={deconnecter}
      disabled={enCours}
      className="text-sm text-slate underline hover:text-ink disabled:opacity-60"
    >
      {enCours ? "Déconnexion…" : "Déconnexion"}
    </button>
  );
}
