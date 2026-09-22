/** @type {import('next').NextConfig} */

// Origine Supabase réelle (auth + PostgREST), dérivée de la même variable
// que le reste de l'app — jamais codée en dur ici (Sprint 20, point #2).
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

// CSP couvrant exactement ce que l'app charge (vérifié Sprint 21, pas deviné) :
// Google Fonts pour Inter (globals.css — Source Serif 4 n'est en réalité jamais
// chargée, seule une note de code la mentionne comme repli non intégré),
// Supabase pour l'auth/données, blob: pour la rastérisation du logo en PNG
// avant génération PDF (lib/logo-pdf.ts, canvas + Image sur une blob: URL).
// 'unsafe-inline' sur script-src : l'App Router injecte des scripts de
// bootstrap/hydratation sans nonce par défaut ; un CSP à base de nonce est un
// changement plus large, volontairement hors du périmètre "correctif rapide"
// de ce sprint (cf. rapport Sprint 20, point #1, traité à part au Sprint 22).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  `connect-src 'self'${SUPABASE_ORIGIN ? " " + SUPABASE_ORIGIN : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
