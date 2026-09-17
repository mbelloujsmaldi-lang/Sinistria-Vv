import { NextResponse } from "next/server";

// Endpoint public (pas d'authentification) pour vérifier rapidement qu'un
// déploiement répond.
export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
