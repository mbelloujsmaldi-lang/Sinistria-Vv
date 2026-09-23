import { LOGO_MARGE_BADGE, LOGO_RATIO } from "@/lib/logo-metrics";

// Identité Sinistria : wordmark (fichier local public/logo) + badge "Vv".
// Seul point de définition — utilisé par la page de connexion et le
// layout partagé (dashboard, /vv/*).
//
// variante "sombre" (Sprint 26, Phase B) : la bannière du shell passe en
// fond ink plein — le wordmark "clair" (traits/texte #1B2430) y serait
// invisible (ink sur ink). Fichier SVG séparé (mêmes traits, couleur
// texte/traits inversée en canvas #F6F5F1), pas une réinterprétation via
// currentColor : la police du logo elle-même reste hors périmètre.
export default function Logo({
  hauteur = 40,
  variante = "claire",
}: {
  hauteur?: number;
  variante?: "claire" | "sombre";
}) {
  return (
    <span className="flex items-center">
      {/* SVG local : next/image n'apporte rien ici (pas d'optimisation SVG). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={variante === "sombre" ? "/logo/sinistria-wordmark-sombre.svg" : "/logo/sinistria-wordmark.svg"}
        alt="Sinistria"
        height={hauteur}
        width={hauteur * LOGO_RATIO}
        style={{ height: hauteur, width: "auto" }}
      />
      {/* Le SVG garde une marge vide à droite du mot : le badge la recouvre
          (proportionnel à la hauteur, voir lib/logo-metrics.ts) pour rester
          collé au texte.
          Sprint 29 (point 2) : taille de police en `text-xs` FIXE alors que
          le mot "Sinistria" (SVG) rétrécit avec `hauteur` — à hauteur
          réduite (barre latérale), le badge devenait visuellement plus
          grand que le mot lui-même. Corrigé en dérivant la taille du badge
          de `hauteur`, au même ratio que la valeur par défaut (badge 12px
          pour hauteur 40 => 0,3 · hauteur). */}
      <span
        className="whitespace-nowrap rounded bg-signal-bg font-medium text-signal"
        style={{
          marginLeft: hauteur * LOGO_MARGE_BADGE,
          fontSize: hauteur * 0.3,
          padding: `${hauteur * 0.05}px ${hauteur * 0.15}px`,
        }}
      >
        Vv
      </span>
    </span>
  );
}
