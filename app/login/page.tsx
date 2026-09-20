"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "../_components/logo";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  // Motif de redirection posé par proxy.ts (compte désactivé / sans profil).
  useEffect(() => {
    const motif = new URLSearchParams(window.location.search).get("motif");
    if (motif === "desactive") {
      setErreur("Ce compte est désactivé. Contactez un administrateur.");
    } else if (motif === "sans_profil") {
      setErreur("Ce compte n'est pas autorisé à accéder à l'application.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErreur(
        /banned/i.test(error.message)
          ? "Ce compte est désactivé. Contactez un administrateur."
          : "Identifiants incorrects. Vérifiez votre email et mot de passe."
      );
      setChargement(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <Logo />
        </div>

        <h1 className="mb-1 text-lg font-medium text-ink">Connexion</h1>
        <p className="mb-6 text-sm text-slate">
          Accédez au module de calcul de la valeur vénale.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-ink">
              Email professionnel
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal"
              placeholder="nom@bureau.ma"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-ink">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal"
              placeholder="••••••••"
            />
          </div>

          {erreur && (
            <p role="alert" className="text-sm text-red-700">
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="w-full rounded bg-signal py-2 text-sm font-medium text-white transition-colors hover:bg-signal-light disabled:opacity-60"
          >
            {chargement ? "Connexion en cours…" : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}
