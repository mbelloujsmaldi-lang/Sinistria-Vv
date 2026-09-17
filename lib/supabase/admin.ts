import { createClient } from "@supabase/supabase-js";

// Client service_role : bypass RLS, réservé aux routes serveur qui n'ont
// pas de session utilisateur Supabase Auth (ex. appels API serveur-à-serveur
// authentifiés par une clé partagée, pas par un utilisateur connecté).
// Ne jamais importer ce module depuis un composant client.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
