import { permanentRedirect } from "next/navigation";

// Route retirée (Sprint 24, Phase C) : son contenu a été absorbé par
// /dashboard, qui devient l'unique page d'accueil. Redirection 308
// conservée pour tout lien ou favori existant vers cette ancienne URL.
export default function PageAnalyseDashboard() {
  permanentRedirect("/dashboard");
}
